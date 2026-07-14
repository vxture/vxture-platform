#!/usr/bin/env bash
# deploy/maintenance/60-restore-connection-env.sh
# 从用户目录备份恢复基础连接配置的旧入口。
# @package  @vxture/repo
# @layer    Infrastructure
# @category deployment-script
# @author   AI-Generated
# @date     2026-06-05
#
# 运行：bash maintenance/60-restore-connection-env.sh
# 输入：$HOME/vxture-backup/connection/
set -euo pipefail

OWNER_USER="${SUDO_USER:-$(id -un)}"
OWNER_HOME="$(getent passwd "$OWNER_USER" | cut -d: -f6)"
BACKUP_ROOT="${BACKUP_ROOT:-$OWNER_HOME/vxture-backup}"
BACKUP_DIR="$BACKUP_ROOT/connection"

copy_if_exists() {
  local source="$1"
  local target="$2"

  if [ -e "$source" ]; then
    mkdir -p "$(dirname "$target")"
    cp -a "$source" "$target"
    echo "[OK] $target"
  else
    echo "[MISS] $source"
  fi
}

echo "=== Restore connection environment ==="
echo "Owner user: $OWNER_USER"
echo "Backup directory: $BACKUP_DIR"
echo ""
echo "提示：当前建议拆分执行。Tailscale 请使用 deploy-manual-init/bootstrap/10-restore-connection-env.sh"
echo "本脚本仅恢复 Docker daemon、Docker login 和 UFW，不再恢复 SSH / Tailscale。"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
  echo "错误：找不到备份目录 $BACKUP_DIR" >&2
  exit 1
fi

echo "==> Docker"
if [ -f "$BACKUP_DIR/system/docker-daemon.json" ]; then
  sudo mkdir -p /etc/docker
  sudo cp -a "$BACKUP_DIR/system/docker-daemon.json" /etc/docker/daemon.json
  echo "[OK] /etc/docker/daemon.json"
fi
copy_if_exists "$BACKUP_DIR/home-ssh/.docker" "$HOME/.docker"

echo ""
echo "==> Firewall"
if [ -d "$BACKUP_DIR/system/ufw" ]; then
  sudo cp -a "$BACKUP_DIR/system/ufw" /etc/ufw
  echo "[OK] /etc/ufw"
fi

echo ""
echo "=== Done ==="
echo "建议手动执行：sudo systemctl restart docker"
echo "如需启用防火墙：sudo ufw enable"
