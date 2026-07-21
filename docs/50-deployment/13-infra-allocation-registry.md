# 基建分配登记表(Infra Allocation Registry)

> **定位**:每产品/每主机的基建分配 **SoT**(§6#10,product_240 §2.7 登记表位)——端口、主机、stack_root、域名、镜像 namespace、tailnet 归属,一处登记、全局对账。
> **纪律**:新产品上主机**先在本表占行**(owner 拍板分配格)再动 DNS/compose/环境;两产品撞端口/撞目录 = 本表失职。运行态真值仍在 compose/nginx/workflow 文件,本表登记 + 指向;冲突时**以本表登记的分配意图为准**、修运行态。
> **来源**:2026-07-21 三路事实核验(compose/nginx/workflows/seed/140 §4–§6/product_240 §2.7);旧文档(00-overview §3 端口表、02-infrastructure)早于 `vx-platform-*` 迁名,以本表与现行 compose 为准。

## 1. 主机登记

| 主机             | 提供方/地理                  | 公网         | tailnet                 | 角色                                                                                            | registry profile                                                              |
| ---------------- | ---------------------------- | ------------ | ----------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **vx-worker-01** | Aliyun ECS·境内(2C2G)        | 39.103.62.17 | `100.100.197.42`        | **平台控制面**(vx-platform 栈 + vx-nginx 边缘)                                                  | 域内:ACR 内网 → 公网 ACR 兜底                                                 |
| **vx-worker-02** | 境内自有(8C24G,200G+3T RAID) | 无           | `100.76.219.48`         | 业务主机:varda 栈 + **arda 栈**(外仓 vxture-arda 部署)+ **vxtpl 栈**(外仓 vxture-template 演示) | 实况 ACR 内网→公网兜底(140 §4 非 VPC=GHCR 主源与 §5 存在标准内矛盾,实况从 §5) |
| **vx-worker-04** | Vultr·境外                   | 有(外仓管理) | **不在 tailnet,也不入** | umbra(ruyin.ai + VPN),本仓只读边界                                                              | 境外:GHCR + 公网 SSH                                                          |
| (beta 主机)      | 计划态                       | 待定         | 待定                    | 平台 beta 临时按量机,**未开通**                                                                 | —                                                                             |

> tailnet 无 MagicDNS,寻址一律 `IP:port`;worker-01 真实主机名在文档中脱敏为 `VXTURE_DEPLOY_HOST`。

## 2. 平台面(worker-01,非产品行)

宿主端口面 = **仅** nginx 80/443 + 三个 tailscale 接口绑定;其余服务容器内网、经 nginx 按 Docker DNS 名转发。

| 面               | 域名                                    | 容器:内口                                   | 宿主绑定                                     |
| ---------------- | --------------------------------------- | ------------------------------------------- | -------------------------------------------- |
| website          | vxture.com(www 301→apex)                | vx-platform-website:3000 / website-bff:3011 | —                                            |
| console          | console.vxture.com                      | vx-platform-console:3000 / console-bff:3021 | —                                            |
| admin            | admin.vxture.com                        | vx-platform-admin:3000 / admin-bff:3031     | —                                            |
| accounts(IdP)    | accounts.vxture.com(`/oidc/*`→auth-bff) | vx-platform-accounts:3000 / auth-bff:3090   | auth-bff `100.100.197.42:3090`(tailnet-only) |
| api 边缘         | api.vxture.com                          | vx-platform-gateway-bff:8000                | —                                            |
| **S2S 内网别名** | —(tailnet)                              | nginx→vx-platform-api:3041                  | `100.100.197.42:8080`(tailnet-only)          |
| model-platform   | —(tailnet LLM 网关)                     | vx-platform-service-model-platform:3100     | `100.100.197.42:3100`(tailnet-only)          |

镜像 namespace(单一权威 = `scripts/workflows/images.mjs`,13 个):`platform_*` 11 件 + `varda_bff`/`varda_agent`;容器前缀 `vx-platform-*` / `vx-varda-*`;ACR 实例 = cn-beijing(2026-07-15 迁,org vars `ALIYUN_ACR_{REGISTRY,INTERNAL_HOST,NAMESPACE}`,标准记实际 namespace = `vx-platform`)。stack_root:deploy 包 `/srv/vxture/deploy`、运行态 env `/srv/vxture/runtime`、数据 `/srv/vxture/data`。

## 3. 产品分配表(每产品一行;**空格 = 待 owner 拍板,不得自取**)

| product       | 主机            | 端口对(prod/beta)              | 域名(prod / beta)                             | stack_root                                        | 容器/compose 前缀           | DB(名/角色)                                               | tailnet                              | 状态                                          |
| ------------- | --------------- | ------------------------------ | --------------------------------------------- | ------------------------------------------------- | --------------------------- | --------------------------------------------------------- | ------------------------------------ | --------------------------------------------- |
| **arda**      | worker-02       | **3230 / 3231**                | arda.vxture.com / beta-arda.vxture.com        | 外仓自持(org 约定 `/srv/md0/arda`,待 arda 线对账) | `arda-*`(arda-app/arda-db…) | 现 `arda`(整改→`vxturebiz_arda_{beta,prod}` + `arda_svc`) | ✔(worker-01 nginx 经 tailscale 回源) | **在产**                                      |
| **varda**     | worker-02       | 3121(bff)/3122(server),无 beta | 无域名(L0 内嵌,console/admin `/varda/*` 反代) | `/srv/md0/varda/deploy`                           | `vx-varda-*`                | varda-pg(栈内私有)                                        | ✔                                    | **在产**                                      |
| **vxtpl**     | worker-02       | **3232**(演示,无 beta)         | vxtpl.vxture.com                              | `/srv/md0/vxtpl`                                  | `vxtpl-*`                   | `vxturebiz_vxtpl_{env}` + `vxtpl_svc`(模板规则)           | ✔(worker-01 nginx 经 tailscale 回源) | **在产(vxture-template 演示产品,2026-07-21)** |
| **umbra**     | worker-04       | 外仓管理                       | ruyin.ai(**无 beta,刻意**)                    | 外仓                                              | 外仓                        | 外仓                                                      | ✘(境外不入)                          | 在产(外仓)                                    |
| atlas         | 待分配          | 待分配                         | atlas.vxture.com / 待分配                     | 待分配                                            | `atlas-*`                   | `vxturebiz_atlas_{env}` + `atlas_svc`                     | 入 tailnet(类 2)                     | 未部署(env 名已预留 `ATLAS_*_BASE_URL`)       |
| ontos         | 待分配          | 待分配                         | ontos.vxture.com / 待分配                     | 待分配                                            | `ontos-*`                   | `vxturebiz_ontos_{env}` + `ontos_svc`                     | 入 tailnet                           | 未部署(env 已预留)                            |
| runa          | 待分配          | 待分配                         | runa.ai / 待分配                              | 待分配                                            | `runa-*`                    | `vxturebiz_runa_{env}` + `runa_svc`                       | 入 tailnet                           | 未部署(env 已预留)                            |
| karda         | 待分配          | 待分配                         | karda.vxture.com(建议值,DNS/证书随接入)       | 待分配                                            | `karda-*`                   | `vxturebiz_karda_{env}` + `karda_svc`                     | 入 tailnet                           | 未接入(seed/env 均无)                         |
| terra         | 待分配          | 待分配                         | terra.vxture.com(建议值)                      | 待分配                                            | `terra-*`                   | `vxturebiz_terra_{env}` + `terra_svc`                     | 入 tailnet                           | 未接入(seed/env 均无)                         |
| raven         | 待分配          | 待分配                         | raven.vxture.com / 待分配                     | 待分配                                            | `raven-*`                   | `vxturebiz_raven_{env}` + `raven_svc`                     | 入 tailnet                           | 未部署(env 已预留)                            |
| anlan         | 待分配          | 待分配                         | anlan.ai / 待分配                             | 待分配                                            | `anlan-*`                   | `vxturebiz_anlan_{env}` + `anlan_svc`                     | 入 tailnet                           | 未部署(env 已预留)                            |
| forge         | 待分配          | 待分配                         | forge.vxture.com / 待分配                     | 待分配                                            | `forge-*`                   | `vxturebiz_forge_{env}` + `forge_svc`                     | 入 tailnet                           | 未部署(env 已预留)                            |
| xuanzhen      | 待分配          | 待分配                         | xuanzhen.ai / 待分配                          | 待分配                                            | `xuanzhen-*`                | `vxturebiz_xuanzhen_{env}` + `xuanzhen_svc`               | 入 tailnet                           | 未部署(env 已预留)                            |
| ruyin(client) | —(desktop 分发) | —                              | ruyin.vxture.com(web 面)                      | —                                                 | —                           | ✘(不进 entitlement 引擎)                                  | —                                    | client 已注册                                 |
| hermes        | —(平台内部)     | —                              | 无                                            | —                                                 | —                           | —                                                         | —                                    | internal                                      |

> 本地 dev 端口(seed `B` map 3000–3089)是**本地回落值**,非生产绑定,不占本表端口位。

## 4. 新产品分配规则(登记时逐格适用)

1. **域名**:`{code}.vxture.com` 缺省规则(product_100 §2 已有异 apex 例外:runa.ai/anlan.ai/xuanzhen.ai);beta = `beta-{code}.vxture.com`(arda 先例)。
2. **端口对**:每产品一对 prod/beta 宿主发布口(template `APP_PUBLISH_PORT`)。**建议(待 owner 拍板)**:沿 arda 先例按 `32X0/32X1` 递增分配(arda=3230/3231,下一产品 3240/3241…),避开 worker-02 已占 3121/3122。分配即写入本表,不写默认值进模板。
3. **stack_root**:org 约定 `/srv/md0/{code}`(beta `/srv/md1/{code}-beta`);`DEPLOY_DIR` 必须精确到含 compose + `.env.*` 的那一层(140 §6)。
4. **容器/DB/镜像**:`PRODUCT_CODE` 级联(product*240 §2.7)——容器 `{code}-app/{code}-redis/{code}-db`、镜像 `{code}-app`、DB `vxturebiz*{code}\_{env}`+`{code}\_svc`角色、平台侧密钥`{CODE}\_PROVISION_WEBHOOK_SECRET`/`{CODE}\_WEBHOOK_BASE_URL`。
5. **tailnet**:类 2 产品(平台 tailnet 内)一律入网,S2S 走内网、绝不公网(product_230 §1);境外/异网 = 类 1(umbra 模式)。
6. **GitHub Environment**:每部署目标一个 Environment(`DEPLOY_HOST/USER/SSH_KEY/KNOWN_HOSTS(必填)/DIR` + `ENV_FILE_BASE64` bootstrap),production/产品环境**必配 Required reviewers**(140 §6)。

## 5. 已知未知(不猜,补齐后回填)

- worker-02 云厂商名、arda 在 worker-02 的实际 stack 目录与完整容器清单(外仓,待 arda 线对账回填);
- worker-04/umbra stack_root(外仓);
- org vars `ALIYUN_ACR_*` 活值(cn-beijing 实例,控制台侧);
- karda/terra 全部分配格(未接入);beta 主机开通计划。

## 6. 关联

- `product_240` §2.7(PRODUCT_CODE 级联 + 登记表位)· `140` §4–§6(CD/环境/密钥)· `product_230` §1(传输面分级)· `00-overview.md`(主机硬件面)· `08-code-environment-map.md`(代码↔环境映射)。
