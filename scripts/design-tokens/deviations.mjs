/**
 * deviations.mjs — DS 对设计稿取值的有依据偏离。
 *
 * DS 是真值源，设计稿只是输入且已证实会出错，因此必须允许有依据地覆盖导出值。
 * 覆盖只写在此处，逐条给出理由；生成物在对应行留下 `/* 偏离设计稿：… *\/` 注释，
 * 生成时逐条打印。规范见 docs/10-standards/065-design-token-pipeline.md §3.1.2。
 *
 * 由 generate-semantic.mjs（应用偏离）与 generate-component.mjs（跳过取值断言）
 * 共用。**必须共用**：T3 的取值断言拿设计稿原值比对产物，凡被偏离的 T2 token，
 * 其 T3 引用者的设计稿值必然对不上——不共享就会把有依据的偏离误报成错误。
 */

export const DEVIATIONS = {
  "vx-Color-Light": {
    // 明色表面阶梯去品牌调。设计稿用 surface/B-*（品牌浅蓝）与 surface/N-*（中性）
    // 拉开层次，但该区分在暗色下完全塌缩（四级全为中性明度阶），且实践中 console
    // 早已用 --vx-color-shell-bg: #f5f7fb 绕过较重的品牌底色。
    // 明色可用档位只有 white/50/100/200 四个、恰好四级，故整体重排而非单点替换，
    // 否则页面底与卡内凹陷面会撞成同值。
    "surface/B-1": { to: "color/neutral/100", why: "页面底改中性" },
    "surface/B-2": { to: "color/neutral/200", why: "页面级凹陷面" },
    "surface/N-1": { to: "color/base/white", why: "卡片提为纯白，与灰底页面拉开层次" },
    "surface/N-2": { to: "color/neutral/50", why: "卡内凹陷面下移一档，避让页面底" },
  },
};

/** 非色彩刻度的取值偏离（裸值覆盖）。当前无——container 已改为别名断点，不再需要覆盖。 */
export const SCALE_DEVIATIONS = {};

/**
 * DS 增补的 token（设计稿中不存在）。需回报设计侧补进设计稿。
 *
 * `layout/content/*` 是**可读内容宽度上限**，设计稿只给到 wide-2xl（1536px）。
 * container 恢复与断点一一对应后，2K（2560）/ 4K（3840）视口下内容若仍卡在
 * 1536px 会显著偏窄，而直接放开到视口宽度又会让行长失控。
 *
 * 行业实践的分档：正文类 640–768、应用内容 1280–1536、数据密集型面板至多 1920；
 * 超过 1920 不再加宽内容，改为加大留白或增加分栏。故补 ultra-3xl = 1920px 收口。
 */
export const SCALE_ADDITIONS = {
  "layout/content/ultra-3xl": {
    value: 1920,
    why: "2K/4K 下数据密集型页面的内容宽度上限；再宽则行长失控，应改用分栏",
  },
};

/** 所有被偏离过的设计稿 token 路径（跨模式合并）。 */
export const DEVIATED_PATHS = new Set(
  Object.values(DEVIATIONS).flatMap((byPath) => Object.keys(byPath)),
);
