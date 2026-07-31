/**
 * index.ts - @vxture/design-ui 公共 API。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Index
 *
 * 本包是**无状态的组件层**：基础组件、平台图案、图标、hook 与工具函数。
 * 只依赖 @vxture/design-tokens，不含任何运行时接线——主题、密度、字号偏好这些
 * 带 React context 的东西在 @vxture/design-system。
 *
 * 依赖方向是单向的：tokens ← ui ← system。ui **禁止** import system，
 * 由 lint:boundaries 硬门守。反过来才对：shell 与 auth 消费 ui。
 */

export * from "./components/ui";
export * from "./components/layout";
export * from "./components/ai";
export * from "./icons";
export * from "./hooks";
export * from "./utils";
export * from "./types";
