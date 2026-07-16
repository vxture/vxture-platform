# ADR-002: 全链路使用完整 BCP47 语言标签

**状态**：✅ Accepted
**日期**：2026-03-16

---

## 背景

平台 i18n 初期采用 `zh` / `en` 简写格式作为 locale 标识（产品尚未正式上线）。发现以下问题：

- `<html lang="zh">` 不符合 W3C 规范，`lang` 属性值应为完整 BCP47 标签（如 `zh-CN`）
- URL 路径 `/zh/page` 与 `Intl.DateTimeFormat('zh')` 语义不一致——前者被推断为简体中文，但 `zh` 实际上不区分简繁体
- next-intl 等国际化库期望完整 BCP47 标签，需要维护 `zh → zh-CN` 的映射转换层
- 未来若需支持 `zh-TW`（繁体中文），当前 `zh` 类型系统无法区分

## 决策选项

### 选项 A：保持 zh/en 简写，调用 Intl API 时手动映射

维持 URL `/zh/`，在调用 `Intl.*` 和设置 `<html lang>` 时通过映射表转换。

**缺点**：映射表需要在多处维护（shared、core-locale、portals），增加遗漏风险；`zh` 语义模糊（简体/繁体/通用？）。

### 选项 B：全链路使用完整 BCP47 标签（zh-CN / en-US）

TypeScript 类型、URL 路径段、HTML lang 属性、next-intl 配置、Intl API 调用全部统一为完整标签。

**优点**：零映射，标准兼容，语义无歧义，未来添加 zh-TW 只需在类型联合中追加。
**缺点**：URL 路径段更长（`/zh-CN/` vs `/zh/`）。

### 选项 C：自定义标签系统（如 zh_cn / en_us）

**缺点**：偏离所有国际化工具的预期，需要适配层，纯粹的负担。

## 决策

采用**选项 B**，全链路 BCP47。

产品上线前完成全面重构，不存在 `/zh/` 的历史生产流量，无需兼容旧路径。

## 后果

**正面：**

- URL / HTML lang / Intl API / next-intl 完全对齐，无映射层
- `Locale` 类型精确（`'zh-CN' | 'en-US'`），TypeScript 类型安全
- 未来添加 `zh-TW`、`ja-JP` 等无需修改现有逻辑
- 与 W3C、Google、Apple 等大厂 URL 规范一致

**负面：**

- URL 路径段更长（`/zh-CN/` vs `/zh/`）
- 翻译文件目录从 `messages/zh/` 重命名为 `messages/zh-CN/`（一次性重构成本，已完成）

---

_决策人：架构组 | 实施于：`@vxture/shared` locale 类型、`@vxture/core-locale`、`portals/website` middleware_
