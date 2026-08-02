/**
 * recipes.ts - 组件视觉配方：跨组件恒定、但无法表达成 token 的类名片段。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Styles
 *
 * 为什么需要这一层：
 *
 * T2 能装下"值"（间距、圆角、颜色、时长），装不下"规则"——焦点环由哪三个类构成、
 * 按下去要不要位移、菜单展开时触发器变成什么样。shadcn 把这些烤进 62 个组件源码，
 * 代价是规则不可见、不可校验，改基调要改几十处。
 *
 * 我们抽出来：**规则只写一次，所有 cva 引用**。改基调改一处。
 *
 * ⚠ 这里只放**跨组件恒定**的片段。只有一个组件用到的写在它自己的 cva 里——
 *   放进来会让"配方"退化成公共类名垃圾桶，那就白抽了。
 *
 * 取值依据见 docs/10-standards/060-design-system.md §视觉规格，规格来源为 shadcn vega。
 */

/**
 * 所有可交互控件的公共底座：焦点环、禁用态、过渡。
 *
 * `ring-3` 而非 `ring-[3px]`：上游内置档位，任意值语法是 v3 思维残留。
 * `opacity-disabled` 而非 `opacity-50`：我们有语义档（0.45），对齐的是上游的
 * **做法**不是它的字面量——vega 写 50 是因为它没有这一族。
 */
export const interactive = [
  "outline-none",
  "transition-all duration-fast ease-standard",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-disabled",
].join(" ");

/**
 * 按下时下沉 1px。
 *
 * `not-aria-[haspopup]` 把菜单触发器排除在外——它按下去要弹面板，位移会让面板
 * 跟着抖。这条细节是照抄 vega 的，不是我们想出来的。
 */
export const pressable = "active:not-aria-[haspopup]:translate-y-px";

/** 菜单 / 下拉的触发器在面板展开期间保持高亮，否则展开后触发器看起来是"没按中"。 */
export const expandable =
  "aria-expanded:bg-muted aria-expanded:text-foreground";

/**
 * 校验失败态。挂在 `aria-invalid` 上而不是自定义 prop：无障碍属性本来就要写，
 * 让它同时驱动样式，就不会出现"标了 aria 但没变红"或反过来的偏差。
 *
 * 描边和光环用 alpha（要透出下面的内容），填充才用实色 muted 阶——见 060 判据。
 */
export const invalid = [
  "aria-invalid:border-destructive aria-invalid:ring-3",
  "aria-invalid:ring-destructive/20",
  "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
].join(" ");

/**
 * 内联图标的通用处理：不吃指针事件、不被压缩、未显式指定尺寸时随控件档走。
 */
export const inlineIcon =
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-icon-sm";

/**
 * 带图标时该侧内边距收紧。
 *
 * 图标的视觉重量比文字轻，两侧留一样的内边距会看起来偏内。调用方在图标上标
 * `data-icon="inline-start"`，这条选择器自动收紧对应一侧。
 */
export const iconInset = [
  "has-data-[icon=inline-start]:pl-sm",
  "has-data-[icon=inline-end]:pr-sm",
].join(" ");

/**
 * 圆角封顶：小尺寸控件不跟随基数一路变圆。
 *
 * `--radius` 调大时 24/32px 高的控件会先变成胶囊。封在 8px 上，
 * **这是"一个基数换基调"能安全成立的前提**。
 */
export const radiusClamp = "rounded-[min(var(--radius-md),8px)]";

/** 叠层（弹层 / 对话框 / 抽屉）的公共外观：面板圆角、描边、投影一致。 */
export const elevation = {
  popover: "rounded-md border border-border bg-popover shadow-raised",
  dialog: "rounded-xl border border-border bg-card shadow-dialog",
} as const;
