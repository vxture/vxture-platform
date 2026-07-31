/**
 * color-policy.mjs — T2 色彩语义的定义。
 *
 * 六个意图族按**色相 × 阶型**表达，而不是逐条列出 60 行映射：六族的槽位结构完全
 * 相同，差别只在色相与填充档。这样加一个意图族是一行，而族间不一致在结构上
 * 不可能发生——"warning 的前景是深色而其余是白色"作为阶型差异一眼可见，
 * 摊平成行时则看不出是决策还是笔误。
 *
 * 非意图族（表面 / 内容 / 描边 / 图表 / 渐变）不具备这种规律，逐条列出即最简形式。
 */

/**
 * 意图族的色相与阶型。
 *
 * 阶型由**对比度**决定，不是审美偏好：
 * - A 档（600 填充配白字）适用于中高彩度冷色与红色
 * - B 档（700 填充配白字）给 emerald / sky——它们在 600 档配白字对比度不足
 * - C 档（400 填充配深字）给 amber——黄色系在任何档位配白字都不合格，
 *   业界通行解法是压低填充档并改用近黑文字
 */
export const INTENT_FAMILIES = [
  ["primary", "brand", "A"],
  ["destructive", "red", "A"],
  ["ai", "purple", "A"],
  ["success", "emerald", "B"],
  ["info", "sky", "B"],
  ["warning", "amber", "C"],
];

/** 阶型：填充三态 + 前景 + 明色下的文字档。 */
export const INTENT_RAMPS = {
  A: { fill: 600, hover: 700, active: 800, foreground: "white", text: 600 },
  B: { fill: 700, hover: 800, active: 900, foreground: "white", text: 700 },
  C: { fill: 400, hover: 500, active: 600, foreground: "neutral-900", text: 700 },
};

/**
 * 六族共用的槽位。填充三态与前景**不随主题变化**——一个"危险"按钮在暗色下仍应
 * 是同一个红，否则同一个操作在两种主题下看起来是两件事。随主题变的是 muted 系列
 * （底色要贴合各自主题的表面明度）与 text / border（要在各自背景上保持对比度）。
 */
export const INTENT_SLOTS = {
  light: {
    muted: 50,
    "muted-hover": 100,
    "muted-active": 200,
    "muted-foreground": 800,
    border: 600,
  },
  dark: {
    muted: 950,
    "muted-hover": 900,
    "muted-active": 800,
    "muted-foreground": 300,
    border: 500,
    text: 400,
  },
};

/** 槽位输出顺序，与既有产物一致。 */
export const INTENT_SLOT_ORDER = [
  "",
  "hover",
  "active",
  "foreground",
  "muted",
  "muted-hover",
  "muted-active",
  "muted-foreground",
  "border",
  "text",
];

/**
 * 非意图族：表面 / 内容 / 描边 / 图表 / 渐变。三列为 [语义名, 明色 T1 档, 暗色 T1 档]。
 *
 * 这些族没有可提取的规律——`background` 与 `card` 的明暗映射是**互相独立的**版面
 * 决策，不是同一条阶梯上的两点。硬套进"阶型"只会编造出不存在的关系。
 *
 * 几处值得知道的：
 * - 明色表面阶梯是中性的，不带品牌调：品牌浅蓝拉出的层次在暗色下完全塌缩，
 *   两种主题各有一套层次逻辑不如一套中性阶梯稳
 * - `scrim` 与 `gradient-glow-*` 明暗同值：它们是 alpha 合成色，本就该在两种主题下
 *   叠出相同的压暗 / 发光强度
 * - `chart-2..6` 用保留色相。色板只留六个色相，可辨识度因此有限；若数据可视化
 *   确有需要，应把 teal / orange 作为明确扩展加回 foundation-policy 的 KEEP_HUES
 * - `chart-seq-*` 与 `chart-div-*` 的明暗是**逐档反序**的（100↔900），这是连续色阶
 *   在深浅背景上保持同等区分度的标准做法，不是笔误
 */
export const STANDALONE_COLORS = [
  /* surface */
  ["background", "neutral-100", "neutral-950"],
  ["surface-1", "neutral-200", "neutral-900"],
  ["card", "white", "neutral-800"],
  ["surface-3", "neutral-50", "neutral-700"],
  ["popover", "white", "neutral-800"],
  ["scrim", "neutral-950-alpha-45", "neutral-950-alpha-45"],
  ["accent", "neutral-600-alpha-08", "neutral-600-alpha-10"],
  ["surface-active", "neutral-600-alpha-15", "neutral-600-alpha-22"],
  ["surface-selected", "brand-600-alpha-10", "brand-600-alpha-15"],
  ["surface-selected-hover", "brand-600-alpha-15", "brand-600-alpha-22"],
  ["surface-inverse", "neutral-900", "neutral-100"],
  /* content */
  ["foreground", "neutral-600", "neutral-50"],
  ["muted-foreground", "neutral-500", "neutral-300"],
  ["content-tertiary", "neutral-400", "neutral-400"],
  ["content-disabled", "neutral-300", "neutral-600"],
  ["content-on-fill", "white", "white"],
  ["link", "brand-600", "brand-400"],
  ["link-hover", "brand-700", "brand-300"],
  ["content-on-inverse", "neutral-50", "neutral-900"],
  /* stroke */
  ["border", "neutral-200", "neutral-600"],
  ["input", "neutral-400", "neutral-500"],
  ["stroke-emphasis", "neutral-600", "neutral-400"],
  ["ring", "brand-600", "brand-400"],
  ["stroke-disabled", "neutral-200", "neutral-800"],
  /* chart */
  ["chart-other", "neutral-400", "neutral-500"],
  ["chart-grid", "neutral-200", "neutral-800"],
  ["chart-axis", "neutral-400", "neutral-600"],
  ["chart-tooltip-bg", "neutral-900", "neutral-800"],
  ["chart-1", "brand-600", "brand-400"],
  ["chart-2", "amber-600", "amber-400"],
  ["chart-3", "emerald-600", "emerald-400"],
  ["chart-4", "purple-600", "purple-400"],
  ["chart-5", "sky-600", "sky-400"],
  ["chart-6", "red-600", "red-400"],
  ["chart-seq-1", "brand-100", "brand-900"],
  ["chart-seq-2", "brand-300", "brand-700"],
  ["chart-seq-3", "brand-500", "brand-500"],
  ["chart-seq-4", "brand-700", "brand-300"],
  ["chart-seq-5", "brand-900", "brand-100"],
  ["chart-div-1", "sky-700", "sky-300"],
  ["chart-div-2", "sky-300", "sky-600"],
  ["chart-div-3", "neutral-200", "neutral-700"],
  ["chart-div-4", "red-300", "red-600"],
  ["chart-div-5", "red-700", "red-300"],
  /* gradient */
  ["gradient-brand-from", "brand-600", "brand-500"],
  ["gradient-brand-to", "brand-800", "brand-700"],
  ["gradient-ai-from", "purple-600", "purple-500"],
  ["gradient-ai-to", "purple-800", "purple-700"],
  ["gradient-surface-from", "neutral-50", "neutral-800"],
  ["gradient-surface-to", "white", "neutral-900"],
  ["gradient-glow-from", "brand-600-alpha-22", "brand-600-alpha-22"],
  ["gradient-glow-to", "brand-600-alpha-08", "brand-600-alpha-08"],
];
