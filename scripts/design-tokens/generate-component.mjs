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
import { RADIUS_DROPPED, radiusVarName } from "./radius-map.mjs";
import { DEVIATED_PATHS } from "./deviations.mjs";

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

/**
 * vx-Color 的变量名以 codeSyntax 为准（§3.2.1 例外），其余集合按路径推导；
 * radius 另按 radius-map.mjs 对齐 Tailwind 刻度——与 T2 生成器共用同一张表。
 *
 * 同时记录每个 T2 token 的 $value，供下方的**取值一致性断言**使用。
 * 仅断言"名字存在"是不够的：radius 对齐 Tailwind 时，radius/md 解析出的
 * --radius-md 依然存在，只是已改指另一档（8px→6px），存在性检查完全看不出来。
 */
function buildT2NameMap() {
  const map = new Map();
  for (const dir of readdirSync(EXPORT_DIR)) {
    if (dir.endsWith("-Primitive") || dir === "vx-Component") continue;
    const useCodeSyntax = dir === "vx-Color";
    const files = readdirSync(path.join(EXPORT_DIR, dir)).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const tokens = flatten(JSON.parse(readFileSync(path.join(EXPORT_DIR, dir, file), "utf8")));
      for (const [tokenPath, token] of tokens) {
        if (RADIUS_DROPPED.has(tokenPath)) continue;
        const radius = radiusVarName(tokenPath);
        let varName;
        if (radius) {
          varName = radius;
        } else if (useCodeSyntax) {
          const web = ext(token, "codeSyntax")?.WEB;
          const m = typeof web === "string" ? web.match(/^var\(\s*(--)?([\w-]+)\s*\)$/) : null;
          varName = m ? `--${m[2]}` : null;
        } else {
          varName = derivedName(tokenPath);
        }
        if (!varName) continue;
        if (!map.has(tokenPath)) map.set(tokenPath, varName);
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

/**
 * T2 变量名 → 该变量在各模式下**实际解析出的字面值**集合。
 *
 * 关键：值必须从**已生成的 T1/T2 CSS** 里解析，不能在本文件里再推导一遍。
 * 早先的版本用同一套命名逻辑同时算出「名字」和「值」，两者一起漂移就自洽，
 * 负向测试证实它抓不到任何漂移——等于摆设。改为读产物后，
 * 任何一侧改名都会让取值对不上而报错。
 *
 * 用集合而非单值：vx-Color 有明暗两档、vx-Space / vx-Typography 各三档，
 * 而 T3 无模式轴、其解析值只对应导出时所处的那一档（实测为 Compact）。
 * 故断言为「T3 的值必须命中该变量的某一档」。
 */
function loadResolvedVarValues() {
  const decls = new Map(); // var → Set(原始声明值)
  const collect = (dir) => {
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".css")) continue;
      const css = readFileSync(path.join(dir, file), "utf8");
      for (const m of css.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
        if (!decls.has(m[1])) decls.set(m[1], new Set());
        decls.get(m[1]).add(m[2].trim());
      }
    }
  };
  collect(path.join(PKG, "src/styles/foundation"));
  collect(SEMANTIC_DIR);

  const resolve = (raw, depth = 0) => {
    const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(raw);
    if (!ref || depth > 8) return [raw];
    const next = decls.get(ref[1]);
    return next ? [...next].flatMap((v) => resolve(v, depth + 1)) : [raw];
  };

  const resolved = new Map();
  for (const [name, raws] of decls) {
    resolved.set(name, new Set([...raws].flatMap((r) => resolve(r))));
  }
  return resolved;
}

/** 把设计稿的 $value 归一为「与生成的 CSS 字面值可比」的形式。 */
function asCssLiteral(tokenPath, value) {
  if (value && typeof value === "object" && value.hex) {
    const hex = value.hex.toLowerCase();
    if (value.alpha === 1) return [hex];
    const [r, g, b] = value.components.map((c) => Math.round(c * 255));
    return [`rgb(${r} ${g} ${b} / ${Number(value.alpha.toFixed(4))})`, hex];
  }
  const lit = literal(tokenPath, value);
  return lit === null ? [] : [lit];
}

const fmt = (v) => (v && typeof v === "object" ? (v.hex ?? JSON.stringify(v)) : String(v));

const t2Names = buildT2NameMap();
const varValues = loadResolvedVarValues();
const t2Vars = loadT2Vars();
const errors = [];
const derived = [];
const converged = [];
const kept = [];
const deviatedRefs = [];

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
    // 取值一致性：T3 的解析值必须命中 t2 这个变量名实际承载的某一档取值。
    // 仅查名字存在是不够的——名字仍在、却已改指另一个 token 时，存在性检查看不出来。
    const carried = varValues.get(t2);
    const own = asCssLiteral(tokenPath, token.$value);
    if (DEVIATED_PATHS.has(target)) {
      // 该 T2 token 已被有依据地偏离，设计稿原值必然对不上产物——跳过断言并记录。
      deviatedRefs.push(`${tokenPath} → ${target}`);
    } else if (carried && own.length > 0 && !own.some((v) => carried.has(v))) {
      errors.push(
        `${tokenPath} → ${target} → ${t2}：取值未命中（自身 ${fmt(token.$value)}，` +
          `而 ${t2} 在产物中解析为 ${[...carried].join(" / ")}）`,
      );
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
  if (deviatedRefs.length > 0) {
    console.log(
      `${deviatedRefs.length} 项引用了已偏离的 T2 token，跳过取值断言（偏离见 deviations.mjs）`,
    );
  }
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
