#!/usr/bin/env node

/**
 * generate-primitives.mjs — 由 Figma DTCG 导出生成 T1 原子层 CSS。
 *
 * ⚠ 这是一次性**迁移工具**，不是常驻管线。
 *   `packages/design/design-system/Figma-Token/` 是过程文件：Figma 首次播种用。
 *   迁移完成（T1/T2/T3 全部落入 src/styles）后，过程文件与本脚本一并退役，
 *   此后 DS 包自身即唯一真值源。权威边界见 docs/10-standards/065-design-token-pipeline.md。
 *
 * 出：src/styles/foundation/{color,spacing,typography}-primitive.css
 *
 * 用法：
 *   node scripts/design-tokens/generate-primitives.mjs
 *   node scripts/design-tokens/generate-primitives.mjs --check   # 只校验不写入
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { PRIMITIVE_ADDITIONS } from "./deviations.mjs";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

const PKG = path.join(ROOT, "packages/design/design-system");
const EXPORT_DIR = path.join(PKG, "Figma-Token");
const OUT_DIR = path.join(PKG, "src/styles/foundation");

const HEADER_NOTE = `
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 *   生成：node scripts/design-tokens/generate-primitives.mjs
 *   源：Figma-Token/（过程文件，迁移完成后删除；届时本文件转为手工维护的真值源）
 *
 * T1 定义见 docs/10-standards/060-design-system.md §1.1。
 * 构建规范见 docs/10-standards/065-design-token-pipeline.md。`;

function header(title, extra = "") {
  return `/**
 * ${title}
 * @package @vxture/design-system
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-07-31
 *${HEADER_NOTE}${extra}
 */
`;
}

function loadCollection(name) {
  const dir = path.join(EXPORT_DIR, name);
  const file = readdirSync(dir).find((f) => f.endsWith(".json"));
  return JSON.parse(readFileSync(path.join(dir, file), "utf8"));
}

function flatten(node, prefix = "", out = []) {
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const value = node[key];
    if (!value || typeof value !== "object") continue;
    const next = prefix ? `${prefix}/${key}` : key;
    if ("$value" in value) out.push([next, value.$value]);
    if (Object.keys(value).some((k) => !k.startsWith("$"))) flatten(value, next, out);
  }
  return out;
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const trim = (n) => Number(n.toFixed(4));

/* ─────────────────────────── 1. color ─────────────────────────── */

function parseColorPath(tokenPath) {
  const body = tokenPath.replace(/^color\//, "").replace(/^brand\/main\//, "brand/");
  const parts = body.split("/");
  if (parts.length === 2) return { hue: parts[0], step: parts[1] };
  if (parts.length === 3 && parts[2].startsWith("alpha-")) {
    return { hue: parts[0], step: parts[1], alpha: parts[2].slice(6) };
  }
  return null;
}

const HUE_ORDER = [
  ["base", "黑白基点"],
  ["neutral", "中性阶。取代既有 gray-*（带蓝调），切换由 T2 执行"],
  ["brand", "品牌阶。Vxture 唯一自定义色相"],
  ["emerald", "成功 / 健康态"],
  ["amber", "警告态"],
  ["red", "危险态。设计稿用 red，非既有代码的 rose"],
  ["sky", "信息态"],
  ["purple", "AI 专属"],
  ["cyan", "与 AI 主色成对使用的青色层次"],
  ["orange", "图表分类色"],
  ["teal", "图表分类色"],
  ["fuchsia", "图表分类色"],
  ["lime", "图表分类色"],
];

/** 收集非原子集合中 aliasData 指向的原子名——回收值的唯一旁证。 */
function collectReferencedPrimitives() {
  const referenced = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    const target = node?.$extensions?.["com.figma.aliasData"]?.targetVariableName;
    if (typeof target === "string" && target.startsWith("color/")) referenced.add(target);
    for (const key of Object.keys(node)) {
      if (!key.startsWith("$") || key === "$extensions") walk(node[key]);
    }
  };
  for (const dir of readdirSync(EXPORT_DIR)) {
    if (dir === "vx-Color-Primitive") continue;
    for (const file of readdirSync(path.join(EXPORT_DIR, dir))) {
      if (file.endsWith(".json")) {
        walk(JSON.parse(readFileSync(path.join(EXPORT_DIR, dir, file), "utf8")));
      }
    }
  }
  return referenced;
}

function buildColor() {
  const errors = [];
  const palette = new Map();

  for (const [tokenPath, value] of flatten(loadCollection("vx-Color-Primitive"))) {
    if (!value || typeof value !== "object" || !value.hex) continue;
    const parsed = parseColorPath(tokenPath);
    if (!parsed) continue;
    const { hue, step, alpha } = parsed;
    if (!palette.has(hue)) palette.set(hue, new Map());
    const steps = palette.get(hue);
    if (!steps.has(step)) steps.set(step, { hex: null, alphas: new Map(), alphaHexes: new Set() });
    const entry = steps.get(step);
    if (alpha) {
      const [r, g, b] = value.components.map((c) => Math.round(c * 255));
      entry.alphas.set(alpha, `rgb(${r} ${g} ${b} / ${trim(value.alpha)})`);
      entry.alphaHexes.add(value.hex.toLowerCase());
    } else {
      entry.hex = value.hex.toLowerCase();
    }
  }

  const referenced = collectReferencedPrimitives();
  const figmaPath = (hue, step) =>
    hue === "brand" ? `color/brand/main/${step}` : `color/${hue}/${step}`;
  let recoveredCount = 0;

  for (const [hue, steps] of palette) {
    for (const [step, entry] of steps) {
      if (entry.hex || entry.alphaHexes.size === 0) continue;
      // 断言 1：同一步阶下 alpha 变体必须同色，否则本体值无从判定。
      if (entry.alphaHexes.size > 1) {
        errors.push(
          `${figmaPath(hue, step)}: alpha 变体色值不一致（${[...entry.alphaHexes].join(", ")}）`,
        );
        continue;
      }
      // 断言 2：回收出的本体必须真被引用，否则不得凭空生成。
      if (!referenced.has(figmaPath(hue, step))) {
        errors.push(`${figmaPath(hue, step)}: 只有 alpha 变体且无引用——拒绝凭空生成`);
        continue;
      }
      entry.hex = [...entry.alphaHexes][0];
      recoveredCount += 1;
    }
  }

  // 断言 3：凡被引用的原子，生成物必须覆盖。
  const emitted = new Set();
  for (const [hue, steps] of palette) {
    for (const [step, entry] of steps) {
      if (entry.hex) emitted.add(figmaPath(hue, step));
      for (const a of entry.alphas.keys()) emitted.add(`${figmaPath(hue, step)}/alpha-${a}`);
    }
  }
  for (const ref of referenced) if (!emitted.has(ref)) errors.push(`${ref}: 被引用但未生成`);

  if (errors.length > 0) {
    console.error("T1 color 生成失败——导出结构不满足断言：\n");
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  const order = [
    ...HUE_ORDER.filter(([h]) => palette.has(h)),
    ...[...palette.keys()].filter((h) => !HUE_ORDER.some(([x]) => x === h)).map((h) => [h, ""]),
  ];
  const rank = (s) => (/^\d+$/.test(s) ? Number(s) : -1);
  let count = 0;

  const blocks = order.map(([hue, note]) => {
    const lines = [];
    for (const [step, entry] of [...palette.get(hue)].sort((a, b) => rank(a[0]) - rank(b[0]))) {
      const base = hue === "base" ? `--vx-color-base-${step}` : `--vx-color-${hue}-${step}`;
      if (entry.hex) {
        lines.push(`  ${base}: ${entry.hex};`);
        count += 1;
      }
      for (const [a, v] of [...entry.alphas].sort()) {
        lines.push(`  ${base}-alpha-${a}: ${v};`);
        count += 1;
      }
    }
    return `${note ? `  /* ${note}。 */\n` : ""}${lines.join("\n")}`;
  });

  const css =
    header(
      "foundation/color-primitive.css - T1 原子层 · 色彩。",
      `
 *
 * ⚠ 不得改用 Tailwind v4 内置 --color-<hue>-<step>：v4 调色板已迁 P3 广色域，
 *   饱和色与设计稿不等值（red-600 #dc2626 vs v4 #e7000b 等）。中性色两者等值。
 *
 * 色相清单不含 rose——设计稿未使用。`,
    ) + `\n:root {\n${blocks.join("\n\n")}\n}\n`;

  return { css, count, recoveredCount, referencedCount: referenced.size };
}

/* ────────────────────────── 2. spacing ────────────────────────── */

function buildSpacing() {
  const entries = flatten(loadCollection("vx-Spacing-Primitive"))
    .filter(([p]) => p.startsWith("spacing/"))
    .map(([p, v]) => [p.slice("spacing/".length), v]);

  // 数值键在前按数值排，非数值键（px / 0-5 等小数键）随后
  const numeric = (k) => Number(k.replace("-", "."));
  const sorted = entries.sort(([a], [b]) => {
    const na = numeric(a);
    const nb = numeric(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return a.localeCompare(b);
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  });

  const lines = sorted.map(([k, v]) => `  --vx-spacing-${k}: ${v}px;`);
  const css =
    header(
      "foundation/spacing-primitive.css - T1 原子层 · 长度刻度。",
      `
 *
 * 长度量（间距、圆角、描边宽度、阴影 blur）一律别名本刻度，不允许裸值。
 * 键名 0-5 / 1-5 等代表 0.5 / 1.5 档（Figma 导出把小数点转为连字符）。`,
    ) + `\n:root {\n${lines.join("\n")}\n}\n`;

  return { css, count: lines.length };
}

/* ──────────────────────── 3. typography ──────────────────────── */

/** 含空格的字族名必须加引号，否则直接用于 font-family 时解析有歧义。 */
const quoteFamily = (v) => (/\s/.test(v) ? `"${v}"` : v);

/**
 * 排版原子按 Tailwind 命名空间拆成独立文件，与 T2 的分文件规则一致：
 * 一个命名空间对应一族工具类。
 *
 * 文件名即命名空间名——`font-*` / `text-*` / `weight-*` / `leading-*` /
 * `tracking-*`，与 Tailwind 的 theme 命名空间逐一对应。不用 `font-family` /
 * `font-size` 这类 CSS 属性名：属性名与命名空间并非一一对应（字号落在
 * `--text-*` 而非 `--font-size-*`），按属性命名会让人找错文件。
 */
const TYPE_GROUPS = [
  ["family", "字族", quoteFamily, "font-primitive.css", "font-family", "font-*"],
  ["stack", "完整字体栈（含 CJK 与系统回退）", (v) => v, "font-primitive.css", "font-stack", "font-*"],
  ["weight", "字重", (v) => String(v), "weight-primitive.css", "font-weight", "font-*"],
  ["lineHeight", "行高。导出为百分比×100，此处转为无单位倍数", (v) => String(trim(v / 100)), "leading-primitive.css", "leading", "leading-*"],
  // 字距用 em 而非 px：本系统有三档字号模式，px 字距不随字号缩放，大字号下会
  // 显得偏紧；em 自动跟随。设计稿只能存绝对值（Figma 字距字段限制），但按 16px
  // 基准换算后与 Tailwind 的 --tracking-* 逐档等值（-0.8px = -0.05em 等），
  // 说明设计意图本就是这套相对刻度。
  ["letterSpacing", "字距（em，随字号缩放）", (v) => `${trim(v / 16)}em`, "tracking-primitive.css", "tracking", "tracking-*"],
];

const addedPaths = [];

/**
 * 字号阶梯 —— **由 DS 认定，不取自设计稿**。
 *
 * 设计稿导出的是 Figma 的 12 档 px 值；DS 判定字号直接采用 Tailwind 的标准刻度：
 * - 用 rem 而非 px：能跟随用户浏览器字号设置，px 会把无障碍设置直接锁死；
 * - 档名与取值与 Tailwind 逐档一致，消除"同名不同值"的跨团队歧义。
 *
 * `3xs` / `2xs` 是 DS 扩展（Tailwind 最小档为 `xs`=12px），供密集表格与角标使用。
 *
 * 变量名为 `--vx-text-*` 而非裸 `--text-*`：后者是 Tailwind 的 theme 命名空间，
 * 在 `:root` 裸声明会覆盖内置字号刻度，并让产品绕开 T2 的 24 档角色直接用 T1。
 */
const FONT_SIZE_LADDER = [
  ["扩展档（Tailwind 无，供密集表格与角标）", [
    ["3xs", "0.5rem", 8],
    ["2xs", "0.625rem", 10],
  ]],
  ["Tailwind 标准档", [
    ["xs", "0.75rem", 12],
    ["sm", "0.875rem", 14],
    ["base", "1rem", 16],
    ["lg", "1.125rem", 18],
    ["xl", "1.25rem", 20],
    ["2xl", "1.5rem", 24],
    ["3xl", "1.875rem", 30],
    ["4xl", "2.25rem", 36],
    ["5xl", "3rem", 48],
    ["6xl", "3.75rem", 60],
    ["7xl", "4.5rem", 72],
    ["8xl", "6rem", 96],
    ["9xl", "8rem", 128],
  ]],
];

function buildFontSizes() {
  const blocks = [];
  let count = 0;
  // 声明宽度取全表最长，使两个分组的 px 注释对齐在同一列。
  const pad =
    Math.max(
      ...FONT_SIZE_LADDER.flatMap(([, steps]) =>
        steps.map(([step, rem]) => `--vx-text-${step}: ${rem};`.length),
      ),
    ) + 1;
  for (const [note, steps] of FONT_SIZE_LADDER) {
    const rows = steps.map(
      ([step, rem, px]) =>
        `  ${`--vx-text-${step}: ${rem};`.padEnd(pad)}/* ${px}px */`,
    );
    blocks.push(`  /* ${note}。 */\n${rows.join("\n")}`);
    count += steps.length;
  }
  return { blocks, count };
}

function buildTypography() {
  const all = flatten(loadCollection("vx-Typography-Primitive")).filter(([p]) =>
    p.startsWith("font/"),
  );

  for (const [tokenPath, { value }] of Object.entries(PRIMITIVE_ADDITIONS)) {
    if (all.some(([p]) => p === tokenPath)) continue; // 设计稿补上后自动让位
    all.push([tokenPath, value]);
    addedPaths.push(tokenPath);
  }

  /** file → { title, family, blocks[], count } */
  const files = new Map();
  for (const [group, note, format, file, prefix, family] of TYPE_GROUPS) {
    const picked = all.filter(([p]) => p.startsWith(`font/${group}/`));
    // 数值族按值排序，使补录档位落在阶梯正确位置而非追加在末尾；
    // 字族 / 字体栈是字符串，保持设计稿顺序。
    if (picked.length > 0 && picked.every(([, v]) => typeof v === "number")) {
      picked.sort((a, b) => a[1] - b[1]);
    }
    const rows = picked.map(
      ([p, v]) => `  --vx-${prefix}-${p.split("/").pop()}: ${format(v)};`,
    );
    if (rows.length === 0) continue;
    if (!files.has(file)) files.set(file, { family, blocks: [], count: 0 });
    const entry = files.get(file);
    entry.blocks.push(`  /* ${note}。 */\n${rows.join("\n")}`);
    entry.count += rows.length;
  }

  // 字号不走设计稿，由 DS 认定的 Tailwind 刻度直接产出。
  const sizes = buildFontSizes();
  files.set("text-primitive.css", {
    family: "text-*",
    blocks: sizes.blocks,
    count: sizes.count,
  });

  // 排版原子归入 foundation/typography/ 子目录——排版是一个大类，
  // 内部再分 font / text / weight / leading / tracking 五个命名空间。
  const outputs = [...files].map(([file, entry]) => [
    `typography/${file}`,
    header(`foundation/typography/${file} - T1 原子层 · 排版（工具类族 ${entry.family}）。`) +
      `\n:root {\n${entry.blocks.join("\n\n")}\n}\n`,
    entry.count,
  ]);
  return { outputs, count: [...files.values()].reduce((s, e) => s + e.count, 0) };
}

/* ─────────────────────────── 输出 ─────────────────────────── */

const color = buildColor();
const spacing = buildSpacing();
const typography = buildTypography();

const outputs = [
  ["color-primitive.css", color.css, color.count],
  ["spacing-primitive.css", spacing.css, spacing.count],
  ...typography.outputs,
];

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
      `T1 原子层与导出不同步：${stale.map(([n]) => n).join(", ")}\n` +
        "运行：node scripts/design-tokens/generate-primitives.mjs",
    );
    process.exit(1);
  }
  console.log(
    `T1 原子层一致（color ${color.count} · spacing ${spacing.count} · typography ${typography.count}）`,
  );
} else {
  for (const [name, css] of outputs) {
    mkdirSync(path.dirname(path.join(OUT_DIR, name)), { recursive: true });
    writeFileSync(path.join(OUT_DIR, name), css, "utf8");
  }
  console.log(
    `已生成 T1：color ${color.count} · spacing ${spacing.count} · typography ${typography.count}`,
  );
  console.log(
    `断言通过：回收本体值 ${color.recoveredCount} 项（均有引用佐证）；被引用原子 ${color.referencedCount} 项全部覆盖。`,
  );
  if (addedPaths.length > 0) {
    console.log(
      `⚠ 设计稿缺档，已由 DS 补齐（需回报设计侧补进设计稿）：${addedPaths.join(", ")}`,
    );
  }
}
