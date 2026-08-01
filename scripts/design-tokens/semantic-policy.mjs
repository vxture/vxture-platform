/**
 * semantic-policy.mjs — T2 各刻度族的语义定义。
 *
 * 每一族回答的都是同一个问题："这个挡位用在什么场合"。取值尽量引 T1（即上游），
 * 上游没有对应维度的（叠放次序、透明度、描边宽度）才落字面量。
 *
 * 本文件与 color-policy / typography-policy 三者构成 T2 的**全部输入**，
 * 每条决策带理由。生成物不得手工编辑。
 */

/**
 * ── 叠放阶梯（z-index）──
 *
 * 无 T1 可指：v4 的 z-* 是裸数值工具类，上游 theme 里没有 z 这一族，而且叠放次序
 * 本来也不是"量纲"——500 不是某个测量值的第 500 档，它只是一个序。故 T2 落字面量。
 *
 * 逐档必须互异：同值时叠放次序由 DOM 顺序决定而非层级意图，是静默的 bug。
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
 * 按组件角色命名而非序数档位。序数不携带信息——"elevation-3"不告诉任何人它该
 * 用在哪，而"dialog"会。
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
 * 取值一律用 Tailwind 的 in / out / in-out。这里定的是**哪个方向用哪条曲线**——
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
 * 五档全部落在 Tailwind 的时长档上，故 T1 有对应原子可指。
 */
export const DURATION_ROLES = [
  ["instant", "75", "状态色切换等无位移反馈"],
  ["fast", "150", "hover / focus 等即时反馈"],
  ["base", "200", "默认过渡：展开、切换"],
  ["slow", "300", "浮层进出、抽屉滑动"],
  ["slower", "500", "页面级转场"],
];

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

/**
 * 圆角挡位，按 Tailwind 标签列。
 *
 * 取值来自 T1（即上游），故本族目前是恒等别名；保留它是为分层边界完整，
 * 见 060 §1.1，将来引入角色名（rounded-control / rounded-card）时长出内容。
 *
 * 未列 `none` 与 `full`：v4 把 `rounded-none` / `rounded-full` 实现为**静态工具类**，
 * 不读主题变量，注册了也不会被用到。
 */
export const RADIUS_STEPS = ["xs", "sm", "md", "lg", "xl", "2xl"];

/**
 * 描边宽度。
 *
 * 不设 `none` 档：v4 的 `border-none` 是 `border-style: none` 的静态工具类，
 * 注册 `--border-width-none` 会让同一个类名同时有"无边框样式"与"零宽度"两种
 * 来源，语义打架。要零宽度用 `border-0`。
 */
export const BORDER_WIDTHS = [
  ["thin", "1px", "默认描边：卡片、输入框、分隔"],
  ["medium", "2px", "强调描边：选中态、焦点框"],
  ["thick", "4px", "结构性描边：侧栏指示条、状态色条"],
];

/**
 * 透明度语义。上游对 opacity 既无 theme 变量也无封闭档位表（接受任意 0–100），
 * 没有原子层可指，故本族落字面量。
 *
 * 不设 `full`（1）档：它不表达任何决策，`opacity-100` 即是。
 *
 * ⚠ overlay(0.5) 低于 subtle(0.6)——本族是角色表不是单调阶梯，
 *   遮罩要压住底下的内容，比"次要文字"更不透明是对的。
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
/*
 * 六档取值对齐行业公共集（Material / Carbon / Fluent / shadcn 都有的档）：
 * 12 / 16 / 20 / 24 / 32 / 48。48 以上不是图标是图形，走 MEDIA_SIZES。
 * 曾有的 10 / 14 / 56 / 64 四档已删：14 五家皆无，是本仓自造并把上游的 16 挤到了 md。
 */
export const ICON_SIZES = [
  ["xs", 3],
  ["sm", 4],
  ["md", 5],
  ["lg", 6],
  ["xl", 8],
  ["2xl", 12],
];

/*
 * 32 / 48 / 64 / 80 / 96 / 128 / 192。低段等距（+16）便于头像与缩略图挑档，高段翻倍
 * 供插画与空状态主图。整条刻度从 24 起提到 32 起——24–40 那一段是图标容器不是媒体框，
 * 归 ICON_SIZES 与控件高度管。
 */
export const MEDIA_SIZES = [
  ["xs", 8],
  ["sm", 12],
  ["md", 16],
  ["lg", 20],
  ["xl", 24],
  ["2xl", 32],
  ["3xl", 48],
];

/**
 * 内容宽度：可读行长上限。
 *
 * 页面宽度不在此列——它逐档等于 T1 的断点，从断点派生即可，不需要第二份清单。
 *
 * 分档依据是行长而非视口：正文类 640–768、应用内容 1280–1536、数据密集型面板
 * 至多 1920；再宽应改分栏而非加宽。
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
