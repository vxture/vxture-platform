/**
 * foundation-policy.mjs — T1 相对 Tailwind 基线的**全部偏离**，逐条写明理由。
 *
 * T1 是 Tailwind theme 的完整镜像。凡与基线不同之处只有三种，且必须登记在此：
 *
 *   KEEP_HUES   色板做减法（平台用不到那么多色相）
 *   EXTENSIONS  Tailwind 没有的挡位（扩展）
 *   OVERRIDES   Tailwind 有、但 DS 判定要改的取值（修改）
 *
 * 没登记就是没有偏离——生成器直接照搬基线。**不允许手工改 foundation/ 下的文件**，
 * 那是生成物，改动会被下一次生成静默覆盖。
 */

/**
 * 保留的色相。Tailwind 给 22 个色相 × 11 档 = 242 个色板 token，平台实际只用得上
 * 少数几个；全量镜像会让调色板"太杂"，选色时反而无所适从。
 *
 * 判据是 T2 语义层的实际消费量：下列七相各被引用 18–59 次，各自承担一类语义；
 * 被删的 fuchsia / teal / orange / lime / cyan 各只被引用 2–4 次，且全部来自
 * chart-2…6 各取一档——为图表配色养 5 个完整色阶不划算。图表改用保留色相。
 *
 * ⚠ 图表色的可辨识度因此下降：brand（靛）、purple、sky 三者偏冷且相邻。
 *   若数据可视化确有需要，再把 teal / orange 作为**明确扩展**加回，
 *   而不是默认全量保留。
 */
export const KEEP_HUES = ["neutral", "red", "amber", "emerald", "sky", "purple"];

/** 色板里不属于任何色相的单值（Tailwind 的 black / white）。 */
export const KEEP_COLOR_SINGLES = ["black", "white"];

/**
 * 扩展：Tailwind 没有的挡位。**扩展不是修改**——只增不改。
 *
 * 每条都要能回答"为什么 Tailwind 的挡位不够用"，答不上来的不算扩展，算私货。
 */
export const EXTENSIONS = {
  text: [
    ["3xs", "0.5rem", "密集表格与角标；Tailwind 最小档 xs=0.75rem 仍偏大"],
    ["2xs", "0.625rem", "同上，介于 3xs 与 xs 之间"],
  ],
  breakpoint: [
    ["xs", "23.4375rem", "375px，主流手机竖屏宽；Tailwind 最小档 sm=640px 已属平板"],
    ["3xl", "120rem", "1920px，1080p 横屏"],
    ["4xl", "160rem", "2560px，2K"],
    ["5xl", "240rem", "3840px，4K"],
  ],
};

/**
 * 覆盖：Tailwind 有该挡位、但 DS 认定取值不同。
 *
 * 目前为空——这是刻意的。ease 曾用 Material 曲线覆盖 in/out/in-out，已按
 * "扩展不是修改"的原则退回 Tailwind 取值；shadow 曾用自造的几何倍增阶梯，
 * 亦已退回。任何新增覆盖都是一次明确的设计决策，需在此写明理由。
 */
export const OVERRIDES = {};

/**
 * 品牌与合成色：Tailwind 不可能有，取自设计稿，属 DS 私有。
 * 前缀在此登记，生成器据此从 Figma 派生的色板里挑出这部分。
 */
export const BRAND_COLOR_PATTERNS = [/^brand-/, /-alpha-\d+$/];
