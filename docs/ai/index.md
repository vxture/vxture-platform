# AI 工作规范总览

> AI agent 在本项目工作时的完整规范体系。

---

## 规范文档

| 文件                                                         | 内容                                                                     | 优先级       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------ |
| [`01-coding-rules.md`](01-coding-rules.md)                   | AI 编码行为规则（操作范围 / 层边界 / 输出质量）                          | 必读         |
| [`02-coding-style.md`](02-coding-style.md)                   | TypeScript 约定 / 命名规则 / 导出风格                                    | 必读         |
| [`03-coding-comments.md`](03-coding-comments.md)             | 文件头模板 / JSDoc 格式 / 分区注释 / 中文注释要求                        | 必读         |
| [`04-coding-typescript.md`](04-coding-typescript.md)         | TypeScript 配置标准 / tsconfig 继承结构 / 严格模式策略                   | 必读         |
| [`05-bff-data-access-guide.md`](05-bff-data-access-guide.md) | BFF 层数据访问与前端对接：Pool 注入 / req.user / auth 委托 / Schema 速查 | BFF 任务必读 |
| [`port-allocation.md`](port-allocation.md)                   | 全局端口表 / 3NNX 规则 / 新服务登记流程                                  | 按需         |

## 工程合规审计

见 [`docs/audit/index.md`](../audit/index.md) — 审计规则、CI 门控、Prompt 模板、检查清单（已提升为独立目录）。

---

## 文档层级关系

```
根目录 AGENTS.md（全局强制规则，G1-G6）
    │
    └── docs/ai/（详细规范文档）
            ├── 01-coding-rules.md（AI 行为约束细则）
            ├── 02-coding-style.md（代码风格细则）
            ├── 03-coding-comments.md（注释格式细则）
            └── 04-coding-typescript.md（TypeScript 配置规范）
```

规则冲突时，以根目录 `AGENTS.md` 为准。
