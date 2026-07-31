#!/usr/bin/env node

/**
 * generate-semantic-scales.mjs — 生成 T2 语义层的非色彩部分。
 *
 * ⚠ 与 generate-semantic.mjs 同为一次性**迁移工具**，随过程文件一并退役。
 *   权威边界见 docs/10-standards/065-design-token-pipeline.md。
 *
 * ── 为什么只剩两个产物 ──
 * T1 已是 Tailwind v4 theme 的完整镜像，`radius / shadow / ease / duration /
 * opacity / border-width / z-index / spacing / size` 九族的语义层因此全部退役：
 * 它们当初存在的理由是"给无意义的档位起个名"，而 Tailwind 的内置档位本就自带
 * 名字与工具类（`rounded-lg`、`shadow-md`、`ease-out`、`duration-150`、
 * `opacity-45`、`border-2`、`z-50`、`p-4`、`size-4`）。再包一层只是把
 * `duration-150` 改叫 `duration-fast`，不产生任何语义，却多一处真值。
 *
 * 剩下的两族是 Tailwind 确实没有的：
 *   typography  24 个排版角色（字号 / 行高 / 字距 / 字重 / 字体族的组合）
 *   layout      页面与内容的最大宽度（Tailwind 的 --container-* 只到 80rem）
 *
 * 密度轴（原 .density-* 三档）随 spacing 语义层一并退役：实测三档之间是**档位
 * 平移**而非等比缩放（比值 1.0–1.5 不等），平移是组件的事，属 cva variant，
 * 不是 token 层能表达的。
 *
 * 用法：
 *   node scripts/design-tokens/generate-semantic-scales.mjs
 *   node scripts/design-tokens/generate-semantic-scales.mjs --check
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

const PKG = path.join(ROOT, "packages/design/design-system");
const EXPORT_DIR = path.join(PKG, "Figma-Token");
const OUT_DIR = path.join(PKG, "src/styles/semantic");
const FOUNDATION = path.join(PKG, "src/styles/foundation");

const errors = [];
const notes = [];

/* ── 读 T1 ──────────────────────────────────────────────────── */

/** T1 变量名 → 字面值（递归扫 foundation/，含 typography/ 子目录）。 */
function loadT1() {
  const literals = new Map();
  const walk = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) walk(full);
      else if (f.name.endsWith(".css")) {
        for (const m of readFileSync(full, "utf8").matchAll(/^\s*(--vx-[\w-]+):\s*([^;]+);/gm)) {
          literals.set(m[1], m[2].trim());
        }
      }
    }
  };
  walk(FOUNDATION);
  return literals;
}

/* ── Figma DTCG ─────────────────────────────────────────────── */

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

const aliasOf = (token) =>
  token.$extensions?.["com.figma.aliasData"]?.targetVariableName ?? null;

const load = (collection, file) =>
  flatten(JSON.parse(readFileSync(path.join(EXPORT_DIR, collection, file), "utf8")));

/* ── 排版角色 ───────────────────────────────────────────────── */

const FONT_SIZE_MODES = [
  ["Small", "html.vx-font-small"],
  ["Default", ":root, html.vx-font-default"],
  ["Large", "html.vx-font-large"],
];

/**
 * 设计稿别名目标 → T1 变量名。三族都已按 Tailwind 命名空间落在 T1：
 * `font/family/brand` → `--vx-font-brand`、`font/size/6xl` → `--vx-text-6xl`、
 * `font/weight/bold` → `--vx-font-weight-bold`。
 */
function t1VarFor(target) {
  const [, group, name] = target.split("/");
  if (group === "family") return `--vx-font-${name}`;
  if (group === "size") return `--vx-text-${name}`;
  if (group === "weight") return `--vx-font-weight-${name}`;
  return null;
}

/**
 * 字号 px：T1 存 rem（跟随浏览器字号设置），换算基准 16px 即 rem 的定义值。
 * 行高与字距都要按各自角色的字号折算，故必须能拿到 px。
 */
function sizePxTable(t1) {
  const px = new Map();
  for (const [name, value] of t1) {
    const m = /^--vx-text-([\w-]+)$/.exec(name);
    const rem = /^([\d.]+)rem$/.exec(value);
    if (m && rem) px.set(name, Number(rem[1]) * 16);
  }
  return px;
}

/**
 * 排版角色的行高与字距一律换算为**相对单位**（行高无单位比值、字距 em）。
 *
 * 设计稿存的是绝对 px（Figma 字段限制）。绝对值扛不住字号三档模式与浏览器缩放，
 * 且 Tailwind 的 `--text-*--line-height` 本身就是 `calc(1.25 / 0.875)` 这样的
 * 比值，同构才能互相替换。
 *
 * ⚠ 字距**不可**沿用设计稿的别名。设计稿把 1.6px 挂在 `font/letterSpacing/widest`
 *   上，而 T1 镜像后 `--vx-tracking-widest` 是 Tailwind 的 0.1em——同名不同义：
 *   0.1em 在 60px 的 display 上是 6px，是设计意图的近四倍。故按各角色字号折算。
 */
function buildRoles(mode, t1, px) {
  const rows = [];
  const byRole = new Map();
  for (const [tokenPath, token] of load("vx-Typography", `${mode}.tokens.json`)) {
    const role = tokenPath.split("/").slice(0, -1).join("-");
    const prop = tokenPath.split("/").pop();
    if (!byRole.has(role)) byRole.set(role, {});
    byRole.get(role)[prop] = token;
  }

  for (const [role, props] of byRole) {
    const emit = (suffix, value) => rows.push([`--${role}-${suffix}`, value, role]);

    for (const [prop, suffix] of [
      ["fontFamily", "font-family"],
      ["fontSize", "font-size"],
      ["fontWeight", "font-weight"],
    ]) {
      const target = aliasOf(props[prop]);
      if (!target) {
        errors.push(`${mode} ${role}/${prop}：设计稿未给别名，无法落到 T1`);
        continue;
      }
      const ref = t1VarFor(target);
      if (!ref || !t1.has(ref)) {
        errors.push(`${mode} ${role}/${prop} → ${target}：T1 中不存在 ${ref}`);
        continue;
      }
      emit(suffix, `var(${ref})`);
    }

    const sizeVar = t1VarFor(aliasOf(props.fontSize) ?? "");
    const basePx = px.get(sizeVar);
    if (!basePx) {
      errors.push(`${mode} ${role}：拿不到字号 px，行高与字距无法折算`);
      continue;
    }
    emit("line-height", String(Number((props.lineHeight.$value / basePx).toFixed(4))));
    emit("letter-spacing", `${Number((props.letterSpacing.$value / basePx).toFixed(4))}em`);
  }
  return rows;
}

/* ── 布局宽度 ───────────────────────────────────────────────── */

/**
 * 页面最大宽度逐档等于同名断点，故写成对 T1 断点的引用而非字面量——两份字面量
 * 必然漂移，且"页面宽度跟随断点"这条规则在产物里自解释。
 *
 * ⚠ 设计稿把 container/{3xl,4xl,5xl} 都填成 1920，是"内容不再加宽"的意思填错了
 *   位置：那是 content 的封顶规则，不是 page 的。page 恢复与断点严格对应，
 *   封顶规则由 content/ultra-3xl 承担。
 *
 * 内容宽度是**可读行长上限**：正文类 640–768、应用内容 1280–1536、数据密集型
 * 面板至多 1920；再宽则行长失控，应改用分栏。设计稿只给到 wide-2xl（1536），
 * 2K / 4K 视口下明显偏窄，故 DS 补 ultra-3xl = 1920 收口。
 */
function buildLayout(t1) {
  const rows = [];
  const steps = [];
  for (const [tokenPath] of load("vx-Layout", "vx-Layout.tokens.json")) {
    const m = /^layout\/container\/(.+)$/.exec(tokenPath);
    if (m) steps.push(m[1]);
  }
  // 断点全档都给页面宽度，含设计稿未列的 xs——页面宽度与断点是同一把尺。
  const bp = [...t1.entries()]
    .map(([n, v]) => [/^--vx-breakpoint-(.+)$/.exec(n)?.[1], parseFloat(v)])
    .filter(([s]) => s)
    .sort((a, b) => a[1] - b[1])
    .map(([s]) => s);
  for (const step of bp) {
    rows.push([`--layout-page-${step}`, `var(--vx-breakpoint-${step})`, "page"]);
  }
  const missing = steps.filter((s) => !bp.includes(s));
  if (missing.length > 0) errors.push(`layout/container 有断点无对应档：${missing.join(", ")}`);

  const content = [
    ["narrow-lg", "lg"],
    ["base-xl", "xl"],
    ["wide-2xl", "2xl"],
    ["ultra-3xl", "3xl"],
  ];
  for (const [name, step] of content) {
    rows.push([`--layout-content-${name}`, `var(--layout-page-${step})`, "content"]);
  }
  notes.push(`布局宽度：页面 ${bp.length} 档 · 内容 ${content.length} 档（ultra-3xl 为 DS 增补）`);
  return rows;
}

/* ── 渲染 ───────────────────────────────────────────────────── */

function render(rows, indent = "  ") {
  const groups = new Map();
  for (const [name, value, group] of rows) {
    const g = group.split("-")[0];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(`${indent}${name}: ${value};`);
  }
  return [...groups]
    .map(([g, lines]) => `${indent}/* ${g} */\n${lines.join("\n")}`)
    .join("\n\n");
}

function header(file, label, source, extra = "") {
  return `/**
 * semantic/${file} - T2 语义层 · ${label}。
 * @package @vxture/design-system
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-07-31
 *
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 *   生成：node scripts/design-tokens/generate-semantic-scales.mjs
 *   源：Figma-Token/${source}/（过程文件，迁移完成后删除）
 *
 * T2 定义见 docs/10-standards/060-design-system.md §1.1。
 * 构建规范见 docs/10-standards/065-design-token-pipeline.md。${extra}
 */
`;
}

/* ── 生成 ───────────────────────────────────────────────────── */

const t1 = loadT1();
const px = sizePxTable(t1);

const typoBlocks = FONT_SIZE_MODES.map(([mode, selector]) => {
  const rows = buildRoles(mode, t1, px);
  return [selector, rows];
});
const roleCount = new Set(typoBlocks[0][1].map(([, , role]) => role)).size;

const layoutRows = buildLayout(t1);

if (errors.length > 0) {
  console.error("T2 非色彩层生成失败：\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const outputs = [
  [
    "typography-semantic.css",
    header(
      "typography-semantic.css",
      `排版角色（工具类族 text-*）`,
      "vx-Typography",
      `
 *
 * 每个角色一次落齐字号 / 行高 / 字距 / 字重，由 theme.css 注册成 v4 的
 * \`--text-<role>\` 及其修饰子键；字体族不在 v4 修饰子键之列，仍由独立的
 * \`font-*\` 工具类承担。
 *
 * 行高为无单位比值、字距为 em——绝对 px 扛不住字号三档与浏览器缩放。`,
    ) +
      "\n" +
      typoBlocks.map(([sel, rows]) => `${sel} {\n${render(rows)}\n}`).join("\n\n") +
      "\n",
  ],
  [
    "layout-semantic.css",
    header("layout-semantic.css", "页面与内容宽度（工具类族 max-w-*）", "vx-Layout") +
      `\n:root {\n${render(layoutRows)}\n}\n`,
  ],
];

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
      `T2 非色彩层与导出不同步：${stale.map(([n]) => n).join(", ")}\n` +
        "运行：node scripts/design-tokens/generate-semantic-scales.mjs",
    );
    process.exit(1);
  }
  console.log(`T2 非色彩层一致（排版 ${roleCount} 角色 × 3 档 · 布局 ${layoutRows.length}）`);
} else {
  for (const [name, css] of outputs) writeFileSync(path.join(OUT_DIR, name), css, "utf8");
  console.log(`已生成 T2 非色彩层：排版 ${roleCount} 角色 × 3 档 · 布局 ${layoutRows.length} 项`);
  for (const n of notes) console.log(`    · ${n}`);
}
