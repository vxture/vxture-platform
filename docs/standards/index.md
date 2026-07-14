# 工程规范索引

> 面向工程师的研发规范，覆盖代码提交、国际化、工具函数等。
> AI 编码规范见 `docs/ai/`。

---

| 文件                                                                           | 内容                                                                             |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [`design-system.md`](design-system.md)                                         | DS 使用规范：应用侧禁止自建样式·组件·图标 / AI 行为约束 / 存量债务策略           |
| [`design-system-release.md`](design-system-release.md)                         | DS 版本发布规范：版本判断、dry run、真实发布、发布后验证                         |
| [`design-system-consumer-trial.md`](design-system-consumer-trial.md)           | DS 跨仓库消费试点验证：试点选择、安装验证、真实仓库接入流程                      |
| [`design-system-package-convergence.md`](design-system-package-convergence.md) | DS 包结构收敛规划：单包策略、样式分层、公开入口治理                              |
| [`font-system.md`](font-system.md)                                             | 字体体系：品牌字体 / 产品字体 / CJK / Mono 分层规范                              |
| [`locale-layer.md`](locale-layer.md)                                           | Locale 层规范：i18n key 命名、翻译文件结构                                       |
| [`utils-layer.md`](utils-layer.md)                                             | Utils 层规范：工具函数分层、命名约定                                             |
| [`git-workflow.md`](git-workflow.md)                                           | Git 工作流规范：分支策略、提交格式、PR 流程                                      |
| [`cicd-optimization-playbook.md`](cicd-optimization-playbook.md)               | CI/CD 提效 / 去冗余 playbook：去冗余触发、最小重建部署、覆盖缺口（可迁移方法论） |
| [`testing.md`](testing.md)                                                     | 测试策略：各层测试类型、禁止 mock DB、E2E 范围                                   |
| [`security.md`](security.md)                                                   | 安全规范：Secrets 管理、JWT 约束、各层安全边界、CORS                             |
| [`error-handling.md`](error-handling.md)                                       | 错误处理：统一响应格式、错误码命名、各层异常传播规则                             |
| [`logging.md`](logging.md)                                                     | 日志规范：日志级别、结构化格式、敏感字段过滤、各层约定                           |
| [`package-json.md`](package-json.md)                                           | package.json 规范：必填字段、命名、版本策略、脚本约定、锁定版本表                |
