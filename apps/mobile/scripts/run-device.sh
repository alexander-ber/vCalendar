#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${APP_DIR}/../.." && pwd)"

usage() {
  cat <<'USAGE'
Usage:
  apps/mobile/scripts/run-device.sh <device-id-or-name>

Builds and runs vCalendar Mobile on a Flutter device by id or name.

Examples:
  apps/mobile/scripts/run-device.sh 70D7E713-E9DA-4382-8F8B-5F9979796D1C
  apps/mobile/scripts/run-device.sh "iPhone 17 Pro"
  apps/mobile/scripts/run-device.sh chrome
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -eq 0 ]]; then
  usage
  echo
  echo "Available devices:"
  cd "${APP_DIR}"
  flutter devices
  exit 2
fi

DEVICE="$*"

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
exec flutter run -d "${DEVICE}"
