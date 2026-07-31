/**
 * typography-policy.mjs — 24 个排版角色的输入。DS 自有，取代 Figma 的 vx-Typography 导出。
 *
 * ── 为什么不是把 360 行导出照抄过来 ──
 * 导出把 24 角色 × 5 属性 × 3 个字号模式全部摊平。但**模式之间只有字号在变**，
 * 其余四项完全相同；而字号的变化是在 T1 字号阶梯上整体平移一档。摊平之后，
 * "哪些角色不跟着平移"这种真正的决策淹没在 360 行里看不见。
 *
 * 按 {族, 字重, 默认档, 行盒, 字距} 表达之后是 24 行，且平移规则与它的两处例外
 * 成为显式条目。
 */

/** T1 字号阶梯，模式平移沿此表进行。 */
export const TEXT_LADDER = [
  "3xs", "2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl",
];

/** 字号三档 = 默认档在阶梯上 −1 / 0 / +1。两处例外由角色自己声明。 */
export const SIZE_MODE_SHIFT = [-1, 0, 1];

/**
 * 排版角色。列依次为：
 *   角色名, 字体族, 字重, 默认字号档, 行盒(px)[小/默认/大], 字距(px), 例外标记
 *
 * ── 行盒 ──
 * 记的是**绝对行盒 px**（三档各一个），而不是折算后的 1.4286：前者是设计意图
 * （全部落在 4px 栅格上：12/16/20/24/28/36/44/56/72），后者是它与字号的商，
 * 读不出栅格。生成时折算为无单位比值——绝对 px 扛不住字号三档与浏览器缩放。
 *
 * ⚠ 三档的行盒**逐档独立，推不出来**。大号档普遍是 +1 格，小号档却不是：
 *   display-xl 从 72 掉到 56（−4 格），body-sm 则保持 16 不变。试过用"随字号档
 *   同步平移一格"推导，大号档全中、小号档 18 个角色全错。故三列照列。
 *   （小号档的收敛是有道理的：字号已经压到下限，行距再按比例缩会碎掉。）
 *
 * ── 字距 ──
 * ⚠ 设计稿给**所有** display / heading / overline 的字距都是同一个 1.6px，
 *   与字号无关。折算成 em 后：display-xl(60px) 是 0.027em，overline(12px) 是
 *   0.133em——同一条"规则"在两端相差近五倍。排版惯例恰恰相反：大字收紧、
 *   小字放开。这更像是设计稿里一个共享样式被套给了所有大字号角色。
 *
 *   此处**照录 1.6px 以保持现有呈现不变**（导出里的 1.598~1.602 是浮点噪声，
 *   已归一）。要修的话应改成按尺寸分级的 em 值，那是一次可感知的视觉变更，
 *   需单独评审、单独提交。
 *
 * ── 例外标记 ──
 *   noGrow   大号模式不再放大。display-xl 已是 60px，再大挤压版面而非改善阅读。
 *   noShrink 小号模式不再缩小。代码与元信息低于 12px 失去可读性，
 *            而字号偏好本就是无障碍设置，不该把它们推到不可读。
 */
export const TYPE_ROLES = [
  ["display-xl", "brand", "bold", "6xl", [56, 72, 72], 1.6, "noGrow"],
  ["display-lg", "brand", "bold", "5xl", [44, 56, 72], 1.6],
  ["display-md", "brand", "bold", "4xl", [36, 44, 56], 1.6],
  ["display-sm", "brand", "bold", "3xl", [28, 36, 44], 1.6],
  ["display-xs", "brand", "bold", "2xl", [24, 28, 32], 1.6],
  ["heading-1", "brand", "semibold", "3xl", [28, 36, 44], 1.6],
  ["heading-2", "brand", "semibold", "2xl", [24, 28, 36], 1.6],
  ["heading-3", "sans", "semibold", "base", [20, 24, 28], 1.6],
  ["heading-4", "sans", "semibold", "sm", [20, 20, 24], 1.6],
  ["heading-5", "sans", "semibold", "xs", [20, 20, 24], 1.6],
  ["body-lg", "sans", "normal", "base", [20, 24, 28], 0],
  ["body-md", "sans", "normal", "sm", [16, 20, 24], 0],
  ["body-sm", "sans", "normal", "xs", [16, 16, 20], 0],
  ["body-xs", "sans", "normal", "2xs", [16, 16, 20], 0],
  ["body-xl", "sans", "normal", "lg", [24, 28, 32], 0],
  ["label-lg", "sans", "medium", "base", [20, 24, 24], 0],
  ["label-md", "sans", "medium", "sm", [16, 20, 24], 0],
  ["label-sm", "sans", "medium", "xs", [16, 16, 20], 0],
  ["label-xs", "sans", "medium", "2xs", [16, 16, 20], 0],
  ["label-xl", "sans", "medium", "lg", [24, 28, 28], 0],
  ["code-md", "mono", "normal", "sm", [16, 20, 24], 0],
  ["code-sm", "mono", "normal", "xs", [16, 16, 20], 0, "noShrink"],
  ["caption", "sans", "normal", "xs", [16, 16, 20], 0, "noShrink"],
  ["overline", "sans", "semibold", "xs", [16, 16, 20], 1.6, "noShrink"],
];

/** 产物里的分组顺序，与角色名前缀一致。 */
export const TYPE_GROUP_ORDER = ["display", "heading", "body", "label", "code", "caption", "overline"];
