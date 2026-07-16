# 本地开发环境启动指南

> 更新：2026-05-14

---

## 前置条件

| 工具           | 版本要求 | 说明                    |
| -------------- | -------- | ----------------------- |
| Node.js        | ≥ 22.x   | 推荐通过 nvm 管理       |
| pnpm           | ≥ 9.x    | `npm install -g pnpm`   |
| Docker Desktop | ≥ 4.x    | 运行 PostgreSQL + Redis |
| Git            | ≥ 2.40   |                         |

可选：

- **Tailscale**：连接到 VXTURE_DEPLOY_HOST/02 节点（远程调试用）
- **VS Code**：推荐扩展 ESLint、Prisma、TypeScript

---

## 一次性初始化

```bash
# 1. 克隆仓库
git clone https://github.com/vxture/vxture.git
cd vxture

# 2. 安装所有依赖（pnpm workspace 自动链接本地包）
pnpm install

# 3. 启动基础设施（PostgreSQL + Redis）
docker compose -f docker/dev.compose.yml up -d

# 4. 配置环境变量（从模板复制，按需填写）
cp .env.example .env.local

# 5. 生成 Prisma Client
pnpm -F @vxture/core-database db:generate

# 6. 运行数据库迁移（创建表结构）
pnpm -F @vxture/core-database db:migrate:dev
```

---

## 按工作类型启动服务

不同工作内容需要启动的服务不同，**只启动你需要的**。

### 场景 A：修改 portals（website / admin / console）

```bash
# 必须运行
pnpm -F @vxture/bff-auth dev          # port 3090
pnpm -F @vxture/bff-gateway dev       # port 8000

# 按需选一个 portal
pnpm -F @vxture/website dev           # port 3010
pnpm -F @vxture/admin dev             # port 3030
pnpm -F @vxture/console dev           # port 3020

# 对应的 BFF
pnpm -F @vxture/bff-website dev       # port 3011
pnpm -F @vxture/bff-console dev       # port 3021
pnpm -F @vxture/bff-admin dev         # port 3031
```

### 场景 B：修改 Varda 功能

```bash
pnpm -F @vxture/bff-auth dev          # port 3090
pnpm -F @vxture/bff-varda dev          # port 3121
pnpm -F varda-server dev               # port 3122
pnpm -F @vxture/bff-admin dev         # port 3031（Varda 宿主）
pnpm -F @vxture/admin dev             # port 3030
```

### 场景 C：修改 auth / 认证流程

```bash
pnpm -F @vxture/bff-auth dev          # port 3090
# 无需其他服务，直接用 curl / Postman 测试接口
```

### 场景 D：修改 Service 层 / Core 层

```bash
# 通常只需要单元测试，无需启动任何服务
pnpm -F @vxture/service-iam test:watch
pnpm -F @vxture/core-locale test:watch
```

---

## 环境变量说明

`.env.local` 最小配置（本地开发）：

```bash
# 数据库（docker compose 默认值）
DATABASE_URL=postgresql://vxture:vxture@localhost:5432/vxture_dev
REDIS_URL=redis://localhost:6379

# JWT（本地随机值即可，不要与生产共用）
JWT_SECRET=local-dev-jwt-secret-at-least-64-chars-long-xxxxxxxxxx
JWT_REFRESH_SECRET=local-dev-refresh-secret-at-least-64-chars-long-xxxxxxxxxx
JWT_ACCESS_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d

# 内部服务鉴权
AUTH_INTERNAL_TOKEN=local-dev-internal-token

# Cookie 域（本地开发用 localhost）
AUTH_COOKIE_DOMAIN=localhost
```

OAuth（DingTalk / Feishu / WeChat Work）：本地开发不需要配置，登录时跳过第三方登录即可。

---

## 常见问题

**`pnpm install` 失败：**

```bash
# 检查 pnpm 版本
pnpm --version  # 需要 ≥ 9.x

# 清除缓存重试
pnpm store prune && pnpm install
```

**Prisma Client 未生成（`@prisma/client` 找不到类型）：**

```bash
pnpm -F @vxture/core-database db:generate
```

**端口冲突：**

```bash
# 查看占用端口的进程
netstat -ano | findstr :3090   # Windows
lsof -i :3090                  # macOS/Linux
```

**数据库连接失败：**

```bash
# 检查 docker 容器是否运行
docker compose -f docker/dev.compose.yml ps
docker compose -f docker/dev.compose.yml logs postgres
```

---

## 开发工作流

```
修改代码（Next.js / NestJS 均支持热重载）
    │
    ▼
类型检查（无需手动运行，IDE 实时提示）
    │
    ▼
单元测试（pnpm -F <package> test:watch）
    │
    ▼
提交前钩子（Husky）自动运行：ESLint + dep-cruiser 边界检查
    │
    ▼
git commit（Conventional Commits 格式）
```

提交格式参见 `docs/10-standards/git-workflow.md`。
