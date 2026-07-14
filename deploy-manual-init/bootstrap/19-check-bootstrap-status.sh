#!/usr/bin/env bash
# deploy-manual-init/bootstrap/19-check-bootstrap-status.sh
# 手动初始化后状态检查脚本，系统性核对 10 / 11 / 15 / 90 的配置结果。
# @package  @vxture/repo
# @layer    Infrastructure
# @category bootstrap-script
# @author   AI-Generated
# @date     2026-06-05
#
# 运行：bash 19-check-bootstrap-status.sh
# 说明：只读检查，不修复、不输出 secret；存在 FAIL 时退出 1。
set -euo pipefail

TARGET_HOSTNAME="${TARGET_HOSTNAME:-VXTURE_DEPLOY_HOST}"
REQUIRED_UBUNTU_VERSION="${REQUIRED_UBUNTU_VERSION:-26.04}"
REQUIRED_NODE_MAJOR="${REQUIRED_NODE_MAJOR:-24}"
REQUIRED_PNPM_VERSION="${REQUIRED_PNPM_VERSION:-10.30.3}"
DATA_MOUNT_POINT="${DATA_MOUNT_POINT:-/srv/vxture/data}"
DEPLOY_WORK_DIR="${DEPLOY_WORK_DIR:-/srv/vxture/deploy}"
RUNTIME_DIR="${RUNTIME_DIR:-/srv/vxture/runtime}"
BACKUP_DIR="${BACKUP_DIR:-/srv/vxture/backups}"
EXPECTED_DATA_DEVICE="${DATA_DEVICE:-/dev/vdb1}"
EXPECTED_MIN_DATA_DISK_GB="${EXPECTED_MIN_DATA_DISK_GB:-2}"
BOOTSTRAP_DIR="${BOOTSTRAP_DIR:-$HOME/vxture-bootstrap}"
CONNECTION_BACKUP_DIR="${CONNECTION_BACKUP_DIR:-$HOME/vxture-backup/connection}"
UBUNTU_SOURCES_FILE="/etc/apt/sources.list.d/ubuntu.sources"
WINDTERM_PROFILE="/etc/profile.d/99-windterm-disable-osc3008.sh"

OK_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

section() {
  printf '\n== %s ==\n' "$1"
}

info() {
  printf '[INFO] %s\n' "$1"
}

ok() {
  OK_COUNT=$((OK_COUNT + 1))
  printf '[OK] %s\n' "$1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  printf '[WARN] %s\n' "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf '[FAIL] %s\n' "$1"
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

can_sudo() {
  sudo -n true >/dev/null 2>&1
}

run_sudo() {
  if can_sudo; then
    sudo "$@"
  else
    "$@"
  fi
}

check_file_exists() {
  local path="$1"
  local label="$2"

  if [ -f "$path" ]; then
    ok "$label 存在：$path"
  else
    fail "$label 缺失：$path"
  fi
}

check_dir_exists() {
  local path="$1"
  local label="$2"

  if [ -d "$path" ]; then
    ok "$label 存在：$path"
  else
    fail "$label 缺失：$path"
  fi
}

check_dns_host() {
  local host="$1"

  if getent hosts "$host" >/dev/null 2>&1; then
    ok "DNS 可解析：$host"
  else
    fail "DNS 不可解析：$host"
  fi
}

first_apt_source_url() {
  awk '
    /^URIs:[[:space:]]*/ {
      print $2
      exit
    }
  ' "$UBUNTU_SOURCES_FILE" 2>/dev/null || true
}

check_service() {
  local service="$1"

  if systemctl is-enabled "$service" >/dev/null 2>&1; then
    ok "$service 已 enable"
  else
    fail "$service 未 enable"
  fi

  if systemctl is-active "$service" >/dev/null 2>&1; then
    ok "$service 正在运行"
  else
    fail "$service 未运行"
  fi
}

check_version_prefix() {
  local actual="$1"
  local expected_prefix="$2"
  local label="$3"

  if [ "$actual" = "$expected_prefix" ] || [[ "$actual" == "$expected_prefix".* ]]; then
    ok "$label 版本符合：$actual"
  else
    fail "$label 版本不符合：actual=$actual expected=$expected_prefix"
  fi
}

check_system_baseline() {
  section "系统与用户"
  info "当前用户：$(id -un)"
  info "当前 HOME：$HOME"
  info "当前 hostname：$(hostname)"

  if [ "$(hostname)" = "$TARGET_HOSTNAME" ]; then
    ok "hostname 符合：$TARGET_HOSTNAME"
  else
    fail "hostname 不符合：actual=$(hostname) expected=$TARGET_HOSTNAME"
  fi

  if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    info "系统：${PRETTY_NAME:-unknown}"
    if [ "${ID:-}" = "ubuntu" ] && [ "${VERSION_ID:-}" = "$REQUIRED_UBUNTU_VERSION" ]; then
      ok "Ubuntu 版本符合：$VERSION_ID"
    else
      fail "Ubuntu 版本不符合：actual=${PRETTY_NAME:-unknown} expected=Ubuntu $REQUIRED_UBUNTU_VERSION"
    fi
  else
    fail "无法读取 /etc/os-release"
  fi

  if id -nG | tr ' ' '\n' | grep -qx docker; then
    ok "当前用户已加入 docker group"
  else
    warn "当前用户未加入 docker group；如刚执行 11，请重新登录 SSH 后再检查"
  fi

  if [ -d "$HOME/.ssh" ]; then
    local ssh_perm
    ssh_perm="$(stat -c '%a' "$HOME/.ssh")"
    if [ "$ssh_perm" = "700" ]; then
      ok "~/.ssh 权限正确：700"
    else
      warn "~/.ssh 权限建议为 700，当前为 $ssh_perm"
    fi
  else
    warn "~/.ssh 不存在"
  fi

  if [ -f "$HOME/.ssh/authorized_keys" ]; then
    local ak_perm
    ak_perm="$(stat -c '%a' "$HOME/.ssh/authorized_keys")"
    if [ "$ak_perm" = "600" ] || [ "$ak_perm" = "400" ]; then
      ok "authorized_keys 权限正确：$ak_perm"
    else
      warn "authorized_keys 权限建议为 600/400，当前为 $ak_perm"
    fi
  else
    warn "authorized_keys 不存在"
  fi
}

check_network_and_apt() {
  section "DNS 与 apt 源"
  check_dns_host download.docker.com
  check_dns_host deb.nodesource.com
  check_dns_host pkgs.tailscale.com
  check_dns_host github.com

  check_file_exists "$UBUNTU_SOURCES_FILE" "Ubuntu apt sources"
  if [ -f "$UBUNTU_SOURCES_FILE" ]; then
    local apt_url
    apt_url="$(first_apt_source_url)"
    if [ -n "$apt_url" ]; then
      info "Ubuntu apt 源：$apt_url"
      if has_command curl && curl -fsSI --connect-timeout 8 "${apt_url%/}/dists/$(. /etc/os-release && printf '%s' "$VERSION_CODENAME")/InRelease" >/dev/null 2>&1; then
        ok "Ubuntu apt 源可达"
      else
        fail "Ubuntu apt 源不可达：$apt_url"
      fi
    else
      fail "无法从 $UBUNTU_SOURCES_FILE 读取 URIs"
    fi
  fi

  if dpkg --audit | grep -q .; then
    fail "dpkg 存在未完成配置项"
  else
    ok "dpkg audit 无异常"
  fi

  if run_sudo apt-get check >/dev/null 2>&1; then
    ok "apt-get check 无异常"
  else
    fail "apt-get check 异常"
  fi
}

check_data_disk() {
  section "数据盘与自动挂载"
  if findmnt -n "$DATA_MOUNT_POINT" >/dev/null 2>&1; then
    local source
    local fstype
    source="$(findmnt -n -o SOURCE "$DATA_MOUNT_POINT")"
    fstype="$(findmnt -n -o FSTYPE "$DATA_MOUNT_POINT")"
    ok "$DATA_MOUNT_POINT 已挂载：$source ($fstype)"
    if [ "$source" = "$EXPECTED_DATA_DEVICE" ]; then
      ok "数据盘设备符合：$EXPECTED_DATA_DEVICE"
    else
      warn "数据盘设备与预期不同：actual=$source expected=$EXPECTED_DATA_DEVICE"
    fi
  else
    fail "$DATA_MOUNT_POINT 未挂载"
  fi

  if grep -q "[[:space:]]$DATA_MOUNT_POINT[[:space:]]" /etc/fstab; then
    ok "/etc/fstab 已配置 $DATA_MOUNT_POINT"
  else
    fail "/etc/fstab 缺少 $DATA_MOUNT_POINT"
  fi

  if [ -b "$EXPECTED_DATA_DEVICE" ]; then
    local size_gb
    size_gb="$(lsblk -bno SIZE "$EXPECTED_DATA_DEVICE" | awk '{printf "%.0f", $1 / 1024 / 1024 / 1024}')"
    info "$EXPECTED_DATA_DEVICE 容量约 ${size_gb}G"
    if [ "$size_gb" -ge "$EXPECTED_MIN_DATA_DISK_GB" ]; then
      ok "数据盘容量满足最小预期：${size_gb}G >= ${EXPECTED_MIN_DATA_DISK_GB}G"
    else
      warn "数据盘容量低于预期：${size_gb}G < ${EXPECTED_MIN_DATA_DISK_GB}G"
    fi
  else
    fail "数据盘设备不存在：$EXPECTED_DATA_DEVICE"
  fi
}

check_versions_and_services() {
  section "软件版本与服务"
  if has_command docker; then
    info "$(docker --version)"
    check_service docker
    if docker info >/dev/null 2>&1; then
      ok "当前用户可直接访问 Docker daemon"
    else
      warn "当前用户无法直接访问 Docker daemon；可能需要重新登录 SSH 或检查 docker group"
    fi
  else
    fail "docker 未安装"
  fi

  if docker compose version >/dev/null 2>&1; then
    ok "$(docker compose version)"
  else
    fail "Docker Compose plugin 不可用"
  fi

  if has_command node; then
    local node_major
    node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
    check_version_prefix "$node_major" "$REQUIRED_NODE_MAJOR" "Node.js 主版本"
    info "Node.js：$(node --version)"
  else
    fail "node 未安装"
  fi

  if has_command corepack; then
    ok "corepack 可用：$(corepack --version)"
  else
    fail "corepack 不可用"
  fi

  if has_command pnpm; then
    local pnpm_version
    pnpm_version="$(pnpm --version)"
    if [ "$pnpm_version" = "$REQUIRED_PNPM_VERSION" ]; then
      ok "当前用户 pnpm 版本符合：$pnpm_version"
    else
      fail "当前用户 pnpm 版本不符合：actual=$pnpm_version expected=$REQUIRED_PNPM_VERSION"
    fi
  else
    fail "pnpm 不可用"
  fi

  if can_sudo && sudo sh -lc 'command -v pnpm >/dev/null 2>&1'; then
    local root_pnpm_version
    root_pnpm_version="$(sudo sh -lc 'pnpm --version')"
    if [ "$root_pnpm_version" = "$REQUIRED_PNPM_VERSION" ]; then
      ok "root pnpm 版本符合：$root_pnpm_version"
    else
      fail "root pnpm 版本不符合：actual=$root_pnpm_version expected=$REQUIRED_PNPM_VERSION"
    fi
  else
    warn "无法检查 root pnpm；当前 sudo 需要密码或 root pnpm 不可用"
  fi

  check_service systemd-resolved
}

check_docker_and_firewall() {
  section "Docker 网络与防火墙"
  if has_command docker; then
    if run_sudo docker network inspect vxture-prod >/dev/null 2>&1; then
      ok "Docker 网络存在：vxture-prod"
    else
      fail "Docker 网络缺失：vxture-prod"
    fi

    if run_sudo docker network inspect vxture-beta >/dev/null 2>&1; then
      ok "Docker 网络存在：vxture-beta"
    else
      fail "Docker 网络缺失：vxture-beta"
    fi
  fi

  if has_command ufw; then
    local ufw_status
    ufw_status="$(run_sudo ufw status verbose 2>/dev/null || true)"
    if printf '%s\n' "$ufw_status" | grep -q '^Status: active'; then
      ok "UFW 已启用"
    else
      fail "UFW 未启用"
    fi

    for port in '22/tcp' '80/tcp' '443/tcp'; do
      if printf '%s\n' "$ufw_status" | grep -q "$port.*ALLOW IN"; then
        ok "UFW 已允许 $port"
      else
        fail "UFW 缺少 $port"
      fi
    done

    if printf '%s\n' "$ufw_status" | grep -q '3090/tcp.*100.64.0.0/10'; then
      ok "UFW 已限制 3090 仅 Tailscale 网段访问"
    else
      fail "UFW 3090 Tailscale 规则缺失"
    fi
  else
    fail "ufw 未安装"
  fi
}

check_tailscale_and_windterm() {
  section "Tailscale 与 WindTerm 临时配置"
  if has_command tailscale; then
    ok "Tailscale 已安装：$(tailscale --version | head -n 1)"
    check_service tailscaled
    if tailscale status >/dev/null 2>&1; then
      ok "Tailscale status 可读取"
      if tailscale status 2>/dev/null | awk -v host="$TARGET_HOSTNAME" 'index($0, host) > 0 { found = 1 } END { exit found ? 0 : 1 }'; then
        ok "Tailscale 节点名包含：$TARGET_HOSTNAME"
      else
        warn "Tailscale status 未发现节点名：$TARGET_HOSTNAME"
      fi
    else
      fail "Tailscale status 异常"
    fi
  else
    fail "tailscale 未安装"
  fi

  if [ -d "$CONNECTION_BACKUP_DIR" ]; then
    ok "连接配置备份目录存在：$CONNECTION_BACKUP_DIR"
  else
    warn "连接配置备份目录不存在：$CONNECTION_BACKUP_DIR"
  fi

  if [ -f "$WINDTERM_PROFILE" ]; then
    ok "WindTerm profile.d 片段存在：$WINDTERM_PROFILE"
    if sh -lc 'true' >/dev/null 2>&1 && bash -lc 'true' >/dev/null 2>&1; then
      ok "profile.d 在 sh/bash 下无语法错误"
    else
      fail "profile.d 在 sh/bash 下存在语法错误"
    fi
  else
    warn "WindTerm profile.d 片段不存在；如没有 OSC 3008 问题可忽略"
  fi
}

check_directories_and_permissions() {
  section "目录、文件与权限"
  check_dir_exists "$BOOTSTRAP_DIR" "bootstrap 手动上传目录"
  check_file_exists "$BOOTSTRAP_DIR/10-restore-connection-env.sh" "10 脚本"
  check_file_exists "$BOOTSTRAP_DIR/11-bootstrap-host.sh" "11 脚本"
  check_file_exists "$BOOTSTRAP_DIR/15-reset-app-layer.sh" "15 脚本"
  if [ -f "$BOOTSTRAP_DIR/19-check-bootstrap-status.sh" ]; then
    ok "19 脚本存在：$BOOTSTRAP_DIR/19-check-bootstrap-status.sh"
  else
    warn "19 脚本尚未在 bootstrap 目录中发现；如果当前通过 stdin 临时运行可忽略"
  fi
  check_file_exists "$BOOTSTRAP_DIR/90-disable-windterm-osc3008.sh" "90 脚本"

  for path in \
    "$DATA_MOUNT_POINT" \
    "$DATA_MOUNT_POINT/platform-pg" \
    "$DATA_MOUNT_POINT/platform-redis" \
    "$DATA_MOUNT_POINT/nginx/conf/sites-enabled" \
    "$DATA_MOUNT_POINT/nginx/conf/snippets" \
    "$DATA_MOUNT_POINT/nginx/ssl/live/vxture.com" \
    "$DATA_MOUNT_POINT/nginx/logs" \
    "$DEPLOY_WORK_DIR" \
    "$DEPLOY_WORK_DIR/scripts" \
    "$DEPLOY_WORK_DIR/maintenance" \
    "$DEPLOY_WORK_DIR/nginx" \
    "$DEPLOY_WORK_DIR/guardrails" \
    "$DEPLOY_WORK_DIR/secrets" \
    "$RUNTIME_DIR" \
    "$RUNTIME_DIR/secrets" \
    "$BACKUP_DIR"; do
    check_dir_exists "$path" "$path"
  done

  if [ -d "$DEPLOY_WORK_DIR" ]; then
    local deploy_owner
    deploy_owner="$(stat -c '%U:%G' "$DEPLOY_WORK_DIR")"
    if [ "$deploy_owner" = "$(id -un):$(id -gn)" ]; then
      ok "$DEPLOY_WORK_DIR owner 符合：$deploy_owner"
    else
      warn "$DEPLOY_WORK_DIR owner 非当前用户：$deploy_owner"
    fi
  fi

  if [ -d "$RUNTIME_DIR" ]; then
    local runtime_owner
    runtime_owner="$(stat -c '%U:%G' "$RUNTIME_DIR")"
    if [ "$runtime_owner" = "$(id -un):$(id -gn)" ]; then
      ok "$RUNTIME_DIR owner 符合：$runtime_owner"
    else
      fail "$RUNTIME_DIR owner 非当前用户：$runtime_owner"
    fi
  fi

  if [ -d "$DATA_MOUNT_POINT/nginx" ]; then
    local nginx_perm
    nginx_perm="$(stat -c '%a' "$DATA_MOUNT_POINT/nginx")"
    if [ "$nginx_perm" = "777" ]; then
      warn "$DATA_MOUNT_POINT/nginx 当前为 777，建议后续收紧到 755/775"
    else
      ok "$DATA_MOUNT_POINT/nginx 权限：$nginx_perm"
    fi
  fi

  if [ -d "$DATA_MOUNT_POINT/platform-pg" ]; then
    local pg_owner
    local pg_perm
    pg_owner="$(stat -c '%u:%g' "$DATA_MOUNT_POINT/platform-pg")"
    pg_perm="$(stat -c '%a' "$DATA_MOUNT_POINT/platform-pg")"
    if [ "$pg_owner" = "70:70" ]; then
      ok "$DATA_MOUNT_POINT/platform-pg owner 符合 PostgreSQL 容器要求：$pg_owner"
    else
      fail "$DATA_MOUNT_POINT/platform-pg owner 不符合 PostgreSQL 容器要求：$pg_owner，期望 70:70"
    fi
    if [ "$pg_perm" = "700" ]; then
      ok "$DATA_MOUNT_POINT/platform-pg 权限符合：$pg_perm"
    else
      warn "$DATA_MOUNT_POINT/platform-pg 权限非 700：$pg_perm"
    fi
  fi

  if [ -d "$RUNTIME_DIR/secrets" ]; then
    local secrets_perm
    secrets_perm="$(stat -c '%a' "$RUNTIME_DIR/secrets")"
    if [ "$secrets_perm" -le 755 ]; then
      ok "secrets 目录权限可接受：$secrets_perm"
    else
      warn "secrets 目录权限偏宽：$secrets_perm"
    fi
  fi
}

print_summary() {
  section "汇总"
  printf 'OK=%s WARN=%s FAIL=%s\n' "$OK_COUNT" "$WARN_COUNT" "$FAIL_COUNT"
  if [ "$FAIL_COUNT" -gt 0 ]; then
    printf '结论：初始化检查未通过，需要先处理 FAIL 项。\n'
    exit 1
  fi

  if [ "$WARN_COUNT" -gt 0 ]; then
    printf '结论：初始化主链路通过，但存在 WARN 项，需人工确认是否接受。\n'
    exit 0
  fi

  printf '结论：初始化检查通过。\n'
}

check_system_baseline
check_network_and_apt
check_data_disk
check_versions_and_services
check_docker_and_firewall
check_tailscale_and_windterm
check_directories_and_permissions
print_summary
