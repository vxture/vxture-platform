/**
 * Shell-level shared types for the console shell chrome.
 * 视图（应用中心 / 控制台）与抽屉类型，供 AppShell / Header / ShellDrawer 共享。
 */

export type ShellView = "appcenter" | "console";

export type ShellDrawerType = "notifications" | "settings";

/** Varda 内联助手面板档位（与 @vxture/agent-studio-varda 的 VardaInlineMode 对齐）。 */
export type AssistantMode = "narrow" | "wide" | "full";
