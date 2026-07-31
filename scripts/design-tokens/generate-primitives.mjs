#!/usr/bin/env node

/**
 * generate-primitives.mjs — 由 Figma DTCG 导出生成 T1 原子层 CSS。
 *
 * 源：packages/design/design-system/Figma-Token/vx-Color-Primitive/
 * 出：packages/design/design-system/src/styles/foundation/primitives.css
 *
 * T1 定义见 docs/10-standards/060-design-system.md §1.1。
 *
 * ⚠ 导出有损：若某步阶下挂了 alpha 变体（如 color/emerald/600/alpha-08），
 *   Figma 会把该步阶降级为「组」，其不透明本体值不再作为独立 token 导出。
 *   本脚本从任一 alpha 子项的 hex 字段回收本体值——alpha 子项与本体同色，
 *   仅 alpha 通道不同。
 *
 * 用法：
 *   node scripts/design-tokens/generate-primitives.mjs
 *   node scripts/design-tokens/generate-primitives.mjs --check   # 只校验不写入
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

const EXPORT_DIR = path.join(ROOT, "packages/design/design-system/Figma-Token");
const SOURCE = path.join(
  EXPORT_DIR,
  "vx-Color-Primitive/vx-Color-Primitive.tokens.json",
);
const TARGET = path.join(
  ROOT,
  "packages/design/design-system/src/styles/foundation/primitives.css",
);

/** 色相输出顺序与分组说明。未列出的色相追加在末尾。 */
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

function flatten(node, prefix = "", out = []) {
  for (const key of Object.keys(node)) {
    if (key.startsWith("$")) continue;
    const value = node[key];
    if (!value || typeof value !== "object") continue;
    const next = prefix ? `${prefix}/${key}` : key;
    if ("$value" in value) out.push([next, value.$value]);
    if (Object.keys(value).some((k) => !k.startsWith("$"))) {
      flatten(value, next, out);
    }
  }
  return out;
}

/** color/brand/main/600 → {hue:"brand", step:"600"}；color/neutral/600/alpha-08 → {…, alpha:"08"} */
function parsePath(tokenPath) {
  const body = tokenPath.replace(/^color\//, "").replace(/^brand\/main\//, "brand/");
  const parts = body.split("/");
  const hue = parts[0];
  if (parts.length === 2) return { hue, step: parts[1] };
  if (parts.length === 3 && parts[2].startsWith("alpha-")) {
    return { hue, step: parts[1], alpha: parts[2].slice("alpha-".length) };
  }
  return null;
}

function toRgba(value) {
  const [r, g, b] = value.components.map((c) => Math.round(c * 255));
  return `rgb(${r} ${g} ${b} / ${Number(value.alpha.toFixed(4))})`;
}

/** 收集所有非原子集合里 aliasData 指向的原子名——这是回收值的唯一旁证。 */
function collectReferencedPrimitives() {
  const referenced = new Set();
  const walkAlias = (node) => {
    if (!node || typeof node !== "object") return;
    const target =
      node?.$extensions?.["com.figma.aliasData"]?.targetVariableName;
    if (typeof target === "string" && target.startsWith("color/")) {
      referenced.add(target);
    }
    for (const key of Object.keys(node)) {
      if (!key.startsWith("$") || key === "$extensions") walkAlias(node[key]);
    }
  };
  for (const dir of readdirSync(EXPORT_DIR)) {
    if (dir === "vx-Color-Primitive") continue;
    for (const file of readdirSync(path.join(EXPORT_DIR, dir))) {
      if (!file.endsWith(".json")) continue;
      walkAlias(JSON.parse(readFileSync(path.join(EXPORT_DIR, dir, file), "utf8")));
    }
  }
  return referenced;
}

const tokens = flatten(JSON.parse(readFileSync(SOURCE, "utf8")));

/** hue → step → { hex, source: "direct"|"recovered", alphas: Map<alphaKey, cssValue> } */
const palette = new Map();
const recovered = [];
const errors = [];

for (const [tokenPath, value] of tokens) {
  if (!value || typeof value !== "object" || !value.hex) continue;
  const parsed = parsePath(tokenPath);
  if (!parsed) continue;
  const { hue, step, alpha } = parsed;
  if (!palette.has(hue)) palette.set(hue, new Map());
  const steps = palette.get(hue);
  if (!steps.has(step)) {
    steps.set(step, { hex: null, source: null, alphas: new Map(), alphaHexes: new Set() });
  }
  const entry = steps.get(step);
  if (alpha) {
    entry.alphas.set(alpha, toRgba(value));
    entry.alphaHexes.add(value.hex.toLowerCase());
  } else {
    entry.hex = value.hex.toLowerCase();
    entry.source = "direct";
  }
}

// 回收被导出降级为「组」的不透明本体值，并对每一步做断言。
const referencedPrimitives = collectReferencedPrimitives();
const toFigmaPath = (hue, step) =>
  hue === "brand" ? `color/brand/main/${step}` : `color/${hue}/${step}`;

for (const [hue, steps] of palette) {
  for (const [step, entry] of steps) {
    if (entry.hex) continue;
    if (entry.alphaHexes.size === 0) continue;

    // 断言 1：同一步阶下所有 alpha 变体必须同色，否则本体值无从判定。
    if (entry.alphaHexes.size > 1) {
      errors.push(
        `${toFigmaPath(hue, step)}: alpha 变体色值不一致（${[...entry.alphaHexes].join(", ")}），无法回收不透明本体值`,
      );
      continue;
    }

    // 断言 2：回收出的本体必须真的被某个 L2/L3 token 引用，
    // 否则说明该步阶在 Figma 中并无不透明本体，不得凭空生成。
    const figmaPath = toFigmaPath(hue, step);
    if (!referencedPrimitives.has(figmaPath)) {
      errors.push(
        `${figmaPath}: 导出中只有 alpha 变体，且无任何 L2/L3 引用该步阶本体——拒绝凭空生成`,
      );
      continue;
    }

    entry.hex = [...entry.alphaHexes][0];
    entry.source = "recovered";
    recovered.push(figmaPath);
  }
}

// 断言 3：凡被 L2/L3 引用的原子，生成物必须覆盖。
const emittedPaths = new Set();
for (const [hue, steps] of palette) {
  for (const [step, entry] of steps) {
    if (entry.hex) emittedPaths.add(toFigmaPath(hue, step));
    for (const alphaKey of entry.alphas.keys()) {
      emittedPaths.add(`${toFigmaPath(hue, step)}/alpha-${alphaKey}`);
    }
  }
}
for (const ref of referencedPrimitives) {
  if (!emittedPaths.has(ref)) errors.push(`${ref}: 被引用但未生成`);
}

if (errors.length > 0) {
  console.error("T1 生成失败——导出结构不满足断言：\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const orderedHues = [
  ...HUE_ORDER.filter(([hue]) => palette.has(hue)),
  ...[...palette.keys()]
    .filter((hue) => !HUE_ORDER.some(([h]) => h === hue))
    .map((hue) => [hue, ""]),
];

const stepRank = (step) => (/^\d+$/.test(step) ? Number(step) : -1);

let emitted = 0;
const blocks = orderedHues.map(([hue, note]) => {
  const steps = [...palette.get(hue).entries()].sort(
    (a, b) => stepRank(a[0]) - stepRank(b[0]),
  );
  const lines = [];
  for (const [step, entry] of steps) {
    const base = hue === "base" ? `--vx-color-base-${step}` : `--vx-color-${hue}-${step}`;
    if (entry.hex) {
      lines.push(`  ${base}: ${entry.hex};`);
      emitted += 1;
    }
    for (const [alphaKey, cssValue] of [...entry.alphas].sort()) {
      lines.push(`  ${base}-alpha-${alphaKey}: ${cssValue};`);
      emitted += 1;
    }
  }
  return `${note ? `  /* ${note}。 */\n` : ""}${lines.join("\n")}`;
});

const output = `/**
 * foundation/primitives.css - T1 原子层。
 * @package @vxture/design-system
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-07-31
 *
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 *   源：Figma-Token/vx-Color-Primitive/vx-Color-Primitive.tokens.json
 *   生成：node scripts/design-tokens/generate-primitives.mjs
 *
 * T1 定义见 docs/10-standards/060-design-system.md §1.1。
 * 色相清单承 Figma，**不含 rose**（设计稿未使用）。
 *
 * ⚠ 不得改用 Tailwind v4 内置 --color-<hue>-<step>：v4 调色板已迁 P3 广色域，
 *   饱和色与设计稿不等值（red-600 #dc2626 vs v4 #e7000b 等）。中性色两者等值。
 *
 * 约束：
 * - T1 不进 package exports，应用侧禁止引用。
 * - hue → intent 的映射属 T2，不在本层表达。
 */

:root {
${blocks.join("\n\n")}
}
`;

if (CHECK) {
  const current = readFileSync(TARGET, "utf8");
  if (current !== output) {
    console.error(
      "T1 原子层与 Figma 导出不同步。运行：node scripts/design-tokens/generate-primitives.mjs",
    );
    process.exit(1);
  }
  console.log(`T1 原子层与 Figma 导出一致（${emitted} tokens）`);
} else {
  writeFileSync(TARGET, output, "utf8");
  console.log(
    `已生成 ${path.relative(ROOT, TARGET).replaceAll("\\", "/")}：${emitted} tokens / ${orderedHues.length} 色相`,
  );
  console.log(
    `断言通过：回收本体值 ${recovered.length} 项（均有 L2/L3 引用佐证）；` +
      `被引用原子 ${referencedPrimitives.size} 项全部覆盖。`,
  );
}
