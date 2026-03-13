#!/usr/bin/env bash
set -euo pipefail

# run-backend.sh
# Usage: ./run-backend.sh
# Minimal: cd into backend/erp, activate .venv, and run server.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Move into the Django project folder where manage.py lives
cd "$SCRIPT_DIR/backend/erp"

# Prefer activation from project root .venv
if [ -f "$SCRIPT_DIR/.venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.venv/bin/activate"
elif [ -f ".venv/bin/activate" ]; then
  # fallback: venv in backend/erp
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
else
  echo "Warning: virtualenv not found. Please activate your venv and rerun." >&2
fi

python manage.py runserver 127.0.0.1:8080

