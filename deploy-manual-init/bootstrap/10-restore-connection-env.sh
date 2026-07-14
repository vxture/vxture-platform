#!/usr/bin/env bash
# deploy-manual-init/bootstrap/10-restore-connection-env.sh
# 恢复新服务器连接环境中的 Tailscale 配置。
# @package  @vxture/repo
# @layer    Infrastructure
# @category deployment-script
# @author   AI-Generated
# @date     2026-06-05
#
# 运行：bash 10-restore-connection-env.sh
# 输入：$HOME/vxture-backup/connection/
set -euo pipefail

OWNER_USER="${SUDO_USER:-$(id -un)}"
OWNER_HOME="$(getent passwd "$OWNER_USER" | cut -d: -f6)"
TARGET_HOSTNAME="${TARGET_HOSTNAME:-VXTURE_DEPLOY_HOST}"
BACKUP_ROOT="${BACKUP_ROOT:-$OWNER_HOME/vxture-backup}"
BACKUP_DIR="$BACKUP_ROOT/connection"

echo "=== Restore ${TARGET_HOSTNAME} connection environment ==="
echo "Owner user: $OWNER_USER"
echo "Backup directory: $BACKUP_DIR"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
  echo "错误：找不到备份目录 $BACKUP_DIR" >&2
  exit 1
fi

echo "==> Set server hostname"
current_hostname="$(hostname)"
if [ "$current_hostname" = "$TARGET_HOSTNAME" ]; then
  echo "[OK] hostname 已是 $TARGET_HOSTNAME"
else
  sudo hostnamectl set-hostname "$TARGET_HOSTNAME"
  echo "[OK] hostname: $current_hostname -> $TARGET_HOSTNAME"
fi

echo ""
echo "==> Install Tailscale if missing"
if command -v tailscale >/dev/null 2>&1; then
  echo "[OK] Tailscale 已安装: $(tailscale --version | head -n 1)"
else
  tailscale_codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  sudo curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${tailscale_codename}.noarmor.gpg" \
    -o /usr/share/keyrings/tailscale-archive-keyring.gpg
  sudo curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${tailscale_codename}.tailscale-keyring.list" \
    -o /etc/apt/sources.list.d/tailscale.list
  sudo apt-get update -y
  sudo apt-get install -y tailscale
  echo "[OK] Tailscale 安装完成"
fi

echo ""
echo "==> Restore Tailscale state"
if [ -d "$BACKUP_DIR/system/tailscale-state" ]; then
  sudo systemctl stop tailscaled 2>/dev/null || true
  sudo mkdir -p /var/lib
  sudo rm -rf /var/lib/tailscale
  sudo cp -a "$BACKUP_DIR/system/tailscale-state" /var/lib/tailscale
  sudo chown -R root:root /var/lib/tailscale
  echo "[OK] /var/lib/tailscale"
else
  echo "[MISS] $BACKUP_DIR/system/tailscale-state"
fi

if [ -f "$BACKUP_DIR/system/tailscaled.default" ]; then
  sudo cp -a "$BACKUP_DIR/system/tailscaled.default" /etc/default/tailscaled
  echo "[OK] /etc/default/tailscaled"
else
  echo "[MISS] $BACKUP_DIR/system/tailscaled.default"
fi

echo ""
echo "==> Start Tailscale"
sudo systemctl enable --now tailscaled
tailscale status || true

echo ""
echo "=== Done ==="
echo "如果未自动恢复在线状态，手动执行："
echo "  sudo tailscale up --hostname=$TARGET_HOSTNAME"
