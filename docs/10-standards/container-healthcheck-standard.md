# 容器健康探测（healthcheck）标准

**用途**：给任意服务补齐 Docker healthcheck，作为部署就绪闸门 + 状态可视 + 排障入口。零一项目可直接套用。
**来源**：从 vxture 实战萃取，含 Next.js standalone 的真实大坑。
**版本**：1.0.0 ｜ **更新**：2026-06-09

---

## 1. 适用判定

每个长驻服务都应有 healthcheck。无状态前端、BFF、后端服务、反代均适用。一次性 job / init 容器不需要。

---

## 2. 做法（可直接复制的模式）

1. 每个服务加 `healthcheck`，探一个**轻量、无依赖**的 liveness 端点。
2. **探测工具只用镜像里已有的运行时**，不引入新依赖：
   - **Python**：`["CMD","python","-c","import urllib.request; urllib.request.urlopen('http://127.0.0.1:PORT/health', timeout=3)"]`
   - **Node / Next.js**：`["CMD","node","-e","fetch('http://127.0.0.1:PORT/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]`
   - **nginx**：`["CMD","nginx","-t"]`
   - 别盲赌 `busybox wget --spider`（不同构建支持不一）；要用就 `wget -q -O /dev/null URL`，或直接用语言运行时更稳。
3. 应用侧加一个 **dependency-free 健康路由**（不连 DB/Redis/上游，只证明进程在听）：
   - **Next.js App Router**：`app/api/health/route.ts` → `export function GET(){ return NextResponse.json({status:"ok"}) }`，配 `export const dynamic="force-dynamic"`、`runtime="nodejs"`。
   - **Python**：`/health` 返回 200 `"ok"`。
4. **参数**：`interval 30s` / `timeout 5s` / `retries 3` / `start_period`（给启动留足：Next ~20s，Python ~10–15s）。
5. **部署脚本用健康态做就绪闸门**：轮询直到全部 `healthy` 才算部署成功；长期不 healthy → warn，崩溃/退出 → fail。**坏镜像进不了"部署成功"。**

---

## 3. ⚠️ 最大的坑：Next.js standalone + Docker loopback 探活

**现象**：standalone 的 `server.js` 绑定 `process.env.HOSTNAME`，而 Docker 会自动把 `HOSTNAME` 设成**容器 ID** → 应用只监听容器 IP、**不监听 `127.0.0.1`** → `http://127.0.0.1:PORT` 探活永远连不上 → 容器卡在 `health: starting`，部署报 "not healthy after 60s"。
**为什么极易漏判**：经反向代理 / 服务名访问一切正常，只看"页面能开 / verify 过"会漏。

**修法**：Dockerfile runner 阶段加 `ENV HOSTNAME=0.0.0.0`（绑全网卡，loopback 可达，反代访问不受影响）。

### 通用原则（升级版）

**容器内应用一律监听 `0.0.0.0`，loopback 探活才可靠。**

逐框架自检（默认绑哪、需不需要改）：

| 运行时                    | 默认绑定                                | 动作                                            |
| ------------------------- | --------------------------------------- | ----------------------------------------------- |
| Next.js standalone        | `$HOSTNAME`（Docker 设成容器ID）        | **必须** `ENV HOSTNAME=0.0.0.0`                 |
| Node (express/fastify)    | 显式 `listen(port)` 默认 `::`/`0.0.0.0` | 通常 OK；勿写死 `127.0.0.1`                     |
| Python (uvicorn/gunicorn) | 取决于 `--host`                         | 显式 `--host 0.0.0.0`（vxture 本就如此,未踩坑） |
| Go (net/http)             | `:PORT` = 全网卡                        | OK                                              |
| Java (Spring)             | `0.0.0.0` 默认                          | OK；除非设了 `server.address`                   |

---

## 4. 必须知道的认知点

- **Docker `restart: always` 不会因 unhealthy 重启**：unhealthy 只是状态标记，Docker 本身不采取行动。
  - 要**运行时自愈** → 加 `autoheal` 边车；要**告警** → 额外脚本/监控。
  - 所以 healthcheck 开箱给你的是：**部署就绪闸门 + 状态可视 + 排障入口**，**不含运行时自愈**。

---

## 5. 验证（交付前必做）

- 部署后 `docker ps` 看 `(healthy)`。
- `docker inspect --format '{{json .State.Health}}' <container>` 看探测**历史 + 最后一次输出（退出码/stdout）** —— 排障神器。
- 实测确认部署日志出现 **"All containers healthy"**，而非 `starting`/`warn`。
  > vxture 正是靠这一步发现 Next 绑定坑；只看"部署 success / verify 过"会漏。

---

## 6. 落地清单（套用到新服务）

1. 应用加 `/api/health`（或 `/health`）dependency-free 路由。
2. compose 服务加 `healthcheck`（用本镜像运行时，探 `127.0.0.1`）。
3. Dockerfile 确认监听 `0.0.0.0`（Next：`ENV HOSTNAME=0.0.0.0`）。
4. 部署脚本加"轮询至 healthy"就绪闸门。
5. 部署后 `inspect` 健康历史确认全绿。
