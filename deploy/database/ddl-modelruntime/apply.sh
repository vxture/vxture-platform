#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# apply.sh — Model Platform DB（vxturestudio_modelruntime_main）SQL DDL runner
# 独立物理库，与平台库零跨库 FK（物理库界#1）；跨库关联仅靠裸 request_id。
# 按文件名序 apply *.sql：00_schemas → 10_key/20_reqlog/30_routing → 90_partitions → 95_triggers。
# clean-baseline（开发阶段，铁律三）：reset 后 apply。用法同平台库 apply.sh。
#   CONFIRM_RESET=yes MODELRUNTIME_DATABASE_URL=postgres://... ./apply.sh --reset
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail
DDL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${MODELRUNTIME_DATABASE_URL:?MODELRUNTIME_DATABASE_URL required}"
PSQL=(psql "$MODELRUNTIME_DATABASE_URL" -v ON_ERROR_STOP=1 -q)

if [[ "${1:-}" == "--reset" ]]; then
  echo "⚠ --reset: dropping key/reqlog/routing (CASCADE). Data loss."
  [[ "${CONFIRM_RESET:-}" == "yes" ]] || { echo "refusing: set CONFIRM_RESET=yes"; exit 1; }
  "${PSQL[@]}" -c "DROP SCHEMA IF EXISTS key,reqlog,routing CASCADE;"
fi

shopt -s nullglob
for f in "$DDL_DIR"/[0-9]*.sql; do
  echo "── apply $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "✓ Model Platform DB DDL apply complete"
