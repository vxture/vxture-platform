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
import { DEVIATIONS } from "./deviations.mjs";

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

// 偏离表与 T3 生成器共用，理由见 deviations.mjs。
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

/*
 * 本生成器**不再**产出 Tailwind theme 桥接。
 *
 * 曾有一份 tokens-theme-shadcn.css 把 T2 色名注册成工具类，但 generate-theme.mjs
 * 现在统一承担全部命名空间的 `@theme` 注册（含这 117 条颜色），两者逐字重复，
 * 且桥接文件没有任何地方 import——留着只会成为第二处真值。注册一律去
 * generate-theme.mjs 改。
 */

mkdirSync(OUT_DIR, { recursive: true });
const target = path.join(OUT_DIR, "color-semantic.css");

if (CHECK) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    /* 缺文件即视为不同步 */
  }
  if (current !== css) {
    console.error(
      "T2 语义层与导出不同步。运行：node scripts/design-tokens/generate-semantic.mjs",
    );
    process.exit(1);
  }
  console.log(`T2 语义层一致（light ${light.length} · dark ${dark.length}）`);
} else {
  writeFileSync(target, css, "utf8");
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
