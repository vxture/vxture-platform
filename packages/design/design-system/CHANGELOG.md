# @vxture/design-system — 更新日志

发布走 `publish-design-system.yml`（GitHub Packages `npm.pkg.github.com`）。版本规则见
`docs/standards/design-system-release.md`：新增公开入口为 minor，删除/改名入口为 major。

---

## 2.0.0 — 2026-06-29

外壳样式体系统一 + 旧 console 外壳包下线。**包含一处破坏性变更（删除 `styles/console.css` 入口）**，故升 major。当前外部消费者（多个业务智能体）均在早期开发阶段，影响有限——请按下方迁移建议一次性切齐，避免遗留技术债。

### ⚠️ Breaking

- **删除导出 `@vxture/design-system/styles/console.css`**（及其整包子模块：`console-base / console-shell-layout* / console-shell-chrome* / console-shell-drawer / console-tenant-switcher* / console-assistant / console-responsive`）。
  - 这是模板化之前的旧 console 外壳 CSS（`.vx-shell-*`、`.vx-tenant-switcher__*`、`.vx-assistant-*`、`.vx-appcenter`、`.console-loading` 等），已被新的共享外壳体系取代，平台内部已无人使用。

### ✨ Added

- **`@vxture/design-system/styles/shell-template.css`** —— 共享外壳视觉系统（逐字转写自设计稿的 `.app / .vxh / .sidebar / .assistant / .vela-*` 外壳 chrome + 其 token），console 与 admin 同源消费，是新外壳的唯一来源。
- **`@vxture/design-system/styles/shell-template-user-panel.css`** —— 仅"头像 + 用户下拉菜单"切片（template tokens + `.vxh-*` 用户面板规则，不含全局 reset / 完整外壳 chrome）。供只需要用户菜单、不要整套 app 外壳的应用（如门户/营销站）使用。
- Phosphor 图标字体不内置：宿主应用在 `app/layout.tsx` 用 `<link>` 加载 `@phosphor-icons/web`（外壳用 `ph ph-*` 类）。

### 🔧 Internal（对消费者无影响）

- `src/components/ui/*` 组件文件统一重命名为 PascalCase（如 `page-header.tsx` → `PageHeader.tsx`）。**公共导出符号不变**——`import { Button, PageHeader, … } from "@vxture/design-system"` 照常工作。仅当你绕过公共 `exports`、深路径 import 内部文件时才受影响（不应这样用）。

### 📦 消费者迁移建议（业务智能体）

1. 依赖升到 `^2.0.0`。
2. **若曾 `@import "@vxture/design-system/styles/console.css"`**：
   - 你渲染的是**应用外壳**（header/侧栏/助手三分区）→ 改用 `@vxture/design-system/styles/shell-template.css`，并按需用 `.app / .vxh / .sidebar / .assistant` 类（参考 console/admin portal 的 `layout/template/` 实现）。
   - 你只用了**用户头像下拉菜单** → 改用 `@vxture/design-system/styles/shell-template-user-panel.css`。
   - 你只用了**加载转圈 `.console-loading`** 等零散类 → 这些已随外壳下线移出 DS；请改用 DS 现有基础组件（如 `Skeleton`），或在你的应用内自留极小副本。
3. 组件按符号从包根导入即可，**不要深路径 import 内部文件**（`ui/` 已 PascalCase，公共 API 未变）。
4. 别忘了宿主 `app/layout.tsx` 用 `<link>` 加载 Phosphor 图标字体。

### 验证

- 平台内 console / admin / website 三端构建通过；design-system guardrail 0 violations；已上生产 `develop=beta=main`。
