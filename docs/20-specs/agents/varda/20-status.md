# Varda Rollout Task Checklist

## 一期收口

- [x] P2 - 补全 Varda 环境变量模板
- [x] P3 - 新增 Nginx SSE 路由配置，确保 `/varda/` 关闭 buffering
- [x] P4 - 修正 ConsoleShell 中 Varda sidebar 的并排布局兼容性
- [x] P4a - 将 admin 旧 AI assistant 入口替换为 Varda，并移除旧 admin assistant 路由
- [x] P5 - 同步架构文档与包图，补充 varda-bff、varda-server、varda 前端

## 二期预留

- [ ] VardaAuditLog repository 与执行审计链路
- [ ] 二次确认弹窗机制与 confirmed 字段落库
- [ ] 执行类 admin 工具：暂停租户、调整 plan、发送通知
- [ ] 执行类 console 工具：升降订阅与支付流程
- [ ] jti Redis 黑名单校验
