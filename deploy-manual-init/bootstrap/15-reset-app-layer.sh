#!/usr/bin/env bash
# deploy-manual-init/bootstrap/15-reset-app-layer.sh
# 原服务器应用层 reset，保留系统级连接与主机配置。
# @package  @vxture/repo
# @layer    Infrastructure
# @category bootstrap-script
# @author   AI-Generated
# @date     2026-06-05
#
# 运行：sudo CONFIRM_RESET_APP=yes bash 15-reset-app-layer.sh
# 说明：清理部署代码、runtime、平台容器和平台数据；不修改 SSH、Tailscale、Docker、UFW、fstab。
set -euo pipefail

DATA_DIR="${DATA_DIR:-/srv/vxture/data}"
DEPLOY_DIR="${DEPLOY_DIR:-/srv/vxture/deploy}"
RUNTIME_DIR="${RUNTIME_DIR:-/srv/vxture/runtime}"
BACKUP_ROOT="${BACKUP_ROOT:-/srv/vxture/backups/app-reset}"
SNAPSHOT_DIR="$BACKUP_ROOT/$(date +%Y%m%d-%H%M%S)"
OWNER_USER="${SUDO_USER:-$(id -un)}"
RESET_IMAGES="${RESET_IMAGES:-1}"
POSTGRES_DATA_UID="${POSTGRES_DATA_UID:-70}"
POSTGRES_DATA_GID="${POSTGRES_DATA_GID:-70}"
MODEL_PLATFORM_TRANSITION_CUTOFF="2026-12-31"

PLATFORM_CONTAINERS="
vx-platform-pg
vx-platform-redis
vx-auth-bff
vx-website-bff
vx-console-bff
vx-admin-bff
vx-gateway-bff
# 兼容清理旧/新模型服务容器：短期保留旧名，迁移完成后只保留新名（后续移除 vx-ai-gateway）
vx-ai-gateway
vx-model-platform
vx-website
vx-console
vx-admin
vxture-nginx
"

if [ "$(id -u)" -ne 0 ]; then
  echo "错误：请使用 sudo CONFIRM_RESET_APP=yes bash 15-reset-app-layer.sh 运行" >&2
  exit 1
fi

if [ "${CONFIRM_RESET_APP:-}" != "yes" ]; then
  echo "错误：本脚本会清理 VXTURE_DEPLOY_HOST 应用层部署状态。" >&2
  echo "确认保留系统级配置、清理应用层后，使用：" >&2
  echo "  sudo CONFIRM_RESET_APP=yes bash 15-reset-app-layer.sh" >&2
  echo "兼容说明：旧模型容器名 vx-ai-gateway 过渡保留，建议在 ${MODEL_PLATFORM_TRANSITION_CUTOFF} 前清理完成。" >&2
  exit 1
fi

require_safe_path() {
  local path="$1"
  local expected="$2"

  if [ "$path" != "$expected" ]; then
    echo "错误：路径不在允许范围内：actual=$path expected=$expected" >&2
    exit 1
  fi

  if [ -L "$path" ]; then
    echo "错误：拒绝处理符号链接路径：$path" >&2
    exit 1
  fi
}

archive_path() {
  local source="$1"
  local label="$2"

  if [ ! -e "$source" ]; then
    echo "[SKIP] $label 不存在：$source"
    return
  fi

  mkdir -p "$SNAPSHOT_DIR"
  mv "$source" "$SNAPSHOT_DIR/$(basename "$source")"
  echo "[SAVE] $label -> $SNAPSHOT_DIR/$(basename "$source")"
}

container_image_id() {
  local container="$1"
  docker inspect -f '{{.Image}}' "$container" 2>/dev/null || true
}

echo "=== Reset VXTURE_DEPLOY_HOST application layer ==="
echo "Owner user: $OWNER_USER"
echo "Deploy directory: $DEPLOY_DIR"
echo "Runtime directory: $RUNTIME_DIR"
echo "Data directory: $DATA_DIR"
echo "Snapshot directory: $SNAPSHOT_DIR"
echo "Reset images: $RESET_IMAGES"
echo "Model platform legacy cutoff: $MODEL_PLATFORM_TRANSITION_CUTOFF"
echo ""

require_safe_path "$DEPLOY_DIR" "/srv/vxture/deploy"
require_safe_path "$RUNTIME_DIR" "/srv/vxture/runtime"
require_safe_path "$DATA_DIR" "/srv/vxture/data"

echo "==> 收集待清理容器镜像"
IMAGE_IDS=""
for container in $PLATFORM_CONTAINERS; do
  image_id="$(container_image_id "$container")"
  if [ -n "$image_id" ]; then
    IMAGE_IDS="$IMAGE_IDS $image_id"
  fi
done

echo ""
echo "==> 停止并删除平台容器"
for container in $PLATFORM_CONTAINERS; do
  if docker inspect "$container" >/dev/null 2>&1; then
    docker rm -f "$container"
    echo "[OK] removed container: $container"
  else
    echo "[SKIP] container missing: $container"
  fi
done

if [ "$RESET_IMAGES" = "1" ]; then
  echo ""
  echo "==> 删除这些容器曾使用的镜像"
  for image_id in $(printf '%s\n' $IMAGE_IDS | sort -u); do
    if [ -n "$image_id" ]; then
      docker image rm -f "$image_id" 2>/dev/null && echo "[OK] removed image: $image_id" || true
    fi
  done
fi

echo ""
echo "==> 归档应用层目录与数据"
archive_path "$DEPLOY_DIR" "deploy bundle"
archive_path "$RUNTIME_DIR" "runtime config"
archive_path "$DATA_DIR/platform-pg" "platform postgres data"
archive_path "$DATA_DIR/platform-redis" "platform redis data"
archive_path "$DATA_DIR/nginx/conf" "nginx config"
archive_path "$DATA_DIR/nginx/logs" "nginx logs"
archive_path "$DATA_DIR/nginx/compose.yml" "nginx compose file"

echo ""
echo "==> 重建空应用层目录"
mkdir -p "$DEPLOY_DIR/scripts"
mkdir -p "$DEPLOY_DIR/maintenance"
mkdir -p "$DEPLOY_DIR/nginx"
mkdir -p "$DEPLOY_DIR/guardrails"
mkdir -p "$DEPLOY_DIR/secrets"
touch "$DEPLOY_DIR/secrets/.gitkeep"
mkdir -p "$RUNTIME_DIR/secrets"
mkdir -p "$DATA_DIR/platform-pg"
mkdir -p "$DATA_DIR/platform-redis"
mkdir -p "$DATA_DIR/nginx/conf/sites-enabled"
mkdir -p "$DATA_DIR/nginx/conf/snippets"
mkdir -p "$DATA_DIR/nginx/logs"
mkdir -p "$DATA_DIR/nginx/ssl/live/vxture.com"
mkdir -p "$BACKUP_ROOT"

find "$DATA_DIR/nginx" -type d -exec chmod 755 {} +
chmod 775 "$DATA_DIR/nginx/logs"
chmod 700 "$RUNTIME_DIR" "$RUNTIME_DIR/secrets"
chmod 700 "$DATA_DIR/platform-pg"
chown "$POSTGRES_DATA_UID:$POSTGRES_DATA_GID" "$DATA_DIR/platform-pg"

if id "$OWNER_USER" >/dev/null 2>&1; then
  chown -R "$OWNER_USER:$OWNER_USER" /srv/vxture/deploy "$RUNTIME_DIR" "$DATA_DIR/platform-redis" "$DATA_DIR/nginx" "$BACKUP_ROOT"
fi

echo ""
echo "==> 确认 Docker 网络"
docker network create vxture-prod 2>/dev/null || echo "[SKIP] Docker network vxture-prod 已存在"
docker network create vxture-beta 2>/dev/null || echo "[SKIP] Docker network vxture-beta 已存在"

echo ""
echo "=== Done ==="
echo "应用层已 reset。旧内容归档到：$SNAPSHOT_DIR"
echo "下一步：通过 CI/CD 同步 deploy bundle，然后手动补齐 runtime env，再进入应用部署。"
