/**
 * deviations.mjs — DS 对设计稿取值的有依据偏离。
 *
 * DS 是真值源，设计稿只是输入且已证实会出错，因此必须允许有依据地覆盖导出值。
 * 覆盖只写在此处，逐条给出理由；生成物在对应行留下 `/* 偏离设计稿：… *\/` 注释，
 * 生成时逐条打印。规范见 docs/10-standards/065-design-token-pipeline.md §3.1.2。
 *
 * 只有色彩一族还需要偏离表：其余刻度（radius / shadow / ease / duration /
 * opacity / border-width / z-index / spacing）的语义层已随 T1 镜像 Tailwind 一并
 * 退役，没有产物可偏离。
 */

/**
 * 分类图表配色改用保留色相。
 *
 * T1 镜像 Tailwind 后色板做了减法，只留 neutral / red / amber / emerald / sky /
 * purple 六相加品牌色；设计稿给分类图表各取了 orange / teal / fuchsia / lime /
 * cyan 一档，正是被减掉的五个。为五条图表色养五个完整色阶不划算，故改用保留色相。
 *
 * ⚠ 可辨识度因此下降：brand（靛）、purple、sky 三者偏冷且相邻，六序列并置时
 *   2 号与 5 号最易混。若数据可视化确有需要，应把 teal / orange 作为**明确扩展**
 *   加回 foundation-policy 的 KEEP_HUES，而不是在此处东拼西凑。
 */
const CHART_WHY = "色板已减至六色相，原色相被弃用";
const CHART_HUES = ["amber", "emerald", "purple", "sky", "red"];
const chartRemap = (step) =>
  Object.fromEntries(
    CHART_HUES.map((hue, i) => [
      `chart/categorical/${i + 2}`,
      { to: `color/${hue}/${step}`, why: CHART_WHY },
    ]),
  );

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
    ...chartRemap("600"),
    "gradient/ai/to": { to: "color/purple/800", why: CHART_WHY },
  },
  "vx-Color-Dark": {
    ...chartRemap("400"),
    "gradient/ai/to": { to: "color/purple/700", why: CHART_WHY },
  },
};
