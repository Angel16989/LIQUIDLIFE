#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT_DIR"
  echo "Copy .env.example to .env and fill in the real values first."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not accessible for the current user."
  echo "Fix it by either:"
  echo "  1. running this script with sudo"
  echo "  2. or adding your user to the docker group and logging in again"
  exit 1
fi

mkdir -p docker-data/postgres docker-data/media docker-data/staticfiles

compose_cmd=()
if docker compose version >/dev/null 2>&1; then
  compose_cmd=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose_cmd=(docker-compose)
fi

if ((${#compose_cmd[@]} > 0)); then
  "${compose_cmd[@]}" up --build -d
else
  env_value() {
    local key="$1"
    local default="${2-}"
    local value=""

    if value=$(grep -E "^${key}=" .env | tail -n1 | cut -d= -f2-); then
      :
    else
      value=""
    fi

    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"

    if [[ -n "$value" ]]; then
      printf '%s' "$value"
    else
      printf '%s' "$default"
    fi
  }

  POSTGRES_DB=$(env_value POSTGRES_DB liquidlife)
  POSTGRES_USER=$(env_value POSTGRES_USER postgres)
  POSTGRES_PASSWORD=$(env_value POSTGRES_PASSWORD postgres)
  NEXT_PUBLIC_API_URL=$(env_value NEXT_PUBLIC_API_URL http://localhost:8000)
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=$(env_value NEXT_PUBLIC_GOOGLE_CLIENT_ID "")
  ALLOWED_HOSTS=$(env_value ALLOWED_HOSTS "localhost,127.0.0.1,backend")

  docker network inspect liquidlife-network >/dev/null 2>&1 || docker network create liquidlife-network >/dev/null

  docker rm -f liquidlife-frontend liquidlife-backend liquidlife-db >/dev/null 2>&1 || true

  docker build \
    -t liquidlife-backend:latest \
    liquidlife_backend

  docker build \
    --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
    --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID="$NEXT_PUBLIC_GOOGLE_CLIENT_ID" \
    -t liquidlife-frontend:latest \
    frontend

  docker run -d \
    --name liquidlife-db \
    --restart unless-stopped \
    --network liquidlife-network \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -v "$ROOT_DIR/docker-data/postgres:/var/lib/postgresql/data" \
    postgres:16-alpine >/dev/null

  for _ in {1..30}; do
    if docker exec liquidlife-db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  docker run -d \
    --name liquidlife-backend \
    --restart unless-stopped \
    --network liquidlife-network \
    --env-file .env \
    -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@liquidlife-db:5432/${POSTGRES_DB}" \
    -e STATIC_ROOT=/app/staticfiles \
    -e MEDIA_ROOT=/app/media \
    -e PORT=8000 \
    -e ALLOWED_HOSTS="$ALLOWED_HOSTS" \
    -p 8000:8000 \
    -v "$ROOT_DIR/docker-data/media:/app/media" \
    -v "$ROOT_DIR/docker-data/staticfiles:/app/staticfiles" \
    liquidlife-backend:latest >/dev/null

  docker run -d \
    --name liquidlife-frontend \
    --restart unless-stopped \
    --network liquidlife-network \
    --env-file .env \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e HOSTNAME=0.0.0.0 \
    -e NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
    -e NEXT_PUBLIC_GOOGLE_CLIENT_ID="$NEXT_PUBLIC_GOOGLE_CLIENT_ID" \
    -p 3000:3000 \
    liquidlife-frontend:latest >/dev/null
fi

echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "Health:   http://localhost:8000/healthz"
