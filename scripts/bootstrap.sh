#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/liquidlife_backend"

load_env_file() {
  local env_file="$1"
  if [ ! -f "$env_file" ]; then
    return 0
  fi

  while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    local line="${raw_line#"${raw_line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"

    if [ -z "$line" ] || [[ "$line" == \#* ]] || [[ "$line" != *=* ]]; then
      continue
    fi

    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"

    if [[ "$value" =~ ^\".*\"$ ]] || [[ "$value" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi

    export "$key=$value"
  done < "$env_file"
}

load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    return 0
  fi
  echo "Error: nvm not found at $NVM_DIR. Install nvm first: https://github.com/nvm-sh/nvm"
  return 1
}

resolve_backend_venv() {
  if [ -d "$BACKEND_DIR/.venv" ]; then
    printf '%s' "$BACKEND_DIR/.venv"
    return 0
  fi

  if [ -d "$BACKEND_DIR/venv" ]; then
    printf '%s' "$BACKEND_DIR/venv"
    return 0
  fi

  python3 -m venv "$BACKEND_DIR/.venv"
  printf '%s' "$BACKEND_DIR/.venv"
}

load_env_file "$ROOT_DIR/.env"
load_env_file "$BACKEND_DIR/.env"

echo "[1/4] Setting Node.js 20"
load_nvm
nvm install 20 >/dev/null
nvm use 20 >/dev/null


echo "[2/4] Installing frontend dependencies"
cd "$FRONTEND_DIR"
npm install

echo "[3/4] Setting Python virtual environment"
VENV_DIR="$(resolve_backend_venv)"
# shellcheck source=/dev/null
. "$VENV_DIR/bin/activate"


echo "[4/4] Installing backend dependencies and applying migrations"
cd "$BACKEND_DIR"
pip install -r requirements.txt
python manage.py migrate

echo "Bootstrap complete."
