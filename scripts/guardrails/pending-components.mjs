/**
 * pending-components.mjs — 尚未按 T2 重写的组件清单。
 *
 * 单独成文件是为了让检查脚本与 design-preview 的统计卡读同一份。之前统计卡里写的是
 * 一个手抄的数字，清单减了它没跟着减，读者看到的是个早已不成立的数。
 *
 * 每重写完一件就从这里删掉一行，清空即可连同本文件一并删除。
 */

export const PENDING_COMPONENTS = [
  // 仍挂 .vx-* 遗留类名，去向待定（两件都有真实消费方：accounts 6 个文件用
  // AuthLogin，website 的 Header 用 ShellChrome 的三件，不能直接删）
  "AuthLogin.tsx",
  "ShellChrome.tsx",
];
