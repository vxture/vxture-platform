#!/usr/bin/env node

/**
 * generate-semantic.mjs — 由 Figma DTCG 导出生成 T2 语义层 CSS。
 *
 * ⚠ 与 generate-primitives.mjs 同为一次性**迁移工具**，随过程文件一并退役。
 *   权威边界与迁移判据见 docs/10-standards/065-design-token-pipeline.md。
 *
 * 出：src/styles/semantic/color-semantic.css
 *
 * 规则：
 * - 变量名取 `$extensions.com.figma.codeSyntax.WEB`，**禁止解析 $description**
 *   （已知至少五处描述与实际绑定不符）。
 * - 取值取 `aliasData.targetVariableName` 并转为对 T1 的 var() 引用；
 *   无别名者按裸值输出。
 * - 无 codeSyntax 的 token 一律跳过并列出——不静默丢弃。
 *
 * 用法：
 *   node scripts/design-tokens/generate-semantic.mjs
 *   node scripts/design-tokens/generate-semantic.mjs --check
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

const PKG = path.join(ROOT, "packages/design/design-system");
const EXPORT_DIR = path.join(PKG, "Figma-Token");
const OUT_DIR = path.join(PKG, "src/styles/semantic");
const T1_COLOR = path.join(PKG, "src/styles/foundation/color-primitive.css");

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

function loadMode(collection, mode) {
  return JSON.parse(
    readFileSync(path.join(EXPORT_DIR, collection, `${mode}.tokens.json`), "utf8"),
  );
}

const ext = (token, key) => token.$extensions?.[`com.figma.${key}`];

/**
 * 有依据地偏离导出值。
 *
 * DS 是唯一真值源，设计稿只是输入且已证实会出错，因此必须允许覆盖——
 * 但覆盖只能发生在此处，逐条写明理由，并在生成物中留痕。
 * 禁止直接编辑生成物：那会被 --check 拦下，且理由无处可查。
 *
 * 每次新增条目，都应同步回报设计侧修正设计稿。
 */
const DEVIATIONS = {
  "vx-Color-Light": {
    // 明色表面阶梯去品牌调。设计稿用 surface/B-* 的品牌浅蓝与 surface/N-* 的中性
    // 拉开层次，但该区分在暗色下完全塌缩（四级全为中性明度阶），且实践中 console
    // 早已用 --vx-color-shell-bg: #f5f7fb 绕过较重的品牌底色。
    // 明色可用档位只有 white/50/100/200 四个，恰好four级，故整体重排而非单点替换，
    // 否则页面底与卡内凹陷面会撞成同值。
    "surface/B-1": { to: "color/neutral/100", why: "页面底改中性" },
    "surface/B-2": { to: "color/neutral/200", why: "页面级凹陷面" },
    "surface/N-1": { to: "color/base/white", why: "卡片提为纯白，与灰底页面拉开层次" },
    "surface/N-2": { to: "color/neutral/50", why: "卡内凹陷面下移一档，避让页面底" },
  },
};

const appliedDeviations = [];

/** 设计稿中 codeSyntax 漏写 `--` 前缀的 token，规范化时登记在此。 */
const malformedSyntax = [];

/** "var(--foo)" → "--foo"；容忍并登记 "var(foo)" 这类漏写前缀的写法。 */
function cssVarName(token, tokenPath) {
  const web = ext(token, "codeSyntax")?.WEB;
  if (typeof web !== "string") return null;
  const m = web.match(/^var\(\s*(--)?([\w-]+)\s*\)$/);
  if (!m) return null;
  if (!m[1]) {
    // Figma 侧书写错误：缺 `--` 前缀。规范化后继续，但登记以便回报设计侧修正。
    if (!malformedSyntax.some((x) => x.path === tokenPath)) {
      malformedSyntax.push({ path: tokenPath, web });
    }
  }
  return `--${m[2]}`;
}

/** color/brand/main/600 → --vx-color-brand-600 ；color/neutral/600/alpha-08 → …-alpha-08 */
function primitiveVar(target) {
  const body = target.replace(/^color\//, "").replace(/^brand\/main\//, "brand/");
  return `--vx-color-${body.replace(/\//g, "-")}`;
}

/** T1 已生成的变量集合——用于断言 T2 不会引用不存在的原子。 */
function loadT1Vars() {
  const css = readFileSync(T1_COLOR, "utf8");
  return new Set([...css.matchAll(/^\s*(--vx-color-[\w-]+):/gm)].map((m) => m[1]));
}

const t1Vars = loadT1Vars();
const skipped = [];
const errors = [];

function buildMode(collection, mode) {
  const rows = [];
  for (const [tokenPath, token] of flatten(loadMode(collection, mode))) {
    const name = cssVarName(token, tokenPath);
    if (!name) {
      if (mode === "vx-Color-Light") skipped.push(tokenPath);
      continue;
    }
    const override = DEVIATIONS[mode]?.[tokenPath];
    const target = override?.to ?? ext(token, "aliasData")?.targetVariableName;
    if (target) {
      const ref = primitiveVar(target);
      if (!t1Vars.has(ref)) {
        errors.push(`${tokenPath} → ${target}：T1 中不存在 ${ref}`);
        continue;
      }
      if (override) {
        const from = ext(token, "aliasData")?.targetVariableName ?? "（裸值）";
        appliedDeviations.push(`${mode} ${tokenPath}: ${from} → ${override.to}（${override.why}）`);
      }
      rows.push([name, `var(${ref})`, tokenPath, override?.why]);
    } else {
      const value = token.$value;
      if (value && typeof value === "object" && value.hex) {
        rows.push([name, value.hex.toLowerCase(), tokenPath]);
      } else {
        errors.push(`${tokenPath}：既无别名也无可用裸值`);
      }
    }
  }
  return rows;
}

const light = buildMode("vx-Color", "vx-Color-Light");
const dark = buildMode("vx-Color", "vx-Color-Dark");

if (errors.length > 0) {
  console.error("T2 语义层生成失败：\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

/** 按 Figma 路径的首段分组，保持设计稿的组织顺序。 */
const GROUP_ORDER = ["surface", "content", "stroke", "intent", "chart", "gradient", "elevation"];
function render(rows, indent = "  ") {
  const groups = new Map();
  for (const [name, value, tokenPath, why] of rows) {
    const g = tokenPath.split("/")[0];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(`${indent}${name}: ${value};${why ? `  /* 偏离设计稿：${why} */` : ""}`);
  }
  const ordered = [
    ...GROUP_ORDER.filter((g) => groups.has(g)),
    ...[...groups.keys()].filter((g) => !GROUP_ORDER.includes(g)),
  ];
  return ordered.map((g) => `${indent}/* ${g} */\n${groups.get(g).join("\n")}`).join("\n\n");
}

const css = `/**
 * semantic/color-semantic.css - T2 语义层 · 色彩。
 * @package @vxture/design-system
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-07-31
 *
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 *   生成：node scripts/design-tokens/generate-semantic.mjs
 *   源：Figma-Token/vx-Color/（过程文件，迁移完成后删除）
 *
 * T2 定义见 docs/10-standards/060-design-system.md §1.1。
 * 构建规范见 docs/10-standards/065-design-token-pipeline.md。
 *
 * 变量名取自 Figma codeSyntax：shadcn 有对应概念的用 shadcn 名
 * （--background / --foreground / --primary / --border …），
 * shadcn 无对应概念的沿用设计稿自有名（--surface-* / --content-* / --link …）。
 *
 * 本层只引用 T1，不含裸值（surface/danger 例外，设计稿未给别名）。
 */

:root {
${render(light)}
}

.dark,
:root.dark {
${render(dark)}
}
`;

/**
 * Tailwind theme 桥接：把 T2 色名注册为工具类（bg-primary / text-foreground …）。
 *
 * 必须生成而非手写——手写会漏。首版手写时就漏了 link / link-hover /
 * primary-muted-hover / primary-muted-foreground 四个，而 DS 包不跑 Tailwind
 * 编译，build 全绿却会在消费方静默失效。
 *
 * ⚠ 只桥接颜色。Tailwind 无 primary / background / card 等同名内置色，注册无冲突；
 *   但 spacing 与 radius 有内置刻度且取值不同（T2 --radius-md 8px vs 内置 6px），
 *   桥接会改掉仓库既有 rounded-md / h-9 的观感，故尺寸类一律在组件内直接
 *   引用 CSS 变量。
 *
 * `inline` 使工具类展开为对原变量的引用而非快照，故 .dark 与密度/字号模式自动跟随。
 */
const bridgeLines = light.map(([name]) => `  --color-${name.slice(2)}: var(${name});`);
const bridgeCss = `/**
 * tokens-theme-shadcn.css - T2 语义色 → Tailwind 工具类桥接。
 * @package @vxture/design-system
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-07-31
 *
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 *   生成：node scripts/design-tokens/generate-semantic.mjs
 *
 * 只桥接颜色；尺寸与圆角不进 @theme，理由见生成器注释与
 * docs/10-standards/065-design-token-pipeline.md。
 */

@theme inline {
${bridgeLines.join("\n")}
}
`;

mkdirSync(OUT_DIR, { recursive: true });
const target = path.join(OUT_DIR, "color-semantic.css");
const bridgeTarget = path.join(PKG, "src/styles/tokens-theme-shadcn.css");

if (CHECK) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    /* 缺文件即视为不同步 */
  }
  let currentBridge = "";
  try {
    currentBridge = readFileSync(bridgeTarget, "utf8");
  } catch {
    /* 缺文件即视为不同步 */
  }
  if (current !== css || currentBridge !== bridgeCss) {
    console.error(
      "T2 语义层与导出不同步。运行：node scripts/design-tokens/generate-semantic.mjs",
    );
    process.exit(1);
  }
  console.log(
    `T2 语义层一致（light ${light.length} · dark ${dark.length} · 桥接 ${bridgeLines.length}）`,
  );
} else {
  writeFileSync(target, css, "utf8");
  writeFileSync(bridgeTarget, bridgeCss, "utf8");
  console.log(`已生成 T2 色彩：light ${light.length} · dark ${dark.length} 项`);
  if (appliedDeviations.length > 0) {
    console.log(`已应用偏离 ${appliedDeviations.length} 条（DS 为真值源，逐条留痕）：`);
    for (const d of appliedDeviations) console.log(`    · ${d}`);
  }
  if (malformedSyntax.length > 0) {
    console.log(
      `⚠ 设计稿 codeSyntax 漏写 -- 前缀，已规范化（需回报设计侧修正）：` +
        malformedSyntax.map((x) => `${x.path}=${x.web}`).join(", "),
    );
  }
  if (skipped.length > 0) {
    console.log(`跳过（无 codeSyntax，设计稿未指定 CSS 变量名）：${skipped.join(", ")}`);
  }
}
