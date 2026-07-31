/**
 * semantic-policy.mjs — T2 里**由 DS 决定、设计稿无法提供**的语义映射。
 *
 * 设计稿给的是档位（elevation/0..5、motion/easing/standard），档位只回答"有几级"，
 * 不回答"哪一级用在什么上"。后者是 DS 的判断，写在这里，逐条带理由。
 *
 * 与 deviations.mjs 的分工：那里是"设计稿给了值、DS 判定要改"；这里是"设计稿
 * 没给这层意思、DS 自己定"。
 */

/**
 * ── 叠放阶梯（z-index）──
 *
 * 无 T1 可指：v4 的 z-* 是裸数值工具类，上游 theme 里没有 z 这一族，而且叠放次序
 * 本来也不是"量纲"——500 不是某个测量值的第 500 档，它只是一个序。故 T2 落字面量。
 *
 * 逐档必须互异：同值时叠放次序取决于 DOM 顺序而非设计意图，是静默的层级 bug。
 * 设计稿出现过两组同值（drawer=modal、notification=toast），已在此重排。
 *
 * 依据取 Bootstrap / MUI / Ant Design 三家共识：
 * - tooltip 最高——否则会被它所描述的元素遮挡（三家一致）
 * - toast / notification 高于 modal（MUI snackbar 1400 > modal 1300；Ant 同）
 * - popover 高于 modal——气泡可用在模态内，如模态里的下拉与日期选择
 * - drawer 低于 modal——模态可从抽屉内唤起，如抽屉里点删除弹确认框
 * - dropdown 高于 sticky——Radix portal 菜单须压过粘性表头，否则被裁切
 */
export const Z_LADDER = [
  ["base", 0, "文档流基线"],
  ["raised", 10, "同层内的轻微抬起，如 hover 卡片"],
  ["sticky", 100, "粘性表头 / 工具栏"],
  ["dropdown", 200, "portal 化菜单须压过粘性表头"],
  ["overlay", 300, "浮层遮罩"],
  ["drawer", 400, "低于 modal——模态可从抽屉内唤起"],
  ["modal", 500, "模态对话框"],
  ["popover", 600, "高于 modal——气泡可用在模态内"],
  ["toast", 700, "全局反馈，不应被浮层遮挡"],
  ["notification", 800, "常驻更久且可堆叠，压在 toast 之上"],
  ["tooltip", 900, "必须最高，否则被所描述的元素遮挡"],
  ["max", 9999, "逃生档；新增使用需在 PR 说明"],
];

/**
 * ── 视觉高度阶梯（elevation → shadow）──
 *
 * 设计稿的 elevation/0..5 是纯序数几何（offset-y 与 blur 逐级翻倍），没有语义：
 * "elevation-3" 不告诉任何人它该用在哪。故按组件角色重新命名，与叠放阶梯同构。
 *
 * ⚠ 它与 z-index 是**两条独立的阶梯，不能互相推导**——这正是要两条语义阶梯的理由。
 *   直觉上"叠得越高、看起来越浮"，但 tooltip 是现成的反例：它叠放最高（必须压过
 *   它所描述的元素），阴影却应当很轻——tooltip 小而短暂，重阴影只会显得笨重。
 *   Material 同样给 tooltip 极低的 elevation。曾按"两者单调一致"写过断言，
 *   当场被这条映射证伪，故不设该断言。
 *
 * 两条阶梯的档数也不同：z-index 要求逐档互异（同值即叠放次序未定义，是 bug），
 * elevation 则**允许多角色共用一档**——下拉与气泡看起来一样浮是正常的，视觉上
 * 可辨识的高度档位本就比叠放层级少。把"下拉与气泡同高"记成一条显式决策，
 * 将来要分开只改一行；在纯序数档位模型里，这个决策根本没有落点。
 *
 * 本阶梯自身必须严格递增，由 assertElevationOrdered 断言。
 *
 * 暗色不另设一套：060 §1.1 已定"暗色层级由 surface 明度递增与描边承担，
 * 不靠阴影递增"。深色底上加重阴影只会糊成一团。
 */
export const ELEVATION = [
  ["flat", "none", "平面块，靠描边分隔：表格行、内联卡、分组容器"],
  ["raised", "xs", "静止卡片、面板、统计卡"],
  ["sticky", "sm", "粘性表头 / 工具栏，滚动后浮起以示脱离内容"],
  ["overlay", "md", "轻浮层：下拉菜单、气泡、tooltip"],
  ["dialog", "lg", "模态与抽屉"],
  ["notification", "xl", "toast / notification，离页面最远"],
];

/**
 * ── 缓动语义 ──
 *
 * 取值一律用 Tailwind 的 in / out / in-out（设计稿的 Material 三条曲线已按
 * "扩展不是修改"的原则退回上游取值）。这里定的是**哪个方向用哪条曲线**——
 * 这是决策，不是取值：入场减速、退场加速是动效常识，但它得写下来才成为规则。
 */
export const EASE_ROLES = [
  ["enter", "out", "入场减速：元素从无到有，末端放缓显得落位"],
  ["exit", "in", "退场加速：元素离场，起步放缓反而显得拖沓"],
  ["standard", "in-out", "位置 / 尺寸变化的默认曲线，两端都收"],
];

/**
 * ── 时长语义 ──
 *
 * 设计稿给的 75 / 150 / 200 / 300 / 500 恰好全部落在 Tailwind 时长档上，无需偏离。
 */
export const DURATION_ROLES = [
  ["instant", "75", "状态色切换等无位移反馈"],
  ["fast", "150", "hover / focus 等即时反馈"],
  ["base", "200", "默认过渡：展开、切换"],
  ["slow", "300", "浮层进出、抽屉滑动"],
  ["slower", "500", "页面级转场"],
];

/**
 * ── 圆角标签对齐 ──
 *
 * v4 的 rounded-* 编译为 `border-radius: var(--radius-<label>)`，与主题变量同名。
 * 设计稿的 radius 刻度比 Tailwind 整体错位一档（设计稿 md=8px，Tailwind md=6px），
 * 直接按设计稿标签注册会静默改掉仓库中全部 rounded-*（实测 83 处）。两条刻度的
 * **取值集合本就相同**（2/4/6/8/12/16），只是标签错位，故按值对齐。
 *
 * ⚠ radius 是九族里唯一目前零增益的：对齐之后 T2 就是 T1 的恒等别名。保留它是为
 *   分层完整——所有刻度都经 T2 出口，消费方不必区分"这族有语义名、那族没有"。
 *   它会在引入角色名（rounded-control / rounded-card）时长出内容。
 */
export const RADIUS_TO_TAILWIND = {
  "radius/2xs": "xs",
  "radius/xs": "sm",
  "radius/sm": "md",
  "radius/md": "lg",
  "radius/lg": "xl",
  "radius/xl": "2xl",
};

/**
 * 不发的档位：设计稿 radius/2xl（20px）在 Tailwind 刻度上无对应（16 之后为 24），
 * 且无任何 token 引用。radius/none 与 radius/full 同样不发——v4 把 rounded-none /
 * rounded-full 实现为静态工具类，不读主题变量，注册了也不会被用到。
 */
export const RADIUS_DROPPED = new Set(["radius/2xl", "radius/none", "radius/full"]);

/**
 * ── 间距族合并 ──
 *
 * 设计稿有九个间距族，重叠严重：inset 与 gap 十一档里仅五档同值，control-inset-x
 * 基本等于 inset 只在高端收窄，control-gap / section-gap / container-inset 再次重叠。
 * 差异看着像漂移而非设计。
 *
 * 且 v4 的 `--spacing-*` 是单一命名空间，九族里每族都有 "md"，不合并就只能带前缀
 * 注册（`--spacing-gap-md` → `gap-gap-md`）。
 *
 * 故七族合并为一条，取 inset 的阶梯为基准：它最完整（12 档）且三档密度下都严格单调。
 * 高度族量级不同，单列为 `--space-<kind>-*`，注册后得 `h-control-md` / `h-row-lg`。
 */
export const SPACING_BASE = "inset";
export const SPACING_MERGED = [
  "inset",
  "gap",
  "control-inset-x",
  "control-inset-y",
  "control-gap",
  "section-gap",
  "container-inset",
];
export const SPACING_HEIGHTS = { "control-height": "control", "row-height": "row" };

/**
 * ── 无 T1 可指的两族 ──
 *
 * opacity 与 border-width 在上游既没有 theme 变量、也没有封闭档位表：v4 接受任意
 * `opacity-<0-100>` 与 `border-<n>`。没有"原子刻度"这回事，T2 落字面量即是终点。
 * 与 z-index 同理，登记在此以免被误认为漏了 T1 引用。
 */
export const LITERAL_ONLY_FAMILIES = ["opacity", "border-width", "z-index"];

/**
 * 视觉高度阶梯自身必须严格递增。
 *
 * 这条断言挡的是"改一个角色的映射时顺手把顺序弄反"——阶梯是按角色名排的，
 * 取值却是另一套标签，肉眼看不出 dialog 是否真的比 overlay 更浮。
 */
export function assertElevationOrdered(errors) {
  const rank = new Map(
    ["none", "2xs", "xs", "sm", "md", "lg", "xl", "2xl"].map((s, i) => [s, i]),
  );
  let prev = -1;
  let prevRole = null;
  for (const [role, step] of ELEVATION) {
    const r = rank.get(step);
    if (r === undefined) {
      errors.push(`elevation ${role}：${step} 不是已知的阴影档`);
      continue;
    }
    if (r <= prev) {
      errors.push(
        `elevation ${prevRole} → ${role}：阶梯未严格递增（${step} 不高于前一档）`,
      );
    }
    prev = r;
    prevRole = role;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 以下五族的输入已从 Figma 导出迁入本文件（DS 自有）。
 * 迁移不是照搬——逐族重新判断过挡位是否该存在，删掉的记在各自注释里。
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 圆角挡位。
 *
 * 设计稿此前贡献的只有"有几档"，标签对齐表本就在本文件里；迁移后连那张对齐表
 * 也不需要了——直接按 Tailwind 标签列档。取值仍来自 T1（即上游），故本族目前是
 * 恒等别名，保留它是为分层边界完整，见 060 §1.1。
 *
 * 未列 `none` 与 `full`：v4 把 `rounded-none` / `rounded-full` 实现为**静态工具类**，
 * 不读主题变量，注册了也不会被用到。
 */
export const RADIUS_STEPS = ["xs", "sm", "md", "lg", "xl", "2xl"];

/**
 * 描边宽度。
 *
 * ⚠ 设计稿的 `border/width/none`（0px）**已删**。v4 的 `border-none` 是
 *   `border-style: none` 的静态工具类；注册 `--border-width-none` 会让同一个类名
 *   同时有"无边框样式"和"零宽度"两种来源，语义打架。要零宽度用 `border-0`。
 */
export const BORDER_WIDTHS = [
  ["thin", "1px", "默认描边：卡片、输入框、分隔"],
  ["medium", "2px", "强调描边：选中态、焦点框"],
  ["thick", "4px", "结构性描边：侧栏指示条、状态色条"],
];

/**
 * 透明度语义。
 *
 * ⚠ 设计稿的 `opacity/full`（1）**已删**：它不表达任何决策，`opacity-100` 即是。
 *
 * ⚠ 留意 overlay(0.5) 低于 subtle(0.6)——本族不是单调阶梯而是角色表，
 *   遮罩要压住底下的内容，比"次要文字"更不透明是正常的。
 */
export const OPACITIES = [
  ["disabled", 0.45, "禁用态：控件与其文字整体压暗"],
  ["overlay", 0.5, "遮罩：盖住底层内容但仍可辨认"],
  ["subtle", 0.6, "次要信息：时间戳、辅助说明"],
  ["muted", 0.75, "弱化但仍需阅读：占位、提示"],
];

/**
 * 图标与媒体尺寸，单位是 `--vx-spacing` 的倍数（与 v4 的 `p-4` 同构）。
 *
 * 两族分开而非合并：图标是**字形**，尺寸要贴合行高与光学重量；媒体是**内容框**，
 * 尺寸由版面决定。合成一条会让"头像调大"顺带改掉所有图标。
 *
 * 不随密度轴变化——图标缩小会先失去可辨识度，密度收紧应体现在留白。
 */
export const ICON_SIZES = [
  ["2xs", 2.5],
  ["xs", 3],
  ["sm", 3.5],
  ["md", 4],
  ["lg", 5],
  ["xl", 6],
  ["2xl", 8],
  ["3xl", 12],
  ["4xl", 14],
  ["5xl", 16],
];

export const MEDIA_SIZES = [
  ["xs", 6],
  ["sm", 8],
  ["md", 10],
  ["lg", 12],
  ["xl", 16],
  ["2xl", 24],
  ["3xl", 32],
];

/**
 * 内容宽度：可读行长上限。
 *
 * 页面宽度不在此列——它逐档等于 T1 的断点，从断点派生即可，不需要第二份清单。
 *
 * 分档依据是行长而非视口：正文类 640–768、应用内容 1280–1536、数据密集型面板
 * 至多 1920。设计稿只给到 wide-2xl（1536），2K / 4K 视口下明显偏窄，故补 ultra-3xl。
 */
export const CONTENT_WIDTHS = [
  ["narrow-lg", "lg", "正文与表单：单栏阅读"],
  ["base-xl", "xl", "应用内容：列表与详情"],
  ["wide-2xl", "2xl", "数据密集型面板"],
  ["ultra-3xl", "3xl", "2K / 4K 上限；再宽应改分栏而非加宽"],
];

/**
 * ── 间距刻度（密度三档）──
 *
 * 三列是 `--vx-spacing` 的**倍数**（compact / default / comfortable），与 v4 的
 * `p-4 → calc(var(--spacing) * 4)` 同构。
 *
 * ⚠ 三档之间是**档位平移**而非等比缩放，且平移量不一致：control 族多为 ±1，
 *   row 族在低端 ±2、高端 ±4，inset 族基本是"沿本族阶梯挪一格"。曾试图用单一
 *   乘数推导，实测比值在 1.0–1.5 之间浮动，推不出来——故必须逐档列表。
 *   这也是密度轴不能做成 `--spacing` 单乘数的原因。
 *
 * ⚠ `2xs` 在 default 与 comfortable 同为 1：最小一档已经贴到 4px，再放大就与
 *   `xs` 撞档。底部出现平台是刻意的，不是漏填。
 *
 * 断言（generate-semantic-scales）：同一行三档非递减、同一档沿族内递增。
 */
export const SPACING_SCALE = [
  /* inset */
  ["none", 0, 0, 0],
  ["2xs", 0.5, 1, 1],
  ["xs", 1, 1.5, 2],
  ["sm", 1.5, 2, 2.5],
  ["md", 2, 3, 4],
  ["lg", 3, 4, 6],
  ["xl", 4, 6, 8],
  ["2xl", 6, 8, 10],
  ["3xl", 8, 10, 12],
  ["4xl", 10, 12, 14],
  ["5xl", 12, 14, 16],
  ["6xl", 14, 16, 20],
  /* row */
  ["row-sm", 8, 10, 12],
  ["row-md", 10, 12, 14],
  ["row-lg", 12, 14, 16],
  ["row-xl", 14, 16, 20],
  ["row-2xl", 16, 20, 24],
  ["row-3xl", 20, 24, 28],
  ["row-4xl", 24, 28, 32],
  /* control */
  ["control-3xs", 3, 4, 5],
  ["control-2xs", 4, 5, 6],
  ["control-xs", 5, 6, 7],
  ["control-sm", 6, 7, 8],
  ["control-md", 7, 8, 9],
  ["control-lg", 8, 9, 10],
  ["control-xl", 9, 10, 11],
  ["control-2xl", 10, 12, 14],
  ["control-3xl", 12, 14, 16],
];

/** 高度族的前缀 → 注册后的工具类中缀（`--space-control-md` → `h-control-md`）。 */
export const SPACING_KINDS = ["row", "control"];
