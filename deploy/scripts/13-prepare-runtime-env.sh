#!/usr/bin/env bash
# deploy/scripts/13-prepare-runtime-env.sh
# 准备 runtime 目录权限，并调用 12-generate-env-files.sh 同步运行参数模板。
# @package  @vxture/repo
# @layer    Infrastructure
# @category deployment-script
# @author   AI-Generated
# @date     2026-06-05
#
# 运行：bash scripts/13-prepare-runtime-env.sh
# 幂等：只创建缺失目录、修正 owner/权限、补齐缺失 env key，不覆盖已有真实值。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM_DIR="${PLATFORM_DIR:-/srv/vxture/runtime}"
SECRETS_DIR="$PLATFORM_DIR/secrets"
OWNER_USER="${OWNER_USER:-${SUDO_USER:-$(id -un)}}"
OWNER_GROUP="${OWNER_GROUP:-$(id -gn "$OWNER_USER" 2>/dev/null || printf '%s' "$OWNER_USER")}"

echo "=== Vxture Runtime Env Prepare ==="
echo "Runtime directory: $PLATFORM_DIR"
echo "Runtime owner:     $OWNER_USER:$OWNER_GROUP"

if [ "$(id -u)" -ne 0 ] && { [ ! -d "$PLATFORM_DIR" ] || [ ! -w "$PLATFORM_DIR" ]; }; then
  echo "Runtime directory is missing or not writable; escalating through sudo."
  exec sudo -n env \
    PLATFORM_DIR="$PLATFORM_DIR" \
    OWNER_USER="$(id -un)" \
    OWNER_GROUP="$(id -gn)" \
    bash "$0"
fi

mkdir -p "$SECRETS_DIR"

if [ "$(id -u)" -eq 0 ]; then
  chown -R "$OWNER_USER:$OWNER_GROUP" "$PLATFORM_DIR"
fi

chmod 700 "$PLATFORM_DIR" "$SECRETS_DIR"

OWNER_USER="$OWNER_USER" OWNER_GROUP="$OWNER_GROUP" PLATFORM_DIR="$PLATFORM_DIR" \
  bash "$SCRIPT_DIR/12-generate-env-files.sh"

echo "=== Runtime Env Prepare Done ==="
