#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${APP_DIR}/../.." && pwd)"

cd "${REPO_DIR}"

if command -v node >/dev/null 2>&1; then
  exec node scripts/build-mobile-db.mjs
fi

if [[ -x "${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  exec "${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/build-mobile-db.mjs
fi

echo "Node.js not found. Install Node.js or run from Codex with bundled runtime available." >&2
exit 1
