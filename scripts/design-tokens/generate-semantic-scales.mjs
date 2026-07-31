#!/usr/bin/env node

/**
 * generate-semantic-scales.mjs — 生成 T2 语义层的非色彩部分。
 *
 * ⚠ 与 generate-semantic.mjs 同为一次性**迁移工具**，随过程文件一并退役。
 *   权威边界见 docs/10-standards/065-design-token-pipeline.md。
 *
 * ── T2 为什么要覆盖全部刻度族 ──
 * T1 是 Tailwind theme 的镜像，回答"有哪些数可选"；T2 回答"哪个数用在什么场合"。
 * 即使某族的语义名与 T1 一一对应、当下零增益（radius 就是），仍然经 T2 出口：
 * 分层边界要么处处成立、要么不成立，消费方不该需要记住"这族有语义名、那族没有"。
 *
 * 命名一律落在 v4 的真实命名空间上（`--transition-duration-*` 而非 `--duration-*`、
 * `--z-index-*` 而非 `--z-*`、`--spacing-*` 而非 `--space-*`），否则变量声明成功、
 * 工具类却不产出，且不报错——`duration-fast` 曾这样哑火一整轮。
 *
 * ── 两种落法 ──
 * 有模式轴的（字号三档 / 密度三档）：在模式选择器下声明 DS 侧名字，由
 *   generate-theme.mjs 注册进命名空间，`@theme inline` 使模式切换自动跟随。
 * 无模式轴的：直接在本文件的 `@theme` 块里用最终命名空间名声明，一处声明即完成
 *   注册——少一跳，也少一类"声明了忘记注册"的静默失效。
 *
 * 用法：
 *   node scripts/design-tokens/generate-semantic-scales.mjs
 *   node scripts/design-tokens/generate-semantic-scales.mjs --check
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  Z_LADDER,
  ELEVATION,
  EASE_ROLES,
  DURATION_ROLES,
  RADIUS_STEPS,
  BORDER_WIDTHS,
  OPACITIES,
  ICON_SIZES,
  MEDIA_SIZES,
  CONTENT_WIDTHS,
  SPACING_BASE,
  SPACING_MERGED,
  SPACING_HEIGHTS,
  assertElevationOrdered,
} from "./semantic-policy.mjs";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

const PKG = path.join(ROOT, "packages/design/design-tokens");
const EXPORT_DIR = path.join(PKG, "Figma-Token");
const OUT_DIR = path.join(PKG, "src/styles/semantic");
const FOUNDATION = path.join(PKG, "src/styles/foundation");

const errors = [];
const notes = [];

/* ── 读 T1 ──────────────────────────────────────────────────── */

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

/** 引用 T1，并断言目标存在——指向不存在的原子在 CSS 里是静默失效。 */
function t1(name, where) {
  if (!t1Literals.has(name)) errors.push(`${where}：T1 中不存在 ${name}`);
  return `var(${name})`;
}

/** 顺 var() 链解到字面量，用于必须落字面量的场合（容器查询）。 */
function resolve(name, where) {
  let cur = name;
  for (let i = 0; i < 8; i++) {
    const value = t1Literals.get(cur) ?? layoutLiterals.get(cur);
    if (value === undefined) {
      errors.push(`${where}：无法解析 ${cur}`);
      return "0";
    }
    const m = /^var\((--[\w-]+)\)$/.exec(value);
    if (!m) return value;
    cur = m[1];
  }
  errors.push(`${where}：var() 引用过深或成环`);
  return "0";
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

/**
 * 设计稿的 `spacing/N` 别名 → T1 表达式。
 *
 * T1 的间距只有一个乘数 `--vx-spacing`（0.25rem），这正是 v4 的做法：`p-4` 编译为
 * `calc(var(--spacing) * 4)`。故 T2 的每一档写成同形的 calc，仍然只引 T1。
 */
function spacingExpr(target, where) {
  const step = target.replace(/^spacing\//, "");
  if (step === "px") return "1px";
  const n = Number(step.replace("-", "."));
  if (!Number.isFinite(n)) {
    errors.push(`${where}：无法解析间距档 ${target}`);
    return "0";
  }
  if (n === 0) return "0px";
  return `calc(${t1("--vx-spacing", where)} * ${n})`;
}

/* ── 排版角色（字号三档）───────────────────────────────────── */

const FONT_SIZE_MODES = [
  ["Small", "html.vx-font-small"],
  ["Default", ":root, html.vx-font-default"],
  ["Large", "html.vx-font-large"],
];

function typographyT1(target) {
  const [, group, name] = target.split("/");
  if (group === "family") return `--vx-font-${name}`;
  if (group === "size") return `--vx-text-${name}`;
  if (group === "weight") return `--vx-font-weight-${name}`;
  return null;
}

function sizePxTable() {
  const px = new Map();
  for (const [name, value] of t1Literals) {
    const m = /^--vx-text-([\w-]+)$/.exec(name);
    const rem = /^([\d.]+)rem$/.exec(value);
    if (m && rem) px.set(name, Number(rem[1]) * 16);
  }
  return px;
}

/**
 * 行高与字距一律换算为**相对单位**（行高无单位比值、字距 em）。绝对 px 扛不住
 * 字号三档与浏览器缩放，且 Tailwind 的 `--text-*--line-height` 本身就是比值。
 *
 * ⚠ 字距**不可**沿用设计稿的别名。设计稿把 1.6px 挂在 `font/letterSpacing/widest`
 *   上，而 T1 镜像后 `--vx-tracking-widest` 是 Tailwind 的 0.1em——同名不同义：
 *   0.1em 在 60px 的 display 上是 6px，近设计意图的四倍。故按各角色字号折算。
 */
function buildRoles(mode) {
  const rows = [];
  const byRole = new Map();
  for (const [tokenPath, token] of load("vx-Typography", `${mode}.tokens.json`)) {
    const role = tokenPath.split("/").slice(0, -1).join("-");
    const prop = tokenPath.split("/").pop();
    if (!byRole.has(role)) byRole.set(role, {});
    byRole.get(role)[prop] = token;
  }

  for (const [role, props] of byRole) {
    const where = `${mode} ${role}`;
    for (const [prop, suffix] of [
      ["fontFamily", "font-family"],
      ["fontSize", "font-size"],
      ["fontWeight", "font-weight"],
    ]) {
      const target = aliasOf(props[prop]);
      const ref = target && typographyT1(target);
      if (!ref) {
        errors.push(`${where}/${prop}：设计稿未给可解析的别名`);
        continue;
      }
      rows.push([`--${role}-${suffix}`, t1(ref, where), role]);
    }

    const sizeVar = typographyT1(aliasOf(props.fontSize) ?? "");
    const basePx = sizePx.get(sizeVar);
    if (!basePx) {
      errors.push(`${where}：拿不到字号 px，行高与字距无法折算`);
      continue;
    }
    const ratio = (v) => Number((v / basePx).toFixed(4));
    rows.push([`--${role}-line-height`, String(ratio(props.lineHeight.$value)), role]);
    rows.push([`--${role}-letter-spacing`, `${ratio(props.letterSpacing.$value)}em`, role]);
  }
  return rows;
}

/* ── 间距（密度三档）───────────────────────────────────────── */

const DENSITY_MODES = [
  ["Compact", ".density-compact"],
  ["Default", ":root, .density-default"],
  ["Comfortable", ".density-comfortable"],
];

/**
 * T2 变量名用 `--space-*` 而非 `--spacing-*`：后者是命名空间名，同名会写出指向
 * 自己的注册（`--spacing-md: var(--spacing-md)`），CSS 判定为循环、整族失效且不报错。
 * 注册由 generate-theme.mjs 改名完成。
 */
function buildSpacing(mode) {
  const rows = [];
  const seen = new Set();
  for (const [tokenPath, token] of load("vx-Space", `${mode}.tokens.json`)) {
    const parts = tokenPath.split("/");
    const step = parts.pop();
    const family = parts.join("-");
    const where = `${mode} ${tokenPath}`;
    const target = aliasOf(token);
    if (!target) {
      errors.push(`${where}：设计稿未给别名`);
      continue;
    }

    let name = null;
    if (SPACING_MERGED.includes(family)) {
      if (family !== SPACING_BASE) continue; // 非基准族整族丢弃
      name = `--space-${step}`;
    } else if (SPACING_HEIGHTS[family]) {
      name = `--space-${SPACING_HEIGHTS[family]}-${step}`;
    } else {
      errors.push(`${where}：间距族 ${family} 未在合并表中登记`);
      continue;
    }
    if (seen.has(name)) continue;
    seen.add(name);
    rows.push([name, spacingExpr(target, where), family]);
  }
  return rows;
}

/* ── 无模式轴的各族 ─────────────────────────────────────────── */

function buildRadius() {
  return RADIUS_STEPS.map((step) => [
    `--radius-${step}`,
    t1(`--vx-radius-${step}`, `radius/${step}`),
    "radius",
  ]);
}

function buildBorder() {
  return BORDER_WIDTHS.map(([name, value, why]) => [
    `--border-width-${name}`,
    value,
    "border-width",
    why,
  ]);
}

function buildOpacity() {
  return OPACITIES.map(([name, value, why]) => [
    `--opacity-${name}`,
    String(value),
    "opacity",
    why,
  ]);
}

function buildZIndex() {
  const byValue = new Map();
  const rows = [];
  for (const [name, value, why] of Z_LADDER) {
    if (byValue.has(value)) {
      errors.push(
        `z-index 同值：${byValue.get(value)} 与 ${name} 都是 ${value}——叠放次序未定义`,
      );
    }
    byValue.set(value, name);
    rows.push([`--z-index-${name}`, String(value), "z-index", why]);
  }
  return rows;
}

function buildShadow() {
  assertElevationOrdered(errors);
  return ELEVATION.map(([role, step, , why]) => [
    `--shadow-${role}`,
    step === "none" ? "none" : t1(`--vx-shadow-${step}`, `elevation/${role}`),
    "shadow",
    why,
  ]);
}

function buildMotion() {
  const rows = DURATION_ROLES.map(([role, step, why]) => [
    `--transition-duration-${role}`,
    t1(`--vx-transition-duration-${step}`, `duration/${role}`),
    "duration",
    why,
  ]);
  for (const [role, step, why] of EASE_ROLES) {
    rows.push([`--ease-${role}`, t1(`--vx-ease-${step}`, `ease/${role}`), "ease", why]);
  }
  return rows;
}

function buildSize() {
  const rows = [];
  for (const [kind, list] of [
    ["icon", ICON_SIZES],
    ["media", MEDIA_SIZES],
  ]) {
    for (const [step, mult] of list) {
      rows.push([
        `--spacing-${kind}-${step}`,
        `calc(${t1("--vx-spacing", `${kind}/${step}`)} * ${mult})`,
        kind,
      ]);
    }
  }
  return rows;
}

/**
 * 页面与内容宽度。
 *
 * ⚠ 必须落字面量：容器宽度进 `@container (width >= …)`，而**容器查询里 var() 不
 *   参与求值**。写成引用不报错，只是该档的所有容器变体静默失效。这是本层唯一
 *   一处不写 var() 的地方，原因是 CSS 的限制而非分层的例外。
 *
 * 页面宽度逐档等于同名断点；内容宽度是可读行长上限，设计稿只给到 wide-2xl（1536），
 * 2K / 4K 视口下明显偏窄，故 DS 补 ultra-3xl = 1920 收口。
 */
const layoutLiterals = new Map();
function buildLayout() {
  const rows = [];
  const bp = [...t1Literals.entries()]
    .map(([n, v]) => [/^--vx-breakpoint-(.+)$/.exec(n)?.[1], v])
    .filter(([s_]) => s_)
    .sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]));

  for (const [step] of bp) {
    const value = resolve(`--vx-breakpoint-${step}`, `layout/page/${step}`);
    layoutLiterals.set(`--container-page-${step}`, value);
    rows.push([`--container-page-${step}`, value, "page"]);
  }
  for (const [name, step, why] of CONTENT_WIDTHS) {
    rows.push([
      `--container-content-${name}`,
      resolve(`--container-page-${step}`, `layout/content/${name}`),
      "content",
      why,
    ]);
  }
  return rows;
}

/* ── 渲染 ───────────────────────────────────────────────────── */

function render(rows, indent = "  ") {
  const groups = new Map();
  for (const [name, value, group, why] of rows) {
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(`${indent}${name}: ${value};${why ? `  /* ${why} */` : ""}`);
  }
  return [...groups]
    .map(([g, lines]) => `${indent}/* ${g} */\n${lines.join("\n")}`)
    .join("\n\n");
}

function header(file, label, source, extra = "") {
  return `/**
 * semantic/${file} - T2 语义层 · ${label}。
 * @package @vxture/design-tokens
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-08-01
 *
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 *   生成：node scripts/design-tokens/generate-semantic-scales.mjs
 *   源：${source}
 *
 * T2 定义见 docs/10-standards/060-design-system.md §1.1。
 * 构建规范见 docs/10-standards/065-design-token-pipeline.md。${extra}
 */
`;
}

/** 无模式轴的族：名字即命名空间名，在 `@theme` 里一处声明即完成注册。 */
function staticFile(file, label, source, rows, extra = "") {
  return [file, header(file, label, source, extra) + `\n@theme {\n${render(rows)}\n}\n`];
}

/* ── 生成 ───────────────────────────────────────────────────── */

const t1Literals = loadT1();
const sizePx = sizePxTable();

const typoBlocks = FONT_SIZE_MODES.map(([mode, sel]) => [sel, buildRoles(mode)]);
const spaceBlocks = DENSITY_MODES.map(([mode, sel]) => [sel, buildSpacing(mode)]);
const roleCount = new Set(typoBlocks[0][1].map(([, , role]) => role)).size;

const outputs = [
  [
    "typography-semantic.css",
    header(
      "typography-semantic.css",
      "排版角色（工具类族 text-*）",
      "Figma-Token/vx-Typography/",
      `
 *
 * 每个角色一次落齐字号 / 行高 / 字距 / 字重，由 theme.css 注册为 v4 的
 * \`--text-<role>\` 及其修饰子键；字体族不在修饰子键之列，仍由独立的
 * \`font-*\` 工具类承担。`,
    ) +
      "\n" +
      typoBlocks.map(([sel, rows]) => `${sel} {\n${render(rows)}\n}`).join("\n\n") +
      "\n",
  ],
  [
    "spacing-semantic.css",
    header(
      "spacing-semantic.css",
      "间距与控件高度（工具类族 p-* / gap-* / h-*）",
      "Figma-Token/vx-Space/",
      `
 *
 * 密度三档是**用户偏好轴**，与组件自身的尺寸变体（cva size）正交：前者由祖先
 * 类重定向变量、任意深度生效，后者由类名逐处指定。组件不需要知道密度存在。
 *
 * 三档之间是档位平移而非等比缩放（比值 1.0–1.5 不等），故必须逐档列表，
 * 不能靠一个乘数推导。`,
    ) +
      "\n" +
      spaceBlocks.map(([sel, rows]) => `${sel} {\n${render(rows)}\n}`).join("\n\n") +
      "\n",
  ],
  staticFile(
    "layout-semantic.css",
    "页面与内容宽度（工具类族 max-w-*）",
    "Figma-Token/vx-Layout/",
    buildLayout(),
    `
 *
 * ⚠ 本族落字面量而非 var()：容器查询里 var() 不参与求值，写成引用会静默失效。`,
  ),
  staticFile("radius-semantic.css", "圆角（工具类族 rounded-*）", "Figma-Token/vx-Shape/", buildRadius()),
  staticFile(
    "shadow-semantic.css",
    "视觉高度（工具类族 shadow-*）",
    "Figma-Token/vx-Depth/ + semantic-policy.mjs",
    buildShadow(),
    `
 *
 * 按组件角色命名而非序数档位。允许多角色共用一档——可辨识的视觉高度本就比叠放
 * 层级少；与 z-index 的单调一致由生成器断言。暗色不另设一套，层次由 surface
 * 明度与描边承担。`,
  ),
  staticFile(
    "zindex-semantic.css",
    "叠放次序（工具类族 z-*）",
    "semantic-policy.mjs",
    buildZIndex(),
    `
 *
 * 无 T1 可指：叠放次序不是量纲，500 不是某个测量值的第 500 档，只是一个序。`,
  ),
  staticFile(
    "motion-semantic.css",
    "时长与缓动（工具类族 duration-* / ease-*）",
    "Figma-Token/vx-Motion/ + semantic-policy.mjs",
    buildMotion(),
  ),
  staticFile(
    "opacity-semantic.css",
    "透明度（工具类族 opacity-*）",
    "Figma-Token/vx-Depth/",
    buildOpacity(),
    `
 *
 * 无 T1 可指：上游对 opacity 既无 theme 变量也无封闭档位表，接受任意 0–100。`,
  ),
  staticFile(
    "border-semantic.css",
    "描边宽度（工具类族 border-*）",
    "Figma-Token/vx-Shape/",
    buildBorder(),
    `
 *
 * 无 T1 可指：同 opacity，上游接受任意 border-<n>，没有原子刻度这回事。`,
  ),
  staticFile(
    "size-semantic.css",
    "图标与媒体尺寸（工具类族 size-*）",
    "Figma-Token/vx-Element/",
    buildSize(),
    `
 *
 * 落在 spacing 命名空间下，产出 size-icon-md / size-media-lg。不随密度轴变化——
 * 图标缩小会先失去可辨识度，密度收紧应体现在留白而非图形本身。`,
  ),
];

if (errors.length > 0) {
  console.error("T2 非色彩层生成失败：\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const stat = `排版 ${roleCount} 角色 × 3 档 · 间距 ${spaceBlocks[0][1].length} × 3 档 · 其余 ${outputs.length - 2} 族`;

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
  console.log(`T2 非色彩层一致（${stat}）`);
} else {
  for (const [name, css] of outputs) writeFileSync(path.join(OUT_DIR, name), css, "utf8");
  console.log(`已生成 T2 非色彩层：${stat}`);
  for (const n of notes) console.log(`    · ${n}`);
}
