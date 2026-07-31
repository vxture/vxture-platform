#!/usr/bin/env node

/**
 * check-utilities.mjs — 实测 T2 注册确实产出可用的 Tailwind 工具类。
 *
 * 补的是一个结构性盲区：DS 包用 tsup 打包、**自身从不跑 Tailwind 编译**，
 * 所以「工具类没生成」这类问题在包内 build 全绿，只会在消费方构建时静默失效
 * ——失效方式是类名不产出，页面无样式，且不报错。
 *
 * 本脚本用 Tailwind 编译 API 真编一遍完整样式链，断言样例工具类确实存在。
 *
 * 用法：node scripts/design-tokens/check-utilities.mjs
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

// tailwindcss 不是本仓根 package.json 的直接依赖（由各 portal 持有），
// 故从 pnpm store 目录解析，而非 import 裸名。
const PNPM = path.join(ROOT, "node_modules/.pnpm");
const twDir = (await readdir(PNPM)).find((d) => /^tailwindcss@\d/.test(d));
if (!twDir) {
  console.error("未找到 tailwindcss 安装目录，跳过工具类实测。");
  process.exit(0);
}
const TW = path.join(PNPM, twDir, "node_modules/tailwindcss");
const { compile } = await import(
  new URL(`file://${path.join(TW, "dist/lib.mjs").split(path.sep).join("/")}`).href
);
const STYLES = path.join(ROOT, "packages/design/design-system/src/styles");

/** 每个已注册命名空间取一个代表，覆盖模式轴与变体。 */
const EXPECTED = [
  ["p-md", "间距（密度轴）"],
  ["gap-lg", "间距"],
  ["h-control-md", "控件高度"],
  ["h-row-lg", "行高度"],
  ["size-icon-md", "图标尺寸"],
  ["bg-primary", "语义色"],
  ["text-foreground", "语义色"],
  ["border-border", "语义色"],
  ["rounded-md", "圆角"],
  ["duration-fast", "时长"],
  ["ease-standard", "缓动"],
  ["md:p-lg", "断点变体"],
  ["dark:bg-card", "暗色变体"],
  ["text-body-md", "排版角色"],
  ["text-heading-1", "排版角色"],
  ["font-brand", "字体族"],
  ["font-mono", "字体族"],
  // 以下各族曾整族哑火（无对应 theme 命名空间 / 漏注册 / 只有几何分量），
  // 逐族留一个样例守住。
  ["duration-fast", "自定义工具类"],
  ["opacity-disabled", "自定义工具类"],
  ["border-thin", "自定义工具类"],
  ["z-modal", "自定义工具类"],
  ["shadow-1", "合成阴影"],
  ["max-w-page-lg", "内容宽度"],
];

/** 排版角色须一次落齐四个属性，只出 font-size 等于注册没生效。 */
const TEXT_ROLE_PROPS = ["font-size", "line-height", "letter-spacing", "font-weight"];

async function loadStylesheet(id, base) {
  if (id === "tailwindcss") {
    const p = path.join(TW, "index.css");
    return { path: p, base: TW, content: await readFile(p, "utf8") };
  }
  // 绝对路径直接用；相对路径按引用方目录解析；其余当作 tailwind 内部资源。
  const p = path.isAbsolute(id)
    ? id
    : id.startsWith(".")
      ? path.resolve(base, id)
      : path.join(TW, id);
  return { path: p, base: path.dirname(p), content: await readFile(p, "utf8") };
}

const entry = [
  '@import "tailwindcss";',
  `@import "${path.join(STYLES, "tokens.css").split(path.sep).join("/")}";`,
].join("\n");

const compiled = await compile(entry, { base: ROOT, loadStylesheet });

/**
 * 判定工具类是否真的产出。
 *
 * ⚠ 不能用 `out.includes("duration-fast")`：`:root` 里的 `--duration-fast:` 声明
 *   含同样的子串，未生成工具类也会判过。`duration-fast` 就是这么假绿了一轮的
 *   ——`--duration-*` 根本不是 v4 命名空间，工具类从未产出。
 *   故必须在 `@layer utilities` 内匹配**类选择器**。
 */
function generated(util) {
  const out = compiled.build([util]);
  const i = out.indexOf("@layer utilities {");
  if (i < 0) return false;
  return out.slice(i).includes(`.${util.replace(/:/g, "\\:")} {`);
}

const missing = EXPECTED.filter(([u]) => !generated(u));

if (missing.length > 0) {
  console.error("工具类未生成——T2 注册有缺口：\n");
  for (const [u, note] of missing) console.error(`  ✗ ${u}  （${note}）`);
  console.error("\n检查 src/styles/theme.css 的 @theme 注册，以及被引用变量是否在链路中声明。");
  process.exit(1);
}

// `--text-*` 的修饰子键写错时工具类仍会生成，只是少落几个属性——
// 只断言类名存在会漏掉这种半哑火，故单独校验属性齐备。
const roleOut = compiled.build(["text-body-md"]);
const roleCss = roleOut.slice(roleOut.indexOf("@layer utilities {"));
const lacking = TEXT_ROLE_PROPS.filter((p) => !roleCss.includes(`${p}:`));
if (lacking.length > 0) {
  console.error(`text-body-md 只落了部分属性，缺：${lacking.join(" / ")}`);
  console.error("检查 generate-theme.mjs 的 `--text-<role>--<modifier>` 子键拼写。");
  process.exit(1);
}

console.log(
  `工具类实测通过（${EXPECTED.length} 个样例全部生成，排版角色四属性齐备）`,
);
