#!/usr/bin/env bash
# resolve-acr-registry.sh - 统一 Aliyun ACR registry/namespace 归一化与可用性判断。
# @package  @vxture/repo
# @layer    Infrastructure
# @category ci
#
# 单一来源，供两处复用（均在 runner 上执行）：
#   - docker-build.yml：推送镜像，使用公网 registry（acr_registry_public）。
#   - deploy-production.yml：拉取镜像，优先内网 registry（acr_registry_internal）。
#
# 读取环境变量：
#   ALIYUN_ACR_REGISTRY        公网 registry 地址（必填才视为启用）
#   ALIYUN_ACR_NAMESPACE       命名空间（必填）
#   ALIYUN_ACR_USERNAME        用户名（必填）
#   ALIYUN_ACR_PASSWORD        密码（必填）
#   ALIYUN_ACR_INTERNAL_HOST   可选，拉取用内网地址；缺省回退公网
#
# 输出（写入 $GITHUB_OUTPUT，若存在）：
#   acr_enabled            true / false（四个必填 secret 是否齐全）
#   acr_namespace          归一化命名空间（去首尾斜杠）
#   acr_registry_public    归一化公网 registry（去协议/尾斜杠）
#   acr_registry_internal  归一化内网 registry（缺省=公网）
set -euo pipefail

normalize_host() {
  local host="$1"
  host="${host#https://}"
  host="${host#http://}"
  host="${host%/}"
  printf '%s' "$host"
}

acr_enabled=false
acr_namespace=""
acr_registry_public=""
acr_registry_internal=""

if [ -n "${ALIYUN_ACR_REGISTRY:-}" ] && [ -n "${ALIYUN_ACR_NAMESPACE:-}" ] &&
  [ -n "${ALIYUN_ACR_USERNAME:-}" ] && [ -n "${ALIYUN_ACR_PASSWORD:-}" ]; then
  acr_enabled=true
  acr_registry_public="$(normalize_host "$ALIYUN_ACR_REGISTRY")"
  acr_registry_internal="$(normalize_host "${ALIYUN_ACR_INTERNAL_HOST:-$ALIYUN_ACR_REGISTRY}")"
  namespace="${ALIYUN_ACR_NAMESPACE#/}"
  namespace="${namespace%/}"
  acr_namespace="$namespace"
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "acr_enabled=$acr_enabled"
    echo "acr_namespace=$acr_namespace"
    echo "acr_registry_public=$acr_registry_public"
    echo "acr_registry_internal=$acr_registry_internal"
  } >>"$GITHUB_OUTPUT"
fi

echo "acr_enabled=$acr_enabled namespace=${acr_namespace:-<none>} public=${acr_registry_public:-<none>} internal=${acr_registry_internal:-<none>}"
