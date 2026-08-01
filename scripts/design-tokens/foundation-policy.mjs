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
  font: [
    [
      "brand",
      "'Funnel Display', Inter, 'Noto Sans SC', sans-serif",
      "品牌标题字体；Tailwind 的 font 命名空间只有 sans / serif / mono 三族，无标题族",
    ],
    [
      "cjk",
      "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      "中文优先栈，用于需强制中文字形的场合（正文栈里中文是回退位）",
    ],
  ],
  /**
   * 字号档的行高子键。上游给每个内置档都配了，扩展档必须补齐，否则排版角色落到
   * 该档时行高无处可取。取值延续同一条 4px 行盒栅格：10px→16px。
   *
   * 曾有一个 3xs=8px 档，已删：没有角色用它，且它是小号档下 body-xs 的落点——
   * 8px 中文读不了，字号偏好是无障碍设置，不该把文字推到读不了。
   *
   * ⚠ **不配字距子键。** 上游把 `--text-*--letter-spacing` 留空，我们也留空。
   *   曾按 Inter / Apple HIG 的逐尺寸曲线填过一版（小字放开、大字收紧，8px +0.04em
   *   到 60px −0.025em），逻辑成立，但收益与代价不成比例：整条曲线在我们的字号
   *   区间内最大只值 1.5px，却要求此后每加一个字号档都做一次字距判断，而且中英
   *   混排时任何拉丁字距都会同时作用到汉字上。默认零，需要时在使用处用
   *   `tracking-*` 显式声明——那是 v4 给的一等公民写法，不是打补丁。
   */
  text: [
    ["2xs", "0.625rem", "10px；正文五档以 body-md=14 为中心，往下需要 12 与 10 两格"],
    ["2xs--line-height", "1.6", "16px 行盒 / 10px 字号"],
  ],
  // v4 的 duration-* 是裸数值工具类，theme.css 里没有这一族，T2 的 fast / base /
  // slow 因此无 T1 可指。档位表本身是 Tailwind 文档给定的封闭集合，照录即可。
  "transition-duration": [
    ["75", "75ms", "Tailwind 时长档"],
    ["100", "100ms", "Tailwind 时长档"],
    ["150", "150ms", "Tailwind 时长档"],
    ["200", "200ms", "Tailwind 时长档"],
    ["300", "300ms", "Tailwind 时长档"],
    ["500", "500ms", "Tailwind 时长档"],
    ["700", "700ms", "Tailwind 时长档"],
    ["1000", "1000ms", "Tailwind 时长档"],
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
 * ease 曾用 Material 曲线覆盖 in/out/in-out，已按"扩展不是修改"的原则退回
 * Tailwind 取值；shadow 曾用自造的几何倍增阶梯，亦已退回。仅剩的两条是字体栈：
 * Tailwind 的 `--font-sans` / `--font-mono` 是**通用系统栈**，不含任何具体字体。
 * 品牌指定了 Inter / Noto Sans SC / Geist Mono，不覆盖则这些字体永远不生效——
 * 这不是"换个数"，而是该挡位按设计本就应由使用方填的内容。
 */
export const OVERRIDES = {
  "font/sans": {
    value:
      "Inter, 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    why: "平台正文字体为 Inter + Noto Sans SC，其后接 Tailwind 原栈作回退",
  },
  "font/mono": {
    value:
      "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Noto Sans Mono CJK SC', 'Liberation Mono', 'Courier New', monospace",
    why: "代码与数字等宽用 Geist Mono，其后接 Tailwind 原栈作回退",
  },
};

/**
 * 品牌与合成色：上游没有对应物，属 DS 私有。前缀在此登记，生成器据此把这部分
 * 从色板里分出来单独成文件。
 *
 * alpha 衍生值按用途配基色：≤22% 是叠加着色，用 `-600`；45% 是遮罩，用 `-950`。
 * 不要两个基色各铺一遍刻度。
 */
export const BRAND_COLOR_PATTERNS = [/^brand-/, /-alpha-\d+$/];
