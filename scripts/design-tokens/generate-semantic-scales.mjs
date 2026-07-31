#!/usr/bin/env node

/**
 * generate-semantic-scales.mjs — 生成 T2 语义层的非色彩部分。
 *
 * ⚠ 与其余生成器同为一次性**迁移工具**，随过程文件一并退役。
 *   权威边界见 docs/10-standards/065-design-token-pipeline.md。
 *
 * 覆盖 7 个集合：
 *   无模式轴  vx-Shape / vx-Depth / vx-Element / vx-Motion / vx-Layout
 *   密度三档  vx-Space      → .density-{compact,default,comfortable}
 *   字号三档  vx-Typography → html.vx-font-{small,default,large}
 *
 * 用法：
 *   node scripts/design-tokens/generate-semantic-scales.mjs
 *   node scripts/design-tokens/generate-semantic-scales.mjs --check
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { RADIUS_TO_TAILWIND, RADIUS_DROPPED } from "./radius-map.mjs";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

const PKG = path.join(ROOT, "packages/design/design-system");
const EXPORT_DIR = path.join(PKG, "Figma-Token");
const OUT_DIR = path.join(PKG, "src/styles/semantic");
const FOUNDATION = path.join(PKG, "src/styles/foundation");

/* ── 集合定义 ───────────────────────────────────────────────── */

/** 单位规则：按 token 路径首段（或路径片段）决定。 */
const UNITLESS = /^(z\/|opacity\/)|fontWeight$/;
const MS = /^motion\/duration\//;

// radius 向 Tailwind 刻度对齐的表与 T3 共用，理由见 radius-map.mjs。

const COLLECTIONS = [
  { name: "vx-Shape", out: "shape-semantic.css", title: "形状", modes: null },
  { name: "vx-Depth", out: "depth-semantic.css", title: "深度", modes: null },
  { name: "vx-Element", out: "element-semantic.css", title: "元素尺寸", modes: null },
  { name: "vx-Motion", out: "motion-semantic.css", title: "动效", modes: null },
  { name: "vx-Layout", out: "layout-semantic.css", title: "布局常量", modes: null },
  {
    name: "vx-Space",
    out: "space-semantic.css",
    title: "间距（密度三档）",
    modes: [
      ["Compact", ".density-compact"],
      ["Default", ":root, .density-default"],
      ["Comfortable", ".density-comfortable"],
    ],
  },
  {
    name: "vx-Typography",
    out: "typography-semantic.css",
    title: "排版（字号三档）",
    modes: [
      ["Small", "html.vx-font-small"],
      ["Default", ":root, html.vx-font-default"],
      ["Large", "html.vx-font-large"],
    ],
  },
];

/* ── 工具 ───────────────────────────────────────────────────── */

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

/** 路径机械推导变量名，用于设计稿未给 codeSyntax 的 token。 */
const derivedName = (tokenPath) => `--${kebab(tokenPath).replace(/\//g, "-")}`;

/** 别名目标 → T1 变量名。spacing/* 与 font/* 两族。 */
function primitiveVar(target) {
  if (target.startsWith("spacing/")) {
    return `--vx-spacing-${target.slice("spacing/".length)}`;
  }
  if (target.startsWith("font/")) {
    const [, group, name] = target.split("/");
    return `--vx-font-${kebab(group)}-${name}`;
  }
  return null;
}

function loadT1Vars() {
  const vars = new Set();
  for (const f of ["spacing-primitive.css", "typography-primitive.css", "color-primitive.css"]) {
    const css = readFileSync(path.join(FOUNDATION, f), "utf8");
    for (const m of css.matchAll(/^\s*(--vx-[\w-]+):/gm)) vars.add(m[1]);
  }
  return vars;
}

const t1Vars = loadT1Vars();
const derived = [];
const overridden = [];
const radiusRemapped = [];
const radiusDropped = [];
const errors = [];

/** 裸值 → CSS 值。 */
function literal(tokenPath, value) {
  if (typeof value === "string") return value;
  if (typeof value !== "number") return null;
  if (UNITLESS.test(tokenPath) || /fontWeight$/.test(tokenPath)) return String(value);
  if (MS.test(tokenPath)) return `${value}ms`;
  return `${value}px`;
}

function buildRows(collection, file) {
  const tokens = flatten(
    JSON.parse(readFileSync(path.join(EXPORT_DIR, collection, file), "utf8")),
  );
  const rows = [];
  const seen = new Map();

  for (const [tokenPath, token] of tokens) {
    if (RADIUS_DROPPED.has(tokenPath)) {
      radiusDropped.push(tokenPath);
      continue;
    }
    // 这些集合的 codeSyntax 有 38% 不可用（缺失或多档撞名），已不足以充当命名权威，
    // 故变量名一律由 DS 按路径机械推导——唯一性由路径本身保证。
    // 详见 docs/10-standards/065-design-token-pipeline.md §3.2.1。
    const remapped = RADIUS_TO_TAILWIND[tokenPath];
    const name = remapped ? `--radius-${remapped}` : derivedName(tokenPath);
    if (remapped) radiusRemapped.push(`${tokenPath} → --radius-${remapped}`);
    const web = ext(token, "codeSyntax")?.WEB;
    if (typeof web === "string") {
      const m = web.match(/^var\(\s*(--)?([\w-]+)\s*\)$/);
      if (m && `--${m[2]}` !== name) {
        if (!overridden.some((o) => o.path === tokenPath)) {
          overridden.push({ path: tokenPath, figma: `--${m[2]}`, ds: name });
        }
      }
    } else if (!derived.some((d) => d.path === tokenPath)) {
      derived.push({ path: tokenPath, name });
    }

    // 撞名断言：路径推导后仍撞名说明路径本身有歧义，必须暴露。
    if (seen.has(name) && seen.get(name) !== tokenPath) {
      errors.push(
        `${collection}: ${seen.get(name)} 与 ${tokenPath} 都声明 ${name}——设计稿变量名冲突`,
      );
      continue;
    }
    seen.set(name, tokenPath);

    const target = ext(token, "aliasData")?.targetVariableName;
    if (target) {
      const ref = primitiveVar(target);
      if (!ref) {
        errors.push(`${collection}/${tokenPath}: 无法解析别名目标 ${target}`);
        continue;
      }
      if (!t1Vars.has(ref)) {
        errors.push(`${collection}/${tokenPath} → ${target}: T1 中不存在 ${ref}`);
        continue;
      }
      rows.push([name, `var(${ref})`, tokenPath]);
    } else {
      const value = literal(tokenPath, token.$value);
      if (value === null) {
        errors.push(`${collection}/${tokenPath}: 无法表达的裸值 ${JSON.stringify(token.$value)}`);
        continue;
      }
      rows.push([name, value, tokenPath]);
    }
  }
  return rows;
}

/** 渲染前的最后一道断言：同一块内不得出现重名，防止改名逻辑引入静默覆盖。 */
function assertUnique(rows, label) {
  const seen = new Set();
  for (const [name] of rows) {
    if (seen.has(name)) errors.push(`${label}: ${name} 在同一块内重复声明`);
    seen.add(name);
  }
}

function render(rows, indent = "  ") {
  const groups = new Map();
  for (const [name, value, tokenPath] of rows) {
    const g = tokenPath.split("/")[0];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(`${indent}${name}: ${value};`);
  }
  return [...groups]
    .map(([g, lines]) => `${indent}/* ${g} */\n${lines.join("\n")}`)
    .join("\n\n");
}

function header(title, source) {
  return `/**
 * semantic/${title.file} - T2 语义层 · ${title.label}。
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
 * 构建规范见 docs/10-standards/065-design-token-pipeline.md。
 */
`;
}

/* ── 生成 ───────────────────────────────────────────────────── */

const outputs = [];
const stats = [];

for (const col of COLLECTIONS) {
  const files = readdirSync(path.join(EXPORT_DIR, col.name)).filter((f) => f.endsWith(".json"));
  let body;
  let count = 0;

  if (!col.modes) {
    const rows = buildRows(col.name, files[0]);
    assertUnique(rows, col.name);
    count = rows.length;
    body = `:root {\n${render(rows)}\n}\n`;
  } else {
    const blocks = [];
    for (const [mode, selector] of col.modes) {
      const file = files.find((f) => f.startsWith(`${mode}.`));
      if (!file) {
        errors.push(`${col.name}: 缺少模式文件 ${mode}.tokens.json`);
        continue;
      }
      const rows = buildRows(col.name, file);
      assertUnique(rows, `${col.name}/${mode}`);
      count = rows.length;
      blocks.push(`${selector} {\n${render(rows)}\n}`);
    }
    body = `${blocks.join("\n\n")}\n`;
  }

  outputs.push([col.out, header({ file: col.out, label: col.title }, col.name) + "\n" + body]);
  stats.push(`${col.name} ${count}`);
}

if (errors.length > 0) {
  console.error("T2 非色彩层生成失败：\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

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
  console.log(`T2 非色彩层一致（${stats.join(" · ")}）`);
} else {
  for (const [name, css] of outputs) writeFileSync(path.join(OUT_DIR, name), css, "utf8");
  console.log(`已生成 T2 非色彩层：${stats.join(" · ")}`);
  if (radiusRemapped.length > 0) {
    console.log(
      `radius 已按取值对齐 Tailwind 刻度 ${radiusRemapped.length} 项（消除工具类遮蔽）：${radiusRemapped.join(", ")}`,
    );
  }
  if (radiusDropped.length > 0) {
    console.log(`⚠ Tailwind 刻度无对应且无人引用，未发：${radiusDropped.join(", ")}——需回报设计侧`);
  }
  if (overridden.length > 0) {
    console.log(
      `⚠ codeSyntax 与 DS 命名规则不符，已按路径推导覆盖 ${overridden.length} 项（需回报设计侧修正）`,
    );
  }
  if (derived.length > 0) {
    console.log(
      `⚠ 设计稿未给 codeSyntax，按路径推导变量名 ${derived.length} 项（需回报设计侧补全）：`,
    );
    for (const d of derived) console.log(`    · ${d.path} → ${d.name}`);
  }
}
