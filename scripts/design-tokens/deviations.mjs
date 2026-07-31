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

/**
 * 非色彩刻度的取值偏离（裸值覆盖）。
 *
 * ── z-index 分层重排 ────────────────────────────────────────────
 * 设计稿的梯度有三处问题：`drawer` 与 `modal` 同为 400、`notification` 与
 * `toast` 同为 600——同值意味着叠放次序取决于 DOM 顺序而非设计意图；
 * 且 `dropdown`(100) 低于 `sticky`(200)，而本系统组件基座是 Radix，
 * 菜单默认经 portal 挂到 body，低于粘性表头会被裁切。
 *
 * 重排依据（Bootstrap / MUI / Ant Design 三家共识）：
 * - tooltip 最高——否则会被它所描述的元素遮挡（三家一致）
 * - toast / notification 高于 modal（MUI snackbar 1400 > modal 1300；Ant 同）
 * - popover 高于 modal——气泡可用在模态内，如模态里的下拉与日期选择
 *   （Bootstrap popover 1070 > modal 1050；Ant 同）
 * - drawer 低于 modal——模态可从抽屉内唤起，如抽屉里点删除弹确认框
 *   （MUI drawer 1200 < modal 1300；Bootstrap offcanvas 1045 < modal 1050）
 * - dropdown 高于 sticky——portal 化菜单须压过粘性表头（Ant dropdown 1050）
 * - notification 高于 toast——通知常驻更久、可堆叠，应压在轻提示之上
 *
 * 保持 100 步进与既有的 base/raised/max 三档不变。
 */
export const SCALE_DEVIATIONS = {
  "z/sticky": { value: 100, why: "让位给 portal 化的 dropdown" },
  "z/dropdown": { value: 200, why: "Radix portal 菜单须压过粘性表头，否则被裁切" },
  "z/modal": { value: 500, why: "高于 drawer——模态可从抽屉内唤起" },
  "z/popover": { value: 600, why: "高于 modal——气泡可用在模态内" },
  "z/toast": { value: 700, why: "全局反馈，不应被浮层遮挡" },
  "z/notification": { value: 800, why: "常驻更久且可堆叠，压在 toast 之上" },
  "z/tooltip": { value: 900, why: "必须最高，否则被所描述的元素遮挡" },
};

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
    // 1920 恰是 breakpoint-3xl，故写成引用而非裸值——与其余 content/* 一致，
    // 且断点若调整能自动跟随。
    alias: "--layout-page-3xl",
    why: "2K/4K 下数据密集型页面的内容宽度上限；再宽则行长失控，应改用分栏",
  },
};

/**
 * T1 原子层增补：设计稿导出缺档、但 DS 判定必须存在的原子值。
 *
 * 与 `SCALE_ADDITIONS`（T2）分开，因为 T1 是裸值、T2 是引用，两者形状不同。
 *
 * ⚠ 缺档**必须补在这里**，不能直接改 `foundation/` 下的文件——那些是生成物，
 *   手改会被下一次生成静默覆盖。字重四档就是这么丢过一次的。
 */
export const PRIMITIVE_ADDITIONS = {
  "font/weight/thin": { value: 100, why: "补齐 Tailwind 字重九档" },
  "font/weight/extralight": { value: 200, why: "补齐 Tailwind 字重九档" },
  "font/weight/light": { value: 300, why: "补齐 Tailwind 字重九档" },
  "font/weight/black": { value: 900, why: "补齐 Tailwind 字重九档" },
};

/** 所有被偏离过的设计稿 token 路径（跨模式合并）。 */
export const DEVIATED_PATHS = new Set(
  Object.values(DEVIATIONS).flatMap((byPath) => Object.keys(byPath)),
);
