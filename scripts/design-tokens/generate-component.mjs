#!/usr/bin/env node

/**
 * generate-component.mjs — 由 Figma DTCG 导出生成 T3 组件层 CSS。
 *
 * ⚠ 与其余生成器同为一次性**迁移工具**，随过程文件一并退役。
 *   权威边界见 docs/10-standards/065-design-token-pipeline.md。
 *
 * 出：src/styles/components/<family>-component.css + index.css
 *
 * T3 只引用 T2，不引用 T1、不含语义判断。变量名由 DS 按路径推导（§3.2.1，
 * 本集合 73% 的 codeSyntax 缺失）。
 *
 * 关键风险：T3 的 aliasData 给的是 **T2 的 Figma 路径**，须解析成 T2 已生成的
 * CSS 变量名。解析规则必须与两个 T2 生成器完全一致，否则会产出悬空 var()。
 * 故解析后逐条断言该变量确实存在于已生成的 T2 CSS 中。
 *
 * 用法：
 *   node scripts/design-tokens/generate-component.mjs
 *   node scripts/design-tokens/generate-component.mjs --check
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

const PKG = path.join(ROOT, "packages/design/design-system");
const EXPORT_DIR = path.join(PKG, "Figma-Token");
const SEMANTIC_DIR = path.join(PKG, "src/styles/semantic");
const OUT_DIR = path.join(PKG, "src/styles/components");

/** 设计稿治理规定「无需 T3、直接绑 T2」的组件；出现即需回报设计侧复核。 */
const NO_T3_EXPECTED = ["button", "input", "card", "modal", "badge", "tabs", "dropdown"];

/**
 * 按治理门槛收敛回 T2 的组件族（设计侧 2026-07-31 确认）。
 *
 * 只收敛**纯别名** token——它们正是门槛禁止的冗余，消费方直接绑 T2 即可。
 * 裸值 token 不在此列：门槛原文允许「T2 根本无从表达」时建 T3，裸值恰属此类，
 * 排除它们会丢信息。生成器对此设断言，拒绝排除任何裸值。
 */
const CONVERGE_TO_T2 = {
  modal: "治理白名单组件，纯别名收敛回 T2；仅保留 T2 无从表达的尺寸",
};

const UNITLESS = /^(z\/|opacity\/)/;
const MS = /duration/;

function flatten(node, prefix = "", out = []) {
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const value = node[key];
    if (!value || typeof value !== "object") continue;
    const next = prefix ? `${prefix}/${key}` : key;
    if ("$value" in value) out.push([next, value]);
    if (Object.keys(value).some((k) => !k.startsWith("$"))) flatten(value, next, out);
  }
  return out;
}

const ext = (token, key) => token.$extensions?.[`com.figma.${key}`];
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const derivedName = (tokenPath) => `--${kebab(tokenPath).replace(/\//g, "-")}`;

/** vx-Color 的变量名以 codeSyntax 为准（§3.2.1 例外），其余集合按路径推导。 */
function buildT2NameMap() {
  const map = new Map();
  for (const dir of readdirSync(EXPORT_DIR)) {
    if (dir.endsWith("-Primitive") || dir === "vx-Component") continue;
    const useCodeSyntax = dir === "vx-Color";
    for (const file of readdirSync(path.join(EXPORT_DIR, dir))) {
      if (!file.endsWith(".json")) continue;
      const tokens = flatten(JSON.parse(readFileSync(path.join(EXPORT_DIR, dir, file), "utf8")));
      for (const [tokenPath, token] of tokens) {
        if (map.has(tokenPath)) continue;
        if (useCodeSyntax) {
          const web = ext(token, "codeSyntax")?.WEB;
          const m = typeof web === "string" ? web.match(/^var\(\s*(--)?([\w-]+)\s*\)$/) : null;
          if (m) map.set(tokenPath, `--${m[2]}`);
        } else {
          map.set(tokenPath, derivedName(tokenPath));
        }
      }
    }
  }
  return map;
}

/** 已生成的 T2 变量集合——断言 T3 不会引用不存在的语义 token。 */
function loadT2Vars() {
  const vars = new Set();
  for (const file of readdirSync(SEMANTIC_DIR)) {
    if (!file.endsWith(".css")) continue;
    const css = readFileSync(path.join(SEMANTIC_DIR, file), "utf8");
    for (const m of css.matchAll(/^\s*(--[\w-]+):/gm)) vars.add(m[1]);
  }
  return vars;
}

const t2Names = buildT2NameMap();
const t2Vars = loadT2Vars();
const errors = [];
const derived = [];
const converged = [];
const kept = [];

function literal(tokenPath, value) {
  if (typeof value === "string") return value;
  if (typeof value !== "number") return null;
  if (UNITLESS.test(tokenPath)) return String(value);
  if (MS.test(tokenPath)) return `${value}ms`;
  return `${value}px`;
}

const tokens = flatten(
  JSON.parse(readFileSync(path.join(EXPORT_DIR, "vx-Component/vx-Component.tokens.json"), "utf8")),
);

/** family → [[name, value, tokenPath]] */
const families = new Map();
const seen = new Map();

for (const [tokenPath, token] of tokens) {
  const family = tokenPath.split("/")[0];
  const name = derivedName(tokenPath);

  if (!ext(token, "codeSyntax")?.WEB && !derived.some((d) => d === tokenPath)) {
    derived.push(tokenPath);
  }
  if (seen.has(name) && seen.get(name) !== tokenPath) {
    errors.push(`${seen.get(name)} 与 ${tokenPath} 都声明 ${name}`);
    continue;
  }
  seen.set(name, tokenPath);

  const target = ext(token, "aliasData")?.targetVariableName;
  let value;
  if (target) {
    const t2 = t2Names.get(target);
    if (!t2) {
      errors.push(`${tokenPath} → ${target}：无法解析为 T2 变量名`);
      continue;
    }
    if (!t2Vars.has(t2)) {
      errors.push(`${tokenPath} → ${target} → ${t2}：该变量不存在于已生成的 T2 中`);
      continue;
    }
    value = `var(${t2})`;
  } else {
    value = literal(tokenPath, token.$value);
    if (value === null) {
      errors.push(`${tokenPath}：无法表达的裸值 ${JSON.stringify(token.$value)}`);
      continue;
    }
  }

  // 治理收敛：纯别名丢弃，裸值必须保留。
  if (CONVERGE_TO_T2[family]) {
    if (target) {
      converged.push(`${tokenPath} → ${value}`);
      continue;
    }
    kept.push(`${tokenPath} = ${value}`);
  }

  if (!families.has(family)) families.set(family, []);
  families.get(family).push([name, value, tokenPath]);
}

// 断言：被收敛的族若一个 token 都没剩下，说明它本就不该有 T3；
// 若剩下的里混进了别名，说明收敛没生效。
for (const family of Object.keys(CONVERGE_TO_T2)) {
  const rows = families.get(family) ?? [];
  const stillAliased = rows.filter(([, v]) => v.startsWith("var("));
  if (stillAliased.length > 0) {
    errors.push(`${family}: 收敛后仍残留别名 ${stillAliased.map(([n]) => n).join(", ")}`);
  }
}

if (errors.length > 0) {
  console.error("T3 组件层生成失败：\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

function header(family, count) {
  return `/**
 * components/${family}-component.css - T3 组件层 · ${family}（${count} 项）。
 * @package @vxture/design-system
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-07-31
 *
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 *   生成：node scripts/design-tokens/generate-component.mjs
 *   源：Figma-Token/vx-Component/（过程文件，迁移完成后删除）
 *
 * T3 只引用 T2。定义与建立门槛见 docs/10-standards/060-design-system.md §1.1，
 * 构建规范见 docs/10-standards/065-design-token-pipeline.md。
 * 应用侧可 var() 引用，**禁止赋值**。
 */

:root {
`;
}

const outputs = [];
for (const [family, rows] of [...families].sort()) {
  const body = rows.map(([n, v]) => `  ${n}: ${v};`).join("\n");
  outputs.push([`${family}-component.css`, `${header(family, rows.length)}${body}\n}\n`]);
}

const indexCss = `/**
 * components/index.css - T3 组件层聚合入口。
 * @package @vxture/design-system
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-07-31
 *
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 */

${[...families].sort().map(([f]) => `@import "./${f}-component.css";`).join("\n")}
`;
outputs.push(["index.css", indexCss]);

const emittedCount = [...families.values()].reduce((sum, rows) => sum + rows.length, 0);

mkdirSync(OUT_DIR, { recursive: true });

if (CHECK) {
  const stale = outputs.filter(([name, css]) => {
    try {
      return readFileSync(path.join(OUT_DIR, name), "utf8") !== css;
    } catch {
      return true;
    }
  });
  if (stale.length > 0) {
    console.error(
      `T3 组件层与导出不同步：${stale.map(([n]) => n).join(", ")}\n` +
        "运行：node scripts/design-tokens/generate-component.mjs",
    );
    process.exit(1);
  }
  console.log(`T3 组件层一致（${families.size} 族 / ${emittedCount} 项）`);
} else {
  for (const [name, css] of outputs) writeFileSync(path.join(OUT_DIR, name), css, "utf8");
  console.log(`已生成 T3 组件层：${families.size} 族 / ${emittedCount} 项`);
  if (converged.length > 0) {
    console.log(
      `已按治理门槛收敛回 T2 ${converged.length} 项（纯别名，消费方直接绑 T2）；` +
        `保留 ${kept.length} 项 T2 无从表达的裸值：${kept.join(", ")}`,
    );
  }
  // 已按治理收敛的族不再告警——它们已处理，仅余 T2 无从表达的裸值。
  const unexpected = [...families.keys()].filter(
    (f) => !CONVERGE_TO_T2[f] && NO_T3_EXPECTED.some((n) => f === n || f.startsWith(`${n}-`)),
  );
  if (unexpected.length > 0) {
    console.log(
      `⚠ 设计稿治理称「无需 T3、直接绑 T2」，但以下族仍有 T3：${unexpected.join(", ")}——需回报设计侧复核`,
    );
  }
  if (derived.length > 0) {
    console.log(`⚠ 设计稿未给 codeSyntax，按路径推导变量名 ${derived.length} 项（需回报设计侧补全）`);
  }
}
