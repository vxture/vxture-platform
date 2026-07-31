#!/usr/bin/env node

/**
 * generate-theme.mjs — 由 T2 生成 Tailwind v4 的 `@theme` 注册。
 *
 * v4 的 token 是 CSS 变量驱动，构建期与运行期双可用；`@theme` 注册后每个 token
 * 都产出真工具类。此前只注册了颜色，其余靠任意值语法（`h-(--control-height-lg)`）
 * ——那是 v3「token 运行时拿不到」的思维残留，v4 无此限制。
 *
 * 出：src/styles/theme.css
 *
 * ⚠ 必须生成而非手写：手写必漏。首版手写颜色桥接时就漏了 link / link-hover /
 *   primary-muted-hover / primary-muted-foreground 四个，而 DS 包不跑 Tailwind 编译，
 *   build 全绿却会在消费方静默失效。
 *
 * `inline` 使工具类展开为对原变量的引用而非快照，故 .dark 与密度/字号模式自动跟随。
 *
 * 用法：
 *   node scripts/design-tokens/generate-theme.mjs
 *   node scripts/design-tokens/generate-theme.mjs --check
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");

const PKG = path.join(ROOT, "packages/design/design-system");
const SEMANTIC = path.join(PKG, "src/styles/semantic");
const TARGET = path.join(PKG, "src/styles/theme.css");
const UTIL_TARGET = path.join(PKG, "src/styles/utilities.css");

/**
 * T2 文件 → Tailwind theme 命名空间。
 *
 * 命名空间决定产出哪族工具类，必须与 v4 内置一致，不能自创。
 *
 * ⚠ **注册名不得与被引用名相同**，否则产出 `--duration-fast: var(--duration-fast)`
 *   这样的自引用——CSS 判定为循环，变量整个失效，且无任何报错。
 *
 * 因此只注册「T2 名与 theme 名不同」的命名空间：
 * - 有模式轴的（color 明暗 / spacing 密度）：T2 名本就另起（`--primary`、`--space-md`），
 *   注册成 `--color-primary`、`--spacing-md`，模式切换由被引用的变量承担。
 * - 无模式轴且 T2 名已等于 theme 名的（radius / duration / ease）：**不在此注册**，
 *   改由生成器把它们直接写进 `@theme`（见 generate-semantic-scales.mjs），
 *   一处声明即完成注册，无需指向自己。
 */
const NAMESPACES = [
  { file: "color-semantic.css", ns: "--color-", note: "bg-* / text-* / border-* / ring-*" },
  { file: "spacing-semantic.css", ns: "--spacing-", note: "p-* / gap-* / h-* / w-* / m-*", strip: /^--space-/ },
  { file: "size-semantic.css", ns: "--spacing-", note: "size-*（图标与媒体）" },
  { file: "breakpoint-semantic.css", ns: "--breakpoint-", note: "sm: / md: / …", strip: /^--layout-breakpoint-/ },
  // 内容宽度刻度进 `--container-*`，产出 max-w-page-* / max-w-content-*。
  // layout-semantic 里还有 field / panel / sidebar / topbar，那些是组件尺寸不是
  // 容器刻度，不注册。
  {
    file: "layout-semantic.css",
    ns: "--container-",
    note: "max-w-page-* / max-w-content-*",
    only: /^--layout-(page|content)-/,
    strip: /^--layout-/,
  },
];

/**
 * 无对应 theme 命名空间的族 → v4 的 `@utility` 自定义工具类。
 *
 * v4 的 theme 命名空间是**固定的一套**（color / font / text / tracking / leading /
 * breakpoint / container / spacing / radius / shadow / ease / animate / …）。
 * 下面四族不在其中：`--duration-*`、`--opacity-*`、`--border-width-*`、`--z-*`
 * 写进 `@theme` 只会变成普通变量，**不产出任何工具类且不报错**。
 *
 * 这正是 `duration-fast` 哑火一轮而检查器判过的原因。凡不在命名空间内的族，
 * 一律走 `@utility` 显式声明。
 */
const UTILITY_FAMILIES = [
  {
    file: "duration-semantic.css",
    util: "duration",
    prop: "transition-duration",
    strip: /^--duration-/,
  },
  { file: "opacity-semantic.css", util: "opacity", prop: "opacity", strip: /^--opacity-/ },
  {
    file: "border-semantic.css",
    util: "border",
    prop: "border-width",
    strip: /^--border-width-/,
  },
  { file: "z-index-semantic.css", util: "z", prop: "z-index", strip: /^--z-/ },
];

/**
 * 字体族：T1 的字体栈 → `--font-*`，产出 font-sans / font-brand / font-cjk / font-mono。
 *
 * 注册的是 `--vx-font-stack-*`（完整回退链）而非 `--vx-font-family-*`（单个族名），
 * 工具类要能直接落到 font-family 上。
 */
const FONT_STACKS = ["sans", "brand", "cjk", "mono"];

/**
 * 排版角色：T2 的 24 档 → `--text-*`。
 *
 * v4 的 `--text-*` 支持 `--text-<name>--line-height` 这类修饰子键，一个 `text-body-md`
 * 工具类即同时落 font-size / line-height / letter-spacing / font-weight，
 * 这正是 v4 为排版角色准备的机制。
 *
 * 注册后即可删除手写的 `.text-heading-1` / `.font-brand` 之类类名——它们与生成的
 * 同名工具类互相遮蔽，且手写版不跟随字号三档模式轴。
 *
 * font-family 不在 v4 的修饰子键之列（只有上述三个），故角色的字体族仍由
 * 独立的 `font-*` 工具类承担。
 */
const TEXT_MODIFIERS = [
  ["line-height", "line-height"],
  ["letter-spacing", "letter-spacing"],
  ["font-weight", "font-weight"],
];

/** 取某文件在首个规则块内声明的变量名（模式块重复声明，取一份即可）。 */
function declaredVars(file) {
  const css = readFileSync(path.join(SEMANTIC, file), "utf8");
  const names = [];
  const seen = new Set();
  for (const m of css.matchAll(/^\s*(--[\w-]+)\s*:/gm)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    names.push(m[1]);
  }
  return names;
}

const blocks = [];
const stats = [];

for (const entry of NAMESPACES) {
  if (!entry.ns) continue;
  const vars = declaredVars(entry.file).filter(
    (name) => !entry.only || entry.only.test(name),
  );
  const lines = vars.map((name) => {
    const step = entry.strip ? name.replace(entry.strip, "") : name.slice(2);
    return `  ${entry.ns}${step}: var(${name});`;
  });
  blocks.push(`  /* ${entry.note} */\n${lines.join("\n")}`);
  stats.push(`${entry.file.replace("-semantic.css", "")} ${lines.length}`);
}

// 字体族
const fontLines = FONT_STACKS.map((n) => `  --font-${n}: var(--vx-font-stack-${n});`);
blocks.push(`  /* font-sans / font-brand / font-cjk / font-mono */\n${fontLines.join("\n")}`);
stats.push(`font ${fontLines.length}`);

// 排版角色：由 T2 声明的 `--<role>-font-size` 反推角色名，避免另立一份角色清单。
const typoVars = declaredVars("typography-semantic.css");
const roles = typoVars
  .filter((n) => n.endsWith("-font-size"))
  .map((n) => n.slice(2, -"-font-size".length));
if (roles.length === 0) throw new Error("未从 T2 解析出任何排版角色，中止");

const textLines = [];
for (const role of roles) {
  textLines.push(`  --text-${role}: var(--${role}-font-size);`);
  for (const [suffix, prop] of TEXT_MODIFIERS) {
    if (typoVars.includes(`--${role}-${prop}`)) {
      textLines.push(`  --text-${role}--${suffix}: var(--${role}-${prop});`);
    }
  }
}
blocks.push(`  /* text-*（24 档角色，含行高 / 字距 / 字重修饰） */\n${textLines.join("\n")}`);
stats.push(`text ${roles.length} 档`);

/**
 * 阴影：T2 只有**几何分量**（offset-y / blur 在 shadow-semantic，color 在
 * color-semantic），没有可直接使用的 box-shadow 值，故 `shadow-*` 工具类此前
 * 一个都产不出。此处合成后注册。
 *
 * 颜色来自 color-semantic，天然带暗色变体；`inline` 保留 var() 引用，
 * 故暗色下阴影自动跟随，无需第二套注册。
 *
 * elevation-0 无颜色档（设计上即"无阴影"），映射为 `none`。
 */
const elevationSteps = [
  ...new Set(
    declaredVars("shadow-semantic.css")
      .map((n) => /^--elevation-(\d+)-/.exec(n)?.[1])
      .filter(Boolean),
  ),
];
const colorVars = new Set(declaredVars("color-semantic.css"));
const shadowLines = elevationSteps.map((n) =>
  colorVars.has(`--elevation-${n}-color`)
    ? `  --shadow-${n}: 0 var(--elevation-${n}-offset-y) var(--elevation-${n}-blur) var(--elevation-${n}-color);`
    : `  --shadow-${n}: none;`,
);
blocks.push(`  /* shadow-*（由几何分量与颜色合成） */\n${shadowLines.join("\n")}`);
stats.push(`shadow ${shadowLines.length}`);

const css = `/**
 * theme.css - T2 → Tailwind v4 @theme 注册。
 * @package @vxture/design-system
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-07-31
 *
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 *   生成：node scripts/design-tokens/generate-theme.mjs
 *
 * 注册后每个 T2 token 产出真工具类，组件**禁止使用任意值语法**
 * （\`h-(--control-height-lg)\`）。约定见 docs/10-standards/040-*.md §4.1。
 *
 * \`inline\` 使工具类展开为对原变量的引用而非快照，
 * 故 .dark 与密度 / 字号三档模式自动跟随。
 */

@theme inline {
${blocks.join("\n\n")}
}
`;

/* ── 自定义工具类（无对应 theme 命名空间的族）───────────────────────────── */

const utilBlocks = [];
for (const entry of UTILITY_FAMILIES) {
  const rules = declaredVars(entry.file)
    .filter((name) => entry.strip.test(name))
    .map((name) => {
      const step = name.replace(entry.strip, "");
      return `@utility ${entry.util}-${step} {\n  ${entry.prop}: var(${name});\n}`;
    });
  if (rules.length === 0) continue;
  utilBlocks.push(`/* ${entry.util}-* → ${entry.prop} */\n${rules.join("\n\n")}`);
  stats.push(`${entry.util} ${rules.length}`);
}

const utilCss = `/**
 * utilities.css - T2 → Tailwind v4 自定义工具类。
 * @package @vxture/design-system
 * @layer Presentation
 * @category styles
 * @author AI-Generated
 * @date 2026-07-31
 *
 * ⚠ 本文件由脚本生成，请勿手工编辑。
 *   生成：node scripts/design-tokens/generate-theme.mjs
 *
 * v4 的 theme 命名空间是固定的一套，下列各族不在其中——写进 \`@theme\` 只会
 * 得到普通变量，工具类不产出且无任何报错。故用 \`@utility\` 显式声明。
 */

${utilBlocks.join("\n\n")}
`;

if (CHECK) {
  let current = "";
  try {
    current = readFileSync(TARGET, "utf8");
  } catch {
    /* 缺文件即视为不同步 */
  }
  let currentUtil = "";
  try {
    currentUtil = readFileSync(UTIL_TARGET, "utf8");
  } catch {
    /* 缺文件即视为不同步 */
  }
  if (current !== css || currentUtil !== utilCss) {
    console.error("@theme 注册与 T2 不同步。运行：node scripts/design-tokens/generate-theme.mjs");
    process.exit(1);
  }
  console.log(`@theme 注册一致（${stats.join(" · ")}）`);
} else {
  writeFileSync(TARGET, css, "utf8");
  writeFileSync(UTIL_TARGET, utilCss, "utf8");
  console.log(`已生成 @theme 注册：${stats.join(" · ")}`);
}
