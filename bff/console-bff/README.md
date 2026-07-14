# @vxture/bff-console

租户工作台专属 BFF，聚合 console 页面所需数据，委托 auth-bff 完成 JWT 签发。

完整接口契约与架构约束见 [`docs/packages/bff/console.md`](../../docs/packages/bff/console.md)。

---

## 关键约束

- 密码登录 / 租户切换均委托 auth-bff 执行，console-bff 只做 JWT 校验
- Session Cookie 使用平台级命名（`vx_tenant_access_token`），非 console 私有
- 租户范围的读写必须从 JWT 解析 tenantId，禁止接受 `?tenantId=` query 参数
