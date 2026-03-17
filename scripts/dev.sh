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

open_browser() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
    return 0
  fi
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
    return 0
  fi
  if command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /C start "$url" >/dev/null 2>&1 || true
    return 0
  fi
  return 0
}

wait_for_backend() {
  local max_attempts=40
  local attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    local code
    code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8000/auth/login" 2>/dev/null || true)"
    if [ -n "$code" ] && [ "$code" != "000" ]; then
      return 0
    fi
    sleep 0.5
    attempt=$((attempt + 1))
  done

  return 1
}

cleanup() {
  if [ "${BACKEND_STARTED_BY_SCRIPT:-0}" = "1" ] && [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

"$ROOT_DIR/scripts/bootstrap.sh"

load_nvm
nvm use 20 >/dev/null

VENV_DIR="$(resolve_backend_venv)"
# shellcheck source=/dev/null
. "$VENV_DIR/bin/activate"

cd "$BACKEND_DIR"
BACKEND_STARTED_BY_SCRIPT=0
backend_code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8000/auth/login" 2>/dev/null || true)"
if [ -n "$backend_code" ] && [ "$backend_code" != "000" ]; then
  echo "Backend already running on 127.0.0.1:8000"
else
  python manage.py runserver 127.0.0.1:8000 >/tmp/liquidlife-backend.log 2>&1 &
  BACKEND_PID=$!
  BACKEND_STARTED_BY_SCRIPT=1
  echo "Backend started (PID: $BACKEND_PID, log: /tmp/liquidlife-backend.log)"

  if ! wait_for_backend; then
    echo "Backend did not become ready. Check /tmp/liquidlife-backend.log"
    exit 1
  fi
fi

open_browser "http://localhost:3000"

echo "Starting frontend dev server on http://localhost:3000"
cd "$FRONTEND_DIR"
frontend_code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000" 2>/dev/null || true)"
if [ -n "$frontend_code" ] && [ "$frontend_code" != "000" ]; then
  echo "Frontend already running on http://localhost:3000"
  echo "Nothing else to start."
  exit 0
fi

exec npm run dev -- --port 3000
