/**
 * typography-policy.mjs — 24 个排版角色的定义。
 *
 * 一个角色回答的是"这段文字在版面里是什么身份"，四项属性随之确定：字体族、
 * 字重、字号档、以及行高与字距该怎么取。
 *
 * ── 行高与字距不逐角色写死 ──
 * 两者都由**规则**给出，规则只有两条，取值全部来自 T1，没有任何自造数字：
 *
 *   行高  默认取字号档自带的行高（T1 每一档都有 `--vx-text-<step>--line-height`，
 *         是一条随字号增大而收紧的阶梯，正是排版惯例）；display 与品牌标题
 *         统一收紧到 `--vx-leading-tight`。
 *   字距  默认 0；display 与品牌标题收紧一档；overline 是全大写微型标签，放开。
 *
 * 逐角色写死过一版，结果是同一字号在不同角色上出现七组互不相同的行高
 * （heading-5 在 12px 上是 2.0，而 body-sm 同样 12px 是 1.33），且没有任何依据
 * 能解释差异。规则化之后这类分歧在结构上不可能存在。
 */

/** T1 字号阶梯，字号三档沿此表平移。 */
export const TEXT_LADDER = [
  "3xs", "2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl",
];

/** 字号三档 = 默认档在阶梯上 −1 / 0 / +1。两处例外由角色自己声明。 */
export const SIZE_MODE_SHIFT = [-1, 0, 1];

/**
 * 需要收紧行高与字距的角色：大字号标题。
 *
 * 大字的字面间空隙在视觉上被放大，按正文的行高与字距排会显得松散断裂。
 * 收紧只作用于 display 全族与两级品牌标题——heading-3 及以下用的是正文字体
 * 与正文字号区间，按正文规则处理才对。
 */
export const TIGHT_ROLES = /^(display-|heading-[12]$)/;

/**
 * 排版角色。列依次为：角色名, 字体族, 字重, 默认字号档, 例外标记。
 *
 * 例外标记（字号三档的边界）：
 *   noGrow    大号档不再放大。display-xl 默认已是 60px，再大是挤压版面而非改善阅读。
 *   noShrink  小号档不再缩小。代码与元信息低于 12px 失去可读性；字号偏好是无障碍
 *             设置，不该把这类文字推到读不了。
 */
export const TYPE_ROLES = [
  ["display-xl", "brand", "bold", "6xl", "noGrow"],
  ["display-lg", "brand", "bold", "5xl"],
  ["display-md", "brand", "bold", "4xl"],
  ["display-sm", "brand", "bold", "3xl"],
  ["display-xs", "brand", "bold", "2xl"],

  ["heading-1", "brand", "semibold", "3xl"],
  ["heading-2", "brand", "semibold", "2xl"],
  ["heading-3", "sans", "semibold", "base"],
  ["heading-4", "sans", "semibold", "sm"],
  ["heading-5", "sans", "semibold", "xs"],

  ["body-xl", "sans", "normal", "lg"],
  ["body-lg", "sans", "normal", "base"],
  ["body-md", "sans", "normal", "sm"],
  ["body-sm", "sans", "normal", "xs"],
  ["body-xs", "sans", "normal", "2xs"],

  ["label-xl", "sans", "medium", "lg"],
  ["label-lg", "sans", "medium", "base"],
  ["label-md", "sans", "medium", "sm"],
  ["label-sm", "sans", "medium", "xs"],
  ["label-xs", "sans", "medium", "2xs"],

  ["code-md", "mono", "normal", "sm"],
  ["code-sm", "mono", "normal", "xs", "noShrink"],

  ["caption", "sans", "normal", "xs", "noShrink"],
  ["overline", "sans", "semibold", "xs", "noShrink"],
];

/** 产物里的分组顺序，与角色名前缀一致。 */
export const TYPE_GROUP_ORDER = [
  "display", "heading", "body", "label", "code", "caption", "overline",
];
