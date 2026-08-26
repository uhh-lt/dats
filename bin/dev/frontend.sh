#!/usr/bin/env bash
# Start the frontend Vite dev server.
# The actual command lives in frontend/package.json ("dev" script); this delegates to it.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
dats_load_env frontend

cd "${DATS_ROOT}/frontend"
exec npm run dev
