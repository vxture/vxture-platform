#!/usr/bin/env bash
# deploy/scripts/52-platform-alerts-cron.sh
# Host-cron wrapper around 51-check-platform-alerts.sh.
# @package  @vxture/repo
# @layer    Infrastructure
# @category deployment-script
# @author   AI-Generated
# @date     2026-07-16
#
# Runs the read-only platform drift check on the host itself (no GitHub, no
# approval gate — the CI platform-alerts.yml path is env:production gated and so
# can't run unattended). Logs each run and emails the HIGH/MEDIUM findings via
# the platform SMTP credentials only when HIGH>0 (weekly, low-noise). Always
# exits 0 so a finding never marks the crontab entry as failed.
#
# Usage:  bash 52-platform-alerts-cron.sh [--test]
#   --test  send a mail regardless of findings (validate the SMTP path)
# Config (env, e.g. set on the crontab line):
#   ALERT_RECIPIENT  where to send alerts   (default: SMTP_FROM = self)
#   MAIL_ENV         SMTP creds file        (default: runtime secrets)
#   LOG_DIR          log directory          (default: /srv/vxture/logs/platform-alerts)
#   RETAIN           number of logs to keep (default: 26 ≈ 6 months weekly)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CHECK="$SCRIPT_DIR/51-check-platform-alerts.sh"
MAIL_ENV="${MAIL_ENV:-/srv/vxture/runtime/secrets/platform-mail.env}"
LOG_DIR="${LOG_DIR:-/srv/vxture/logs/platform-alerts}"
RETAIN="${RETAIN:-26}"
HOST_TAG="$(hostname)"
TEST_MODE=0
[ "${1:-}" = "--test" ] && TEST_MODE=1

mkdir -p "$LOG_DIR"
ts="$(date +%Y-%m-%d_%H%M)"
log="$LOG_DIR/${ts}.log"

out="$(bash "$CHECK" 2>&1)"
rc=$?
printf '%s\n' "$out" >"$log"

# rotate: keep newest $RETAIN logs
ls -1t "$LOG_DIR"/*.log 2>/dev/null | tail -n +"$((RETAIN + 1))" | xargs -r rm -f

summary="$(printf '%s\n' "$out" | grep -E '^=== Summary' | tail -1)"
findings="$(printf '%s\n' "$out" | grep -E '^\[(HIGH|MEDIUM)\]' || true)"

if [ "$rc" -ne 0 ] || [ "$TEST_MODE" -eq 1 ]; then
  # shellcheck disable=SC1090
  set -a
  . "$MAIL_ENV"
  set +a
  recipient="${ALERT_RECIPIENT:-${SMTP_FROM:-}}"

  if [ -z "${SMTP_HOST:-}" ] || [ -z "$recipient" ]; then
    echo "WARN: SMTP not configured / no recipient — skipping mail. $summary (log=$log)"
    exit 0
  fi

  subj="[$HOST_TAG] Platform Alerts — ${summary#=== Summary: }"
  [ "$TEST_MODE" -eq 1 ] && subj="[$HOST_TAG] Platform Alerts TEST"

  # implicit-TLS on 465, else STARTTLS on 587
  scheme="smtp"
  if [ "${SMTP_PORT:-587}" = "465" ] || [ "$(printf '%s' "${SMTP_SECURE:-}" | tr '[:upper:]' '[:lower:]')" = "true" ]; then
    scheme="smtps"
  fi

  msg="$(mktemp)"
  {
    printf 'From: %s\r\n' "$SMTP_FROM"
    printf 'To: %s\r\n' "$recipient"
    printf 'Subject: %s\r\n' "$subj"
    printf 'Date: %s\r\n' "$(date -R)"
    printf 'Content-Type: text/plain; charset=UTF-8\r\n'
    printf '\r\n'
    printf '%s\n\n' "$summary"
    printf '%s\n' "${findings:-(no HIGH/MEDIUM detail; test mail)}"
    printf '\n-- \nfull log: %s on %s\n' "$log" "$HOST_TAG"
  } >"$msg"

  if curl --silent --show-error --ssl-reqd \
    --url "$scheme://${SMTP_HOST}:${SMTP_PORT:-587}" \
    --user "${SMTP_USER}:${SMTP_PASS}" \
    --mail-from "$SMTP_FROM" \
    --mail-rcpt "$recipient" \
    --upload-file "$msg"; then
    echo "alert email sent to $recipient"
  else
    echo "WARN: alert email failed (curl rc=$?)"
  fi
  rm -f "$msg"
fi

echo "$summary (rc=$rc, log=$log)"
exit 0
