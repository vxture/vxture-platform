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
   * 字号档的两个附属子键：行高与字距。
   *
   * ── 行高 ──
   * 上游给每个内置档都配了行高子键；两个扩展档必须补齐，否则排版角色落到这两档时
   * 行高无处可取。取值延续同一条 4px 行盒栅格：8px→12px、10px→16px。
   *
   * ── 字距 ──
   * 上游把 `--text-*--letter-spacing` **刻意留空**，填它正是这个槽位的用途。
   *
   * 字距是**字号的函数，不是角色的函数**：字体按某个视觉尺寸绘制（Inter 是 16px），
   * 放大后字面间隙按比例跟着放大，而人眼对松紧的感知不是线性的——大字显松要收，
   * 小字显挤要放。全大写另论，那与尺寸无关，留在角色层处理。
   *
   * 曲线锚定 Inter 自己发布的 dynamic metrics（约 11px 时 +0.02em，16–18px 归零，
   * 32px 约 −0.02em），与 Apple HIG 给 SF 的逐尺寸表形状一致。
   *
   * ⚠ 负端收敛到 −0.025em 为止，比通用表保守。`letter-spacing` 对中西文一视同仁，
   *   而汉字是全宽方块——Noto Sans SC 在更负的字距下会字字相撞。这是我们比
   *   纯拉丁字体的表多出来的约束。
   */
  text: [
    ["3xs", "0.5rem", "密集表格与角标；Tailwind 最小档 xs=0.75rem 仍偏大"],
    ["3xs--line-height", "1.5", "12px 行盒 / 8px 字号"],
    ["3xs--letter-spacing", "0.04em", "8px：字面挤在一起，需明显放开"],
    ["2xs", "0.625rem", "同上，介于 3xs 与 xs 之间"],
    ["2xs--line-height", "1.6", "16px 行盒 / 10px 字号"],
    ["2xs--letter-spacing", "0.03em", "10px"],
    ["xs--letter-spacing", "0.01em", "12px：微放"],
    ["sm--letter-spacing", "0em", "14px"],
    ["base--letter-spacing", "0em", "16px：Inter 的设计尺寸，不调"],
    ["lg--letter-spacing", "0em", "18px"],
    ["xl--letter-spacing", "-0.01em", "20px：起点，开始收紧"],
    ["2xl--letter-spacing", "-0.01em", "24px"],
    ["3xl--letter-spacing", "-0.015em", "30px"],
    ["4xl--letter-spacing", "-0.02em", "36px"],
    ["5xl--letter-spacing", "-0.025em", "48px"],
    ["6xl--letter-spacing", "-0.025em", "60px：负端到此为止，再紧汉字会撞"],
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
 */
export const BRAND_COLOR_PATTERNS = [/^brand-/, /-alpha-\d+$/];
