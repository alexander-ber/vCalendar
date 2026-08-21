#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${APP_DIR}/../.." && pwd)"
PUBSPEC="${APP_DIR}/pubspec.yaml"

MODE="release"
REQUESTED_VERSION=""

usage() {
  cat <<'USAGE'
Usage:
  apps/mobile/scripts/build-apk.sh [debug|profile|release] [version]
  apps/mobile/scripts/build-apk.sh [version]

Version format:
  0.1.0+2

Behavior:
  - If version is not passed, increments only the build number after "+".
    Example: 0.1.0+1 -> 0.1.0+2
  - If version is passed, writes it to apps/mobile/pubspec.yaml before build.
  - Builds APK and copies it to ~/Downloads.
  - If the build fails, restores the previous pubspec.yaml version.

Examples:
  apps/mobile/scripts/build-apk.sh
  apps/mobile/scripts/build-apk.sh release
  apps/mobile/scripts/build-apk.sh 0.1.1+1
  apps/mobile/scripts/build-apk.sh release 0.1.1+1
USAGE
}

for arg in "$@"; do
  case "${arg}" in
    -h|--help)
      usage
      exit 0
      ;;
    debug|profile|release)
      MODE="${arg}"
      ;;
    *)
      if [[ "${arg}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\+[0-9]+$ ]]; then
        REQUESTED_VERSION="${arg}"
      else
        echo "Unsupported argument: ${arg}" >&2
        usage >&2
        exit 2
      fi
      ;;
  esac
done

CURRENT_VERSION="$(grep -E '^version:[[:space:]]*[0-9]+\.[0-9]+\.[0-9]+\+[0-9]+' "${PUBSPEC}" | head -n 1 | awk '{print $2}')"
if [[ -z "${CURRENT_VERSION}" ]]; then
  echo "Could not find Flutter version in ${PUBSPEC}" >&2
  exit 1
fi

if [[ -n "${REQUESTED_VERSION}" ]]; then
  NEXT_VERSION="${REQUESTED_VERSION}"
else
  VERSION_NAME="${CURRENT_VERSION%%+*}"
  BUILD_NUMBER="${CURRENT_VERSION##*+}"
  NEXT_VERSION="${VERSION_NAME}+$((BUILD_NUMBER + 1))"
fi

ORIGINAL_PUBSPEC="$(mktemp)"
cp "${PUBSPEC}" "${ORIGINAL_PUBSPEC}"
BUILD_SUCCEEDED="false"
cleanup() {
  local status=$?
  if [[ "${status}" -ne 0 && "${BUILD_SUCCEEDED}" != "true" ]]; then
    cp "${ORIGINAL_PUBSPEC}" "${PUBSPEC}"
    echo "Build failed. Restored ${PUBSPEC} to version ${CURRENT_VERSION}." >&2
  fi
  rm -f "${ORIGINAL_PUBSPEC}"
  return "${status}"
}
trap cleanup EXIT

python3 - "${PUBSPEC}" "${NEXT_VERSION}" <<'PY'
from pathlib import Path
import re
import sys

pubspec = Path(sys.argv[1])
version = sys.argv[2]
text = pubspec.read_text()
updated, count = re.subn(
    r"^version:\s*\d+\.\d+\.\d+\+\d+\s*$",
    f"version: {version}",
    text,
    count=1,
    flags=re.MULTILINE,
)
if count != 1:
    raise SystemExit(f"Could not update version in {pubspec}")
pubspec.write_text(updated)
PY

cd "${REPO_DIR}"
apps/mobile/scripts/build-seed-db.sh

cd "${APP_DIR}"
flutter pub get
flutter build apk "--${MODE}"

SOURCE_APK="${APP_DIR}/build/app/outputs/flutter-apk/app-${MODE}.apk"
DEST_DIR="${HOME}/Downloads"
DEST_APK="${DEST_DIR}/vcalendar-${NEXT_VERSION}-${MODE}.apk"

mkdir -p "${DEST_DIR}"
cp "${SOURCE_APK}" "${DEST_APK}"
BUILD_SUCCEEDED="true"

echo "Version: ${CURRENT_VERSION} -> ${NEXT_VERSION}"
echo "APK copied to:"
echo "${DEST_APK}"
