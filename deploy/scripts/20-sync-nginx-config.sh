#!/usr/bin/env bash
# deploy/scripts/20-sync-nginx-config.sh
# 将部署包 nginx/ 配置同步到 /srv/vxture/data/nginx/conf/
# @package  @vxture/repo
# @layer    Infrastructure
# @category deployment-script
# @author   AI-Generated
# @date     2026-06-02
#
# 运行：sudo bash 20-sync-nginx-config.sh
# 幂等：重复运行安全；Nginx 容器运行中时会执行 nginx -t + reload
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$COMPOSE_DIR/nginx"
COMPOSE_SRC="$COMPOSE_DIR/compose.nginx.yml"
DST=/srv/vxture/data/nginx/conf
COMPOSE_DST=/srv/vxture/data/nginx/compose.yml

if [ ! -f "$SRC/nginx.conf" ]; then
  echo "错误：找不到 $SRC/nginx.conf，请确认部署包包含 nginx 配置（当前: $COMPOSE_DIR）"
  exit 1
fi
if [ ! -f "$COMPOSE_SRC" ]; then
  echo "错误：找不到 $COMPOSE_SRC，请确认部署包包含 compose.nginx.yml（当前: $COMPOSE_DIR）"
  exit 1
fi

echo "==> 同步 Nginx 配置：$SRC → $DST"
mkdir -p "$DST/conf.d" "$DST/sites-enabled" "$DST/snippets"
mkdir -p /srv/vxture/data/nginx/html
mkdir -p /srv/vxture/data/nginx/logs/nginx
mkdir -p /srv/vxture/data/nginx/ssl/live/vxture.com

cp -v "$SRC/nginx.conf"                     "$DST/nginx.conf"
cp -v "$SRC/snippets/"*.conf                "$DST/snippets/"
cp -v "$SRC/sites-enabled/"*.conf           "$DST/sites-enabled/"
cp -v "$COMPOSE_SRC"                        "$COMPOSE_DST"

echo ""
echo "同步完成，目录内容："
find "$DST" -type f | sort
echo "$COMPOSE_DST"

# 如果 nginx 容器正在运行，测试配置并热重载
if docker inspect vxture-nginx &>/dev/null 2>&1; then
  echo ""
  echo "==> 检测到 vxture-nginx 容器运行中，执行配置测试..."
  docker exec vxture-nginx nginx -t
  docker exec vxture-nginx nginx -s reload
  echo "Nginx 已热重载"
else
  echo ""
  echo "  提示：vxture-nginx 容器未运行，配置将在 compose up 时生效"
fi

echo ""
echo "  !! 检查 SSL 证书是否已放置（compose up 前必须）："
echo "     ls -la /srv/vxture/data/nginx/ssl/live/vxture.com/"
echo ""
echo "  启动 nginx（首次或更新）："
echo "     docker compose -f /srv/vxture/data/nginx/compose.yml up -d"
