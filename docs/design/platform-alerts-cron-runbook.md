# Platform Alerts 周频主机巡检 Runbook

> 目标：worker-01 上**主机侧 cron** 周频跑只读平台漂移检查（`51-check-platform-alerts.sh`），
> HIGH 发现时邮件告警。**绕开** GitHub `platform-alerts.yml`（env:production 审批门，cron 无法无人值守过门）。
> 脚本：`deploy/scripts/52-platform-alerts-cron.sh`（包装 51-check + 日志轮转 + curl-SMTP 告警）。

## 为什么是主机 cron（而非 GitHub cron）

- `platform-alerts.yml` 用环境级 `DEPLOY_*` 密钥 + **production 审批门** → 定时触发会堆 pending，过不了门。
- 检查脚本本就跑在 worker-01 上，主机 cron 最省事、无需新增 CI 只读凭证。
- worker-01 现成工具：仅 `curl`（无 mail/msmtp）→ 告警走 `curl --url smtps://` 复用平台 DirectMail SMTP
  （`/srv/vxture/runtime/secrets/platform-mail.env` 的 `SMTP_*`）。

## 一次性安装（worker-01，`ecs-user`）

脚本随 `deploy/` 部署包同步到 `/srv/vxture/deploy/scripts/`（或首次手动 scp）。然后：

```bash
# 1) 可执行 + 去除 CRLF（若从 Windows 同步）
chmod +x /srv/vxture/deploy/scripts/52-platform-alerts-cron.sh
sed -i 's/\r$//' /srv/vxture/deploy/scripts/52-platform-alerts-cron.sh

# 2) 验证 SMTP 告警路径（发一封测试信到指定收件人）
ALERT_RECIPIENT="<ops@example.com>" \
  bash /srv/vxture/deploy/scripts/52-platform-alerts-cron.sh --test

# 3) 安装 crontab：每周一 03:17（错开整点），收件人由 ALERT_RECIPIENT 指定
( crontab -l 2>/dev/null; \
  echo '17 3 * * 1 ALERT_RECIPIENT="<ops@example.com>" bash /srv/vxture/deploy/scripts/52-platform-alerts-cron.sh >> /srv/vxture/logs/platform-alerts/cron.out 2>&1' \
) | crontab -

crontab -l   # 确认
```

## 行为

- 每次运行日志 → `/srv/vxture/logs/platform-alerts/YYYY-MM-DD_HHMM.log`，保留最近 `RETAIN`（默认 26 ≈ 半年周频）。
- **仅当 HIGH>0**（51-check `exit 1`）发邮件；MEDIUM/LOW 只记日志（周频低噪）。`--test` 强制发信验证。
- 包装脚本**始终 exit 0**，HIGH 发现不把 crontab 条目标记为失败。
- 邮件主题 `[<host>] Platform Alerts — HIGH=n MEDIUM=n LOW=n`，正文含 HIGH/MEDIUM 明细 + 日志路径。

## 可调项（env / crontab 行）

| 变量              | 默认                                            | 说明          |
| ----------------- | ----------------------------------------------- | ------------- |
| `ALERT_RECIPIENT` | `SMTP_FROM`（发给自己）                         | 告警收件人    |
| `MAIL_ENV`        | `/srv/vxture/runtime/secrets/platform-mail.env` | SMTP 凭证文件 |
| `LOG_DIR`         | `/srv/vxture/logs/platform-alerts`              | 日志目录      |
| `RETAIN`          | `26`                                            | 保留日志数    |

## 频率

周频起步（周一 03:17）。漂移多为慢变量（证书到期 / 备份失败 / 容器不健康）；满盘已由部署链 auto-prune 兜住。
噪声大或需更快可调 cron 表达式。

## 运维备忘

- 卸载：`crontab -e` 删该行。
- 想集中在 GitHub Actions 看板 → 另配**非门控只读监控凭证**后把 `platform-alerts.yml` 的 cron 加回（独立决策）。
- 深度/临时巡检仍可手动触发 `platform-alerts.yml`（过一次审批门）或直接 `bash 51-check-platform-alerts.sh`。
