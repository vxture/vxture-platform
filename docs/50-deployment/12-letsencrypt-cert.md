# Let's Encrypt 通配符证书（worker-01 nginx）

`.github/workflows/deploy-cert.yml` 通过 **DNS-01 challenge（Cloudflare API）** 为
`vxture.com` + `*.vxture.com` 签发一张浏览器可信的 Let's Encrypt 通配符证书,并部署到
worker-01 的 nginx。**签发全在 GitHub runner 里完成**,主机只接收两个 PEM 文件并 reload
nginx（最小服务器改动）。

目的:替换现有的 **Cloudflare Origin 证书**(只被 CF 边缘信任、浏览器不信任)。橙色云下换证
零用户影响;换成可信证书后,才能安全把 DNS 切到**灰色云(DNS-only)**,让大陆用户直连源站、
不再绕海外 CF PoP。

---

## 一次性 setup（你来做,只填一个 secret 值）

1. **创建 Cloudflare API Token**：Cloudflare → My Profile → API Tokens → Create Token
   → 用 **"Edit zone DNS"** 模板 → 权限 `Zone:DNS:Edit` + `Zone:Zone:Read` →
   Zone Resources 限 **vxture.com** → Create → 复制 token（只显示一次）。

2. **加为 GitHub secret**：仓库 Settings → Secrets and variables → Actions → New
   repository secret → 名字 **`CLOUDFLARE_DNS_API_TOKEN`** → 值粘贴上面的 token。

> 其余 secret 复用现有 CD 的：`TAILSCALE_OAUTH_CLIENT_ID/SECRET`、`DEPLOY_HOST_TAILNET`、
> `DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_SSH_PASSPHRASE` 与 var `TAILSCALE_OAUTH_CLIENT_TAG`
> —— 无需新增。

---

## 首次签发流程

1. **先 dry-run 验证链路**（不消耗真证书、不碰生产）：
   Actions → `deploy-cert` → Run workflow → 勾选 **dry_run = true** → Run。
   通过说明 CF token 权限 OK、DNS-01 能建/删 TXT、校验通过。

2. **正式签发 + 部署**：Actions → `deploy-cert` → Run workflow → **dry_run = false** → Run。
   流程：runner 签发通配符证书 → 入 tailnet → scp 证书到 worker-01 →
   备份现证书 → 覆盖 → `nginx -t`（不过则自动回滚)→ `nginx -s reload` → 打印新证书 issuer
   （应为 Let's Encrypt）。

3. **验证**（本地/任意）：
   ```
   echo | openssl s_client -connect 39.103.62.17:443 -servername vxture.com 2>/dev/null \
     | openssl x509 -noout -issuer     # 应为 Let's Encrypt
   ```

## 自动续期

`schedule: cron "23 4 6 * *"` 每月 6 号自动重签 + 部署（90 天证书始终保留 ≥60 天有效期）。
**刻意不设 `environment:` 审批门** —— 证书续期必须无人值守,否则会过期(等同故障);风险受控:
只改两个证书文件、`nginx -t` 把关、坏证书自动回滚到备份。

## 回滚

每次部署前自动备份到 `/srv/vxture/data/nginx/ssl/backup-<时间戳>/`。手动回滚:

```
ssh vxture-worker-01
SSLDIR=/srv/vxture/data/nginx/ssl/live/vxture.com
cp -a /srv/vxture/data/nginx/ssl/backup-<时间戳>/. "$SSLDIR/"
docker exec vxture-nginx nginx -t && docker exec vxture-nginx nginx -s reload
```

## 之后：切灰色云（拿延迟收益,你决定时机）

确认源站已是可信 LE 证书后,再在 Cloudflare 把要直连的域名 DNS 记录切 **DNS-only（灰色云）**。
⚠️ 灰色云后源站 IP 直接暴露(失去 CF WAF/DDoS)——安全权衡自评估;可只切受众在大陆的域名
(console/vxture/api),把需要 CF 防护的留橙色云。切后直连即 HTTP/2（源站已开）。

## 备注

- 首次排障时我曾在 worker-01 直接 `apt install certbot`（Phase 1）——本 CI/CD 方案**不用**它
  （签发在 runner 里),它只是无害的闲置包,可 `sudo apt-get remove certbot python3-certbot-dns-cloudflare` 清掉。
- LE 速率限:相同 SAN 重复证书 5/周。月度续期远低于;手动重触发别在一周内跑太多次真签发(测试用 dry-run)。
- 证书为 ECDSA（`--key-type ecdsa`,更小更快,浏览器与 CF 均支持)。
