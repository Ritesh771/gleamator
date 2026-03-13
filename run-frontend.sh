#!/usr/bin/env bash
set -euo pipefail

# run-frontend.sh
# Minimal: cd into frontend/student and run the dev server.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend/student"

if [ ! -d "node_modules" ]; then
  echo "node_modules not found — running npm install (this may take a while)"
  npm install
fi

echo "Starting frontend dev server (npm run dev)"
npm run dev
