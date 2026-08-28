#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${APP_DIR}/../.." && pwd)"

cd "${REPO_DIR}"

# data/engine-rules.json is the single edited source for the mobile rule
# engine (apps/mobile/lib/domain/rules/, apps/mobile/lib/domain/services/
# {ekadashi_classifier,parana_engine,event_matcher,calendar_event_engine}.dart).
# Flutter can only bundle assets from inside the package, so keep the
# bundled copy in sync here rather than by hand.
cp "${REPO_DIR}/data/engine-rules.json" "${APP_DIR}/assets/engine-rules.json"

if command -v node >/dev/null 2>&1; then
  exec node scripts/build-mobile-db.mjs
fi

if [[ -x "${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  exec "${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" scripts/build-mobile-db.mjs
fi

echo "Node.js not found. Install Node.js or run from Codex with bundled runtime available." >&2
exit 1
