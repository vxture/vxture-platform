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
import { RADIUS_TO_TAILWIND, RADIUS_DROPPED, radiusVarName } from "./radius-map.mjs";
import { SCALE_DEVIATIONS, SCALE_ADDITIONS } from "./deviations.mjs";
import { SPACING_BASE, SPACING_MERGED, SPACING_HEIGHTS } from "./spacing-merge.mjs";

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

/**
 * 命名空间对齐 Tailwind：一个命名空间对应一族工具类。
 *
 * - `motion/duration/*` → `--duration-*`（对应 duration-* 工具类）
 * - `motion/easing/*`   → `--ease-*`（Tailwind 术语是 ease，且其内置只有
 *                          in/out/in-out，与我方 standard/decelerate/… 不撞名）
 * - `layout/container/*` → `--layout-page-*`：Tailwind 的 `--container-*` 是一套
 *   **通用宽度刻度**（md=448px，供 max-w-md 用），我方是**页面最大宽度**
 *   （md=768px）。同词不同义正是跨团队歧义的来源，故改名脱钩。
 */
const PATH_RENAMES = [
  [/^motion\/duration\//, "--duration-"],
  [/^motion\/easing\//, "--ease-"],
  [/^layout\/container\//, "--layout-page-"],
  // 字号 T1 已改名对齐 Tailwind 命名空间：`font/size/xs` → `--vx-text-xs`。
  [/^font\/size\//, "--vx-text-"],
];

function renamedVar(tokenPath) {
  for (const [pattern, prefix] of PATH_RENAMES) {
    if (pattern.test(tokenPath)) {
      return `${prefix}${tokenPath.replace(pattern, "").replace(/\//g, "-")}`;
    }
  }
  return null;
}

/** DTCG 字符串别名 `{layout.container.lg}` → 对应 CSS 变量；非别名返回 null。 */
function dtcgAlias(value) {
  if (typeof value !== "string") return null;
  const m = /^\{([\w.-]+)\}$/.exec(value);
  if (!m) return null;
  const targetPath = m[1].replace(/\./g, "/");
  return renamedVar(targetPath) ?? radiusVarName(targetPath) ?? derivedName(targetPath);
}

const DENSITY_MODES = [
  ["Compact", ".density-compact"],
  ["Default", ":root, .density-default"],
  ["Comfortable", ".density-comfortable"],
];
const FONT_SIZE_MODES = [
  ["Small", "html.vx-font-small"],
  ["Default", ":root, html.vx-font-default"],
  ["Large", "html.vx-font-large"],
];

const COLLECTIONS = [
  { name: "vx-Shape", modes: null },
  { name: "vx-Depth", modes: null },
  { name: "vx-Element", modes: null },
  { name: "vx-Motion", modes: null },
  { name: "vx-Layout", modes: null },
  { name: "vx-Space", modes: DENSITY_MODES },
  { name: "vx-Typography", modes: FONT_SIZE_MODES },
];

/**
 * 文件划分：**一个命名空间对应一族工具类，一一对应**。
 *
 * 不再按 Figma 集合分文件——集合是设计侧的组织方式，会随设计稿调整而变动，
 * 且一个集合常横跨多个工具类族（vx-Shape 同时含 radius 与 border-width，
 * vx-Depth 同时含 shadow 几何、z-index 与 opacity）。按命名空间分则稳定，
 * 且"改这个文件会影响哪族工具类"在文件名上就一目了然。
 *
 * 顺序即匹配优先级，前缀更长的规则须排在前面。
 */
const ROUTES = [
  { file: "radius-semantic.css", title: "圆角", family: "rounded-*", test: (p) => p.startsWith("radius/") },
  { file: "border-semantic.css", title: "描边宽度", family: "border-*", test: (p) => p.startsWith("border/") },
  { file: "shadow-semantic.css", title: "阴影几何", family: "shadow-*", test: (p) => p.startsWith("elevation/") },
  { file: "z-index-semantic.css", title: "层级", family: "z-*", test: (p) => p.startsWith("z/") },
  { file: "opacity-semantic.css", title: "透明度", family: "opacity-*", test: (p) => p.startsWith("opacity/") },
  { file: "size-semantic.css", title: "图标与媒体尺寸", family: "size-*", test: (p) => p.startsWith("icon/") || p.startsWith("media/") },
  { file: "duration-semantic.css", title: "时长", family: "duration-*", test: (p) => p.startsWith("motion/duration/") },
  { file: "ease-semantic.css", title: "缓动", family: "ease-*", test: (p) => p.startsWith("motion/easing/") },
  { file: "breakpoint-semantic.css", title: "断点", family: "sm: / md: / …", test: (p) => p.startsWith("layout/breakpoint/") },
  { file: "layout-semantic.css", title: "布局常量", family: "—（DS 特有）", test: (p) => p.startsWith("layout/") },
  { file: "typography-semantic.css", title: "排版角色", family: "text-* / font-* / leading-* / tracking-*", test: () => false },
  { file: "spacing-semantic.css", title: "间距", family: "gap-* / p-* / h-*", test: () => true },
];

function routeOf(tokenPath, collection) {
  if (collection === "vx-Typography") return ROUTES.find((r) => r.file === "typography-semantic.css");
  return ROUTES.find((r) => r.test(tokenPath));
}

/**
 * 需要拆出 T1 原子刻度的命名空间。
 *
 * 这五组本质是**无意义的值刻度**（`--radius-md: 6px` 只是阶梯上的一格），
 * 与 color / spacing / typography 同级，本就该在 T1；此前全挂在 T2，
 * 导致 T1 只剩三类、而 T2 里刻度与语义混杂，分层边界不清。
 *
 * 拆分后：T1 持有取值，T2 只持有组件消费的名字并引用 T1。这样
 * 「T3/T4 只接触 T2」的规则得以保持，且将来若要在某个命名空间上加语义
 * 中间层（如 shadcn 的 --radius 总旋钮），有现成的位置。
 */
const PRIMITIVE_NAMESPACES = {
  "radius-semantic.css": { file: "radius-primitive.css", prefix: "--vx-radius", title: "圆角" },
  "border-semantic.css": {
    file: "border-width-primitive.css",
    prefix: "--vx-border-width",
    title: "描边宽度",
  },
  "shadow-semantic.css": { file: "shadow-primitive.css", prefix: "--vx-shadow", title: "阴影几何" },
  "opacity-semantic.css": { file: "opacity-primitive.css", prefix: "--vx-opacity", title: "透明度" },
  "breakpoint-semantic.css": {
    file: "breakpoint-primitive.css",
    prefix: "--vx-breakpoint",
    title: "断点",
  },
  // 这两组不在最初拟定的清单里，但按同一判据（名字是纯档位）同样属 T1。
  "duration-semantic.css": { file: "duration-primitive.css", prefix: "--vx-duration", title: "时长" },
  "ease-semantic.css": { file: "ease-primitive.css", prefix: "--vx-ease", title: "缓动曲线" },
  // ⚠ size（icon/media）不在此列：`--icon-md` 里的 "icon" 携带含义，不是阶梯上的一格，
  //   故不属 T1；也不属 T3——图标尺寸跨组件复用（Button / Alert / Table 都用），
  //   放进组件层意味着每族各存一份。它是 T2 语义名，引用 T1 的长度刻度。
};

// 间距合并表与 T3 生成器共用，理由见 spacing-merge.mjs。

/**
 * T1 一律裸值，**不得引用其他 T1**。
 *
 * 设计稿称"圆角与间距同为长度量纲，共用一条阶"，但量纲相同不等于因果相关：
 * 若把间距基准从 4px 改为 8px，圆角与阴影模糊半径不应跟着翻倍——圆角是视觉风格，
 * 间距是节奏，数值重合而已。Tailwind 与 shadcn 都把两者当互相独立的原子刻度。
 * 且"原子引用原子"本身自相矛盾：原子的定义就是不依赖他物。
 *
 * 取值落在 4px 栅格上这件事由 assertOnGrid 保证，而非靠 var() 强行绑定。
 */
function resolveToLiteral(value, t1Literals) {
  const m = /^var\((--[\w-]+)\)$/.exec(value);
  return m && t1Literals.has(m[1]) ? t1Literals.get(m[1]) : value;
}

/** T2 变量名 → T1 阶梯名。opacity 特殊：用数值作阶名，与 Tailwind 的 0~100 刻度同构。 */
function primitiveStep(t2Name, value, prefix) {
  if (prefix === "--vx-opacity") {
    return `${prefix}-${Math.round(Number(value) * 100)}`;
  }
  const stripped = t2Name
    .replace(/^--(layout-)?/, "")
    .replace(/^(radius|border-width|elevation|opacity|breakpoint|duration|ease)-?/, "");
  return `${prefix}-${stripped}`;
}

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
    // 排版原子按 Tailwind theme 命名空间命名，而非 CSS 属性名：
    // lineHeight→leading、letterSpacing→tracking、size→text、family/stack→font。
    const prefix =
      { lineHeight: "leading", letterSpacing: "tracking", size: "text" }[group] ??
      `font-${kebab(group)}`;
    return `--vx-${prefix}-${name}`;
  }
  return null;
}

/** 递归扫描 foundation/（含 typography/ 子目录）→ 变量名 → 字面值。 */
function loadT1() {
  const literals = new Map();
  const walk = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) {
        walk(full);
      } else if (f.name.endsWith(".css")) {
        for (const m of readFileSync(full, "utf8").matchAll(/^\s*(--vx-[\w-]+):\s*([^;]+);/gm)) {
          literals.set(m[1], m[2].trim());
        }
      }
    }
  };
  walk(FOUNDATION);
  return literals;
}

const t1Literals = loadT1();
const t1Vars = new Set(t1Literals.keys());
const derived = [];
const overridden = [];
const radiusRemapped = [];
const radiusDropped = [];
const renamedVars = [];
const scaleDeviated = [];
const added = [];
const errors = [];

/** 裸值 → CSS 值。数值一律去浮点噪声：导出里 0.45 存成 0.44999998807907104。 */
function literal(tokenPath, value) {
  if (typeof value === "string") return value;
  if (typeof value !== "number") return null;
  const n = Number(value.toFixed(4));
  if (UNITLESS.test(tokenPath) || /fontWeight$/.test(tokenPath)) return String(n);
  if (MS.test(tokenPath)) return `${n}ms`;
  return `${n}px`;
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
    const renamed = renamedVar(tokenPath);
    const name = remapped ? `--radius-${remapped}` : (renamed ?? derivedName(tokenPath));
    if (remapped) radiusRemapped.push(`${tokenPath} → --radius-${remapped}`);
    if (renamed) renamedVars.push(`${tokenPath} → ${renamed}`);
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
      // DTCG 字符串别名（`{layout.container.lg}`）没有 aliasData 扩展，
      // 早先被当裸值原样输出，产出了无效 CSS。此处解析为 var() 引用。
      const aliasVar = dtcgAlias(token.$value);
      if (aliasVar) {
        rows.push([name, `var(${aliasVar})`, tokenPath]);
        continue;
      }
      // 页面层级恒等于同名断点——恢复严格对应后两者逐档同值，写死两份字面量必然漂移，
      // 故显式别名。这也让"页面最大宽度跟随断点"这条规则在产物里自解释。
      const pageStep = /^layout\/container\/(.+)$/.exec(tokenPath);
      if (pageStep) {
        rows.push([name, `var(--layout-breakpoint-${pageStep[1]})`, tokenPath]);
        continue;
      }
      const override = SCALE_DEVIATIONS[tokenPath];
      if (override) scaleDeviated.push(`${tokenPath}: ${token.$value} → ${override.value}（${override.why}）`);
      const value = literal(tokenPath, override ? override.value : token.$value);
      if (value === null) {
        errors.push(`${collection}/${tokenPath}: 无法表达的裸值 ${JSON.stringify(token.$value)}`);
        continue;
      }
      rows.push([name, value, tokenPath, override?.why]);
    }
  }

  // DS 增补：设计稿没有、但工程上必需的 token。逐条留痕并回报设计侧。
  for (const [tokenPath, add] of Object.entries(SCALE_ADDITIONS)) {
    if (!tokenPath.startsWith(`${collection.replace(/^vx-/, "").toLowerCase()}/`)) {
      const owner = tokenPath.split("/")[0];
      if (!rows.some(([, , p]) => p.startsWith(`${owner}/`))) continue;
    }
    if (rows.some(([, , p]) => p === tokenPath)) continue;
    const value = add.alias ? `var(${add.alias})` : literal(tokenPath, add.value);
    added.push(`${tokenPath} = ${value}（${add.why}）`);
    rows.push([derivedName(tokenPath), value, tokenPath, add.why]);
  }
  return rows;
}

/**
 * 应用间距族合并：七个族折叠为 `--spacing-*`（取 base 族的阶梯），
 * 高度族改挂 `--spacing-<kind>-*` 以便注册进 v4 的单一 spacing 命名空间。
 */
function mergeSpacing(rows) {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const [name, value, tokenPath, why] = row;
    const fam = tokenPath.split("/").slice(0, -1).join("-");
    const step = tokenPath.split("/").pop();

    if (SPACING_MERGED.includes(fam)) {
      if (fam !== SPACING_BASE) continue; // 非基准族整族丢弃
      const merged = `--space-${step}`;
      if (seen.has(merged)) continue;
      seen.add(merged);
      out.push([merged, value, tokenPath, why]);
      continue;
    }
    const kind = SPACING_HEIGHTS[fam];
    if (kind) {
      out.push([`--space-${kind}-${step}`, value, tokenPath, why]);
      continue;
    }
    out.push(row);
  }
  return out;
}

/** 渲染前的最后一道断言：同一块内不得出现重名，防止改名逻辑引入静默覆盖。 */
function assertUnique(rows, label) {
  const seen = new Set();
  for (const [name] of rows) {
    if (seen.has(name)) errors.push(`${label}: ${name} 在同一块内重复声明`);
    seen.add(name);
  }
}

/**
 * 排版角色的行高改为**无单位比值**（行高 px / 字号 px）。
 *
 * 设计稿存的是绝对 px（Figma 行高字段限制）。常规使用下比值与 px 计算结果相同，
 * 但比值能扛住浏览器缩放与 rem 覆写，且与 Tailwind 的 --text-*--line-height 同构
 * （Tailwind 也是每字号自带比值，另有独立 --leading-* 供覆写）。
 *
 * 各角色比值并不相同（1.167 / 1.200 / 1.429…）——大字号收紧行距是排版惯例，
 * 故**不可能**引用一条固定倍数刻度；T1 的 --vx-font-line-height-* 是给作者
 * 直接覆写用的，与角色行高是两件事。
 */
function toLineHeightRatio(rows) {
  const sizeOf = new Map();
  for (const [, value, tokenPath] of rows) {
    if (!tokenPath.endsWith("/fontSize")) continue;
    const m = /var\(--vx-text-([\w-]+)\)/.exec(value);
    if (m) sizeOf.set(tokenPath.replace(/\/fontSize$/, ""), m[1]);
  }
  // T1 字号已改 rem（跟随浏览器字号设置）；此处换算回 px 以求行高比例，
  // 基准 16px 即 rem 的定义值。
  const px = {};
  for (const m of readFileSync(path.join(FOUNDATION, "typography/text-primitive.css"), "utf8")
    .matchAll(/--vx-text-([\w-]+):\s*([\d.]+)rem/g)) {
    px[m[1]] = Number(m[2]) * 16;
  }

  return rows.map((row) => {
    const [name, value, tokenPath, why] = row;
    if (!tokenPath.endsWith("/lineHeight")) return row;
    const step = sizeOf.get(tokenPath.replace(/\/lineHeight$/, ""));
    const lh = /^(\d+(?:\.\d+)?)px$/.exec(value);
    if (!step || !px[step] || !lh) return row;
    return [name, String(Number((+lh[1] / px[step]).toFixed(4))), tokenPath, why];
  });
}

/**
 * z-index 必须逐档互异——同值时叠放次序取决于 DOM 顺序而非设计意图，
 * 是静默的层级 bug。设计稿曾出现两组同值（drawer=modal、notification=toast）。
 */
function assertZIndexDistinct(rows) {
  const byValue = new Map();
  for (const [name, value, tokenPath] of rows) {
    if (!tokenPath.startsWith("z/")) continue;
    if (byValue.has(value)) {
      errors.push(`z-index 同值：${byValue.get(value)} 与 ${name} 都是 ${value}——叠放次序未定义`);
    }
    byValue.set(value, name);
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

/** route.file → [[selector, rows], …]，按命名空间归集，模式结构随来源集合。 */
const byRoute = new Map();
const sources = new Map();

for (const col of COLLECTIONS) {
  const files = readdirSync(path.join(EXPORT_DIR, col.name)).filter((f) => f.endsWith(".json"));
  const modes = col.modes ?? [[null, ":root"]];

  for (const [mode, selector] of modes) {
    const file = mode ? files.find((f) => f.startsWith(`${mode}.`)) : files[0];
    if (!file) {
      errors.push(`${col.name}: 缺少模式文件 ${mode}.tokens.json`);
      continue;
    }
    const rows = buildRows(col.name, file);
    const rows2 = mergeSpacing(toLineHeightRatio(rows));
    assertUnique(rows2, mode ? `${col.name}/${mode}` : col.name);
    assertZIndexDistinct(rows2);

    // 按命名空间分流。一个集合可能横跨多个路由（vx-Shape → radius + border）。
    const grouped = new Map();
    for (const row of rows2) {
      const route = routeOf(row[2], col.name);
      if (!grouped.has(route.file)) grouped.set(route.file, []);
      grouped.get(route.file).push(row);
    }
    for (const [file_, group] of grouped) {
      if (!byRoute.has(file_)) byRoute.set(file_, []);
      byRoute.get(file_).push([selector, group]);
      if (!sources.has(file_)) sources.set(file_, new Set());
      sources.get(file_).add(col.name);
    }
  }
}

const outputs = [];
const stats = [];

for (const route of ROUTES) {
  const blocks = byRoute.get(route.file);
  if (!blocks) continue;

  // 拆 T1：这些命名空间的取值移入原子层，T2 只留引用。
  const primitive = PRIMITIVE_NAMESPACES[route.file];
  if (primitive) {
    const atoms = [];
    const seenAtom = new Set();
    for (const [, rows] of blocks) {
      for (const row of rows) {
        const [name, value] = row;
        const atom = primitiveStep(name, value, primitive.prefix);
        if (!seenAtom.has(atom)) {
          seenAtom.add(atom);
          // T1 落裸值：把对其他 T1 的引用就地解开。
          atoms.push([atom, resolveToLiteral(value, t1Literals), row[2]]);
        }
        row[1] = `var(${atom})`; // T2 改为引用 T1
      }
    }
    outputs.push([
      primitive.file,
      header(
        { file: primitive.file, label: `${primitive.title}（T1 原子刻度）` },
        [...sources.get(route.file)].join(" / "),
      ) + `\n:root {\n${atoms.map(([n, v]) => `  ${n}: ${v};`).join("\n")}\n}\n`,
      atoms.length,
    ]);
    stats.push(`${primitive.file.replace("-primitive.css", "")}(T1) ${atoms.length}`);
  }

  // radius / duration / ease 的 T2 名已等于 Tailwind theme 名，直接写进 @theme：
  // 一处声明即完成注册。若改由 theme.css 再注册一次，会写出指向自己的声明
  // （形如 duration-fast 引用 duration-fast），CSS 判定为循环、变量整个失效且不报错。
  const SELF_NAMED = new Set(["radius-semantic.css", "duration-semantic.css", "ease-semantic.css"]);
  // 用 `@theme` 而非 `@theme inline`：inline 会把值内联展开，而这里的值是指向 T1 的
  // var() 引用，内联时解析不到、工具类不会生成。这三族无模式轴，本就不需要 inline。
  const wrapper = SELF_NAMED.has(route.file) ? "@theme" : null;
  const body = blocks
    .map(([selector, rows]) => `${wrapper ?? selector} {\n${render(rows)}\n}`)
    .join("\n\n");
  const count = blocks[0][1].length;
  outputs.push([
    route.file,
    header(
      { file: route.file, label: `${route.title}（工具类族 ${route.family}）` },
      [...sources.get(route.file)].join(" / "),
    ) +
      "\n" +
      `${body}\n`,
  ]);
  stats.push(`${route.file.replace("-semantic.css", "")} ${count}`);
}

if (errors.length > 0) {
  console.error("T2 非色彩层生成失败：\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

/** T1 原子刻度落 foundation/，T2 语义落 semantic/。 */
const dirFor = (name) => (name.endsWith("-primitive.css") ? FOUNDATION : OUT_DIR);

if (CHECK) {
  const stale = outputs.filter(([name, css]) => {
    try {
      return readFileSync(path.join(dirFor(name), name), "utf8") !== css;
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
  for (const [name, css] of outputs) writeFileSync(path.join(dirFor(name), name), css, "utf8");
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
