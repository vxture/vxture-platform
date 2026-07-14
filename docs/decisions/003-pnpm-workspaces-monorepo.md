# ADR-003: 采用 pnpm workspaces monorepo

**状态**：✅ Accepted
**日期**：2026-02-01

---

## 背景

平台由 35+ 个包组成（portals、agent-studio、bff、agent-server、services、core、shared、design、platform），这些包之间存在大量共享代码需求（类型、工具函数、基础设施原语）。

需要决定代码组织和包管理策略。

## 决策选项

### 选项 A：Polyrepo（独立仓库 + npm 发布）

每个包独立仓库，通过 npm 发布后被消费。

**缺点**：本地开发时每改一个底层包就要发版；版本矩阵管理复杂（`core@1.2.3` 到底和哪个 `service@2.x` 对应）；TypeScript 路径别名无法自动工作，需要 `tsc --build` 链。

### 选项 B：Lerna + npm workspaces

**缺点**：Lerna 已进入维护模式，npm workspaces 的 hoisting 策略容易产生幽灵依赖（ghost dependencies）——即可以引用未在自己 `package.json` 中声明的包。

### 选项 C：Nx monorepo

**缺点**：Nx 有较高的学习和配置成本，它的代码生成器和插件生态是主要价值，但当前团队规模和项目阶段不需要这一复杂度。

### 选项 D：pnpm workspaces + Turborepo

pnpm 管包（依赖隔离、本地链接），Turborepo 管速度（构建缓存、并行加速）。两者职责不重叠。

**pnpm 的核心价值**：

- 严格 symlink：禁止引用未声明的包（杜绝幽灵依赖）
- `workspace:*` 协议：本地包链接，改一个包立即在消费者中生效

**Turborepo 的核心价值（构建加速）**：

- **缓存**：输入文件未变化则直接复用上次构建输出，跳过重新编译
- **远程缓存**：CI 跨次共享构建结果，PR 构建复用 main 分支的缓存
- **并行**：无依赖关系的包同时构建，不排队等待

## 决策

采用**选项 D（pnpm workspaces + Turborepo）**，不引入 Nx（生成器能力对当前规模过重）。

## 后果

**正面：**

- 本地开发：`turbo build` 在输入不变时近乎瞬时完成（命中本地缓存）
- CI：远程缓存显著缩短 PR 流水线时间，未变更的包不重新构建
- 依赖声明严格：幽灵依赖在 pnpm 安装阶段即暴露，不等到运行时

**负面：**

- 所有开发者和 CI 必须安装 pnpm
- `turbo.json` pipeline 配置需随包结构变化维护
- 部分工具对 pnpm symlink 有兼容性问题（`.npmrc` 配置 `node-linker=hoisted` 可临时绕过）

---

_决策人：架构组 | 实施于：根目录 `pnpm-workspace.yaml`、`turbo.json`、所有包 `package.json`_
