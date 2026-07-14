# @vxture/bff-gateway

> 架构层参考：[`docs/architecture/05-bff-layer.md`](../../architecture/05-bff-layer.md)

---

## 包信息

| 项     | 值                         |
| ------ | -------------------------- |
| 包名   | `@vxture/bff-gateway`      |
| 路径   | `bff/gateway-bff/`         |
| @layer | `Application`              |
| 框架   | NestJS（轻量，仅路由转发） |

## 职责

浏览器侧统一 API 入口网关：将 portal 前端的所有 HTTP 请求路由到对应的专属 BFF（website-bff / console-bff / admin-bff），统一端口聚合，避免前端直连多个 BFF 端口。

## 核心约束

- 只做路由转发，**零业务逻辑，零鉴权**
- 不修改请求 body，不读取 JWT
- 鉴权由下游专属 BFF 负责
- 禁止在此处实现任何聚合逻辑

## 依赖约束

```typescript
✅ @vxture/shared / @vxture/core-config
❌ @vxture/service-* / core-auth / core-tenant / core-database
❌ 任何业务逻辑、鉴权逻辑
```

## 路由规则

按**路径前缀**分流，转发到对应 BFF（容器名直连，同 vx-platform 网络）：

```
/website-api/* → http://vx-website-bff:3011
/console-api/* → http://vx-console-bff:3021
/admin-api/*   → http://vx-admin-bff:3031
/health        → { status: "ok" }（网关自身健康检查）
```

Rate limiting **不在此处实现**，由各下游 BFF 独立负责。
