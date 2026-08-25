#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${APP_DIR}/../.." && pwd)"

usage() {
  cat <<'USAGE'
Usage:
  apps/mobile/scripts/run-device.sh [--keep-data] <device-id-or-name>

Builds and runs vCalendar Mobile on a Flutter device by id or name.
By default the script removes the previously installed app from iOS/Android
dev devices before running, so the bundled seed database is always fresh.

Examples:
  apps/mobile/scripts/run-device.sh 70D7E713-E9DA-4382-8F8B-5F9979796D1C
  apps/mobile/scripts/run-device.sh "iPhone 17 Pro"
  apps/mobile/scripts/run-device.sh --keep-data "iPhone 17 Pro"
  apps/mobile/scripts/run-device.sh chrome
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

KEEP_DATA="false"
ARGS=()
for arg in "$@"; do
  case "${arg}" in
    --keep-data)
      KEEP_DATA="true"
      ;;
    *)
      ARGS+=("${arg}")
      ;;
  esac
done

if [[ ${#ARGS[@]} -eq 0 ]]; then
  usage
  echo
  echo "Available devices:"
  cd "${APP_DIR}"
  flutter devices
  exit 2
fi

DEVICE="${ARGS[*]}"

resolve_flutter_device() {
  cd "${APP_DIR}"
  local devices_json
  devices_json="$(flutter devices --machine 2>/dev/null)"
  python3 - "${DEVICE}" "${devices_json}" <<'PY'
import json
import sys

target = sys.argv[1].strip().lower()
devices = json.loads(sys.argv[2])
for item in devices:
    values = [
        str(item.get("id", "")),
        str(item.get("name", "")),
    ]
    if any(value.lower() == target for value in values):
        print(f'{item.get("id","")}\t{item.get("targetPlatform","")}')
        raise SystemExit(0)
for item in devices:
    values = [
        str(item.get("id", "")),
        str(item.get("name", "")),
    ]
    if any(target in value.lower() for value in values):
        print(f'{item.get("id","")}\t{item.get("targetPlatform","")}')
        raise SystemExit(0)
PY
}

reset_installed_app() {
  [[ "${KEEP_DATA}" == "true" ]] && return 0
  [[ "${DEVICE}" == "chrome" ]] && return 0

  local resolved device_id platform
  resolved="$(resolve_flutter_device || true)"
  [[ -z "${resolved}" ]] && return 0
  device_id="${resolved%%$'\t'*}"
  platform="${resolved#*$'\t'}"

  case "${platform}" in
    ios*)
      if command -v xcrun >/dev/null 2>&1; then
        xcrun simctl uninstall "${device_id}" com.scsseva.vcalendarMobile >/dev/null 2>&1 || true
      fi
      ;;
    android*)
      if command -v adb >/dev/null 2>&1; then
        adb -s "${device_id}" uninstall com.scsseva.vcalendar_mobile >/dev/null 2>&1 || true
      fi
      ;;
  esac
}

cd "${REPO_DIR}"
if command -v node >/dev/null 2>&1; then
  node scripts/build-mobile-db.mjs
elif [[ -x "${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  "${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/build-mobile-db.mjs
else
  echo "Node.js not found; seed DB was not rebuilt." >&2
fi

cd "${APP_DIR}"
flutter pub get
reset_installed_app
exec flutter run -d "${DEVICE}"
