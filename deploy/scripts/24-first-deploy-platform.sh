#!/usr/bin/env bash
# deploy/scripts/24-first-deploy-platform.sh
# 聚合首次部署数据库初始化和平台启动流程。
# @package  @vxture/repo
# @layer    Infrastructure
# @category deployment-script
# @author   AI-Generated
# @date     2026-06-07
#
# 运行：CONFIRM_FIRST_DEPLOY=yes bash scripts/24-first-deploy-platform.sh
# 约束：只用于首次部署或应用层 reset 后；常规升级使用 31-regular-upgrade-platform.sh。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

run_step() {
  local label="$1"
  shift
  echo ""
  echo "==> $label"
  "$@"
}

if [ "${CONFIRM_FIRST_DEPLOY:-}" != "yes" ]; then
  echo "错误：首次部署聚合脚本需要显式确认。" >&2
  echo "请确认后运行：CONFIRM_FIRST_DEPLOY=yes bash scripts/24-first-deploy-platform.sh" >&2
  exit 1
fi

cd "$COMPOSE_DIR"
echo "=== Vxture First Deploy Platform ==="
echo "流程：21 -> 22 -> 27 -> 23 -> 25 -> 30 -> 40"
echo "注意：runtime env、Nginx 配置和 TLS 证书必须已准备完成。"
echo "注意：首次运行时 25（签名密钥 provision）会打印私钥后中止——把它粘贴到"
echo "      secrets/platform-identity.env 后整体重跑本脚本（各阶段幂等）。"

run_step "21 检查平台数据库" bash "$SCRIPT_DIR/21-prepare-platform-database.sh"
run_step "22 执行平台数据库 migration" env SKIP_DB_CHECK=1 CONFIRM_MIGRATE=yes bash "$SCRIPT_DIR/22-run-platform-migrations.sh"
# 27 must run before 23: it writes OIDC_CLIENT_SECRET_HASH_* into .env.auth-bff,
# which 23-seed projects into iam.oidc_client. Skipping it → NULL hash → RP token
# exchange 401 invalid_client.
run_step "27 provision 客户端密钥" env CONFIRM_PROVISION_SECRETS=yes bash "$SCRIPT_DIR/27-provision-client-secrets.sh"
run_step "23 执行平台初始 seed" env SKIP_DB_CHECK=1 CONFIRM_SEED=yes bash "$SCRIPT_DIR/23-seed-platform-database.sh"
run_step "25 provision 签名密钥" env SKIP_DB_CHECK=1 CONFIRM_PROVISION_KEY=yes bash "$SCRIPT_DIR/25-provision-signing-key.sh"
run_step "30 启动平台栈" bash "$SCRIPT_DIR/30-deploy-platform-stack.sh"
run_step "40 验证平台运行态" bash "$SCRIPT_DIR/40-verify-platform-runtime.sh"

echo ""
echo "=== First deploy flow done ==="
echo "提示：常态漂移巡检（51-check-platform-alerts.sh）由 platform-alerts 定时 workflow 负责，不在首次部署链内重复执行。"
