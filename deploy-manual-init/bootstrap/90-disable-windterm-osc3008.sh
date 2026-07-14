# deploy-manual-init/bootstrap/90-disable-windterm-osc3008.sh
# 临时禁用 WindTerm OSC 3008 输出的 profile.d 片段。
# @package  @vxture/repo
# @layer    Infrastructure
# @category bootstrap-script
# @author   AI-Generated
# @date     2026-06-05
#
# 用法：复制到 /etc/profile.d/99-windterm-disable-osc3008.sh。
# /etc/profile.d 会被 sh 读取；非 bash shell 必须直接返回。
if [ -z "${BASH_VERSION:-}" ]; then
  return 0 2>/dev/null || exit 0
fi

__systemd_osc_context_escape() { :; }
__systemd_osc_context_common() { :; }
__systemd_osc_context_precmdline() { :; }
__systemd_osc_context_ps0() { :; }

PS0=""
if [ -n "${PROMPT_COMMAND:-}" ]; then
  PROMPT_COMMAND="$(printf '%s' "$PROMPT_COMMAND" | sed 's/__systemd_osc_context_precmdline//g')"
fi
