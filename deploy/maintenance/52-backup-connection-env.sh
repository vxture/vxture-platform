#!/usr/bin/env bash
# deploy/maintenance/52-backup-connection-env.sh
# 备份首次重建服务器时用于保持连接能力的基础配置。
# @package  @vxture/repo
# @layer    Infrastructure
# @category deployment-script
# @author   AI-Generated
# @date     2026-06-05
#
# 运行：bash maintenance/52-backup-connection-env.sh
# 输出：$HOME/vxture-backup/connection/
set -euo pipefail

OWNER_USER="${SUDO_USER:-$(id -un)}"
OWNER_HOME="$(getent passwd "$OWNER_USER" | cut -d: -f6)"
BACKUP_ROOT="${BACKUP_ROOT:-$OWNER_HOME/vxture-backup}"
BACKUP_DIR="$BACKUP_ROOT/connection"

umask 077
mkdir -p "$BACKUP_DIR/home-ssh" "$BACKUP_DIR/system"

copy_if_exists() {
  local source="$1"
  local target="$2"

  if [ -e "$source" ]; then
    mkdir -p "$(dirname "$target")"
    cp -a "$source" "$target"
    echo "[OK] $source"
  else
    echo "[MISS] $source"
  fi
}

echo "=== Backup connection environment ==="
echo "Owner user: $OWNER_USER"
echo "Backup directory: $BACKUP_DIR"
echo ""

echo "==> SSH"
copy_if_exists "$HOME/.ssh" "$BACKUP_DIR/home-ssh/.ssh"
copy_if_exists "/etc/ssh/sshd_config" "$BACKUP_DIR/system/sshd_config"

echo ""
echo "==> Tailscale"
copy_if_exists "/etc/default/tailscaled" "$BACKUP_DIR/system/tailscaled.default"
if [ -d "/var/lib/tailscale" ]; then
  sudo cp -a /var/lib/tailscale "$BACKUP_DIR/system/tailscale-state"
  sudo chown -R "$OWNER_USER:$OWNER_USER" "$BACKUP_DIR/system/tailscale-state"
  echo "[OK] /var/lib/tailscale"
else
  echo "[MISS] /var/lib/tailscale"
fi

echo ""
echo "==> Docker"
copy_if_exists "/etc/docker/daemon.json" "$BACKUP_DIR/system/docker-daemon.json"
copy_if_exists "$HOME/.docker" "$BACKUP_DIR/home-ssh/.docker"

echo ""
echo "==> Firewall"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw status verbose > "$BACKUP_DIR/system/ufw-status.txt" || true
  echo "[OK] UFW status snapshot"
else
  echo "[MISS] ufw"
fi
copy_if_exists "/etc/ufw" "$BACKUP_DIR/system/ufw"

echo ""
echo "=== Done ==="
sudo chown -R "$OWNER_USER:$OWNER_USER" "$BACKUP_ROOT" 2>/dev/null || true
echo "Saved to: $BACKUP_DIR"
