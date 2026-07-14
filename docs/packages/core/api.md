# @vxture/core-api

> ⚠️ 待大版本重构 | 迁移自 `packages/core/api/AGENTS.md`
> 架构层参考：[`docs/architecture/03-core-layer.md`](../../architecture/03-core-layer.md)

---

## 包信息

| 项     | 值                   |
| ------ | -------------------- |
| 包名   | `@vxture/core-api`   |
| 路径   | `packages/core/api/` |
| @layer | `Infrastructure`     |

## 职责

统一 HTTP 请求基础设施：请求封装、拦截器、错误标准化、retry / timeout。
供 BFF、Service、Agent Server 层使用。Node.js 专用（服务端）。

## 目录结构

```
src/
├── client/       # *.client.ts  — 基于 @nestjs/axios 封装
├── module/       # *.module.ts  — 全局 HTTP 模块
├── types/        # *.types.ts   — 请求 / 响应类型
├── utils/        # *.utils.ts   — retry、timeout、错误处理
└── index.ts
```

## 依赖约束

**允许：**

- `@vxture/shared`
- `@nestjs/common` / `@nestjs/core` / `@nestjs/axios`（peerDependencies）
- `axios`（peerDependency）
- `form-data`（文件上传）

**禁止：**

- 浏览器 API（fetch、localStorage、window）
- `@vxture/service-*` / `bff-*` / `ai-sdk` / `design-system` / `platform-*`
- 业务逻辑
