#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${APP_DIR}/../.." && pwd)"

MODE="${1:-debug}"

case "${MODE}" in
  debug|profile|release) ;;
  -h|--help)
    cat <<'USAGE'
Usage:
  apps/mobile/scripts/build-apk.sh [debug|profile|release]

Builds the Flutter APK and copies it to ~/Downloads with the current git commit
hash in the filename.

Examples:
  apps/mobile/scripts/build-apk.sh
  apps/mobile/scripts/build-apk.sh release
USAGE
    exit 0
    ;;
  *)
    echo "Unsupported APK mode: ${MODE}" >&2
    echo "Use one of: debug, profile, release" >&2
    exit 2
    ;;
esac

cd "${REPO_DIR}"
apps/mobile/scripts/build-seed-db.sh

COMMIT="$(git rev-parse --short=12 HEAD)"
if ! git diff --quiet || ! git diff --cached --quiet; then
  COMMIT="${COMMIT}-dirty"
fi

cd "${APP_DIR}"
flutter pub get
flutter build apk "--${MODE}"

SOURCE_APK="${APP_DIR}/build/app/outputs/flutter-apk/app-${MODE}.apk"
DEST_DIR="${HOME}/Downloads"
DEST_APK="${DEST_DIR}/vCalendar-${MODE}-${COMMIT}.apk"

mkdir -p "${DEST_DIR}"
cp "${SOURCE_APK}" "${DEST_APK}"

echo "APK copied to:"
echo "${DEST_APK}"
