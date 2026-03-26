#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT_DIR"
  echo "Copy .env.example to .env and fill in the real values first."
  exit 1
fi

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

PUBLIC_DOMAIN=$(env_value PUBLIC_DOMAIN localhost)
DEPLOY_MODE=$(env_value DEPLOY_MODE "")
CLOUDFLARE_TUNNEL_TOKEN=$(env_value CLOUDFLARE_TUNNEL_TOKEN "")

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not accessible for the current user."
  echo "Fix it by either:"
  echo "  1. running this script with sudo"
  echo "  2. or adding your user to the docker group and logging in again"
  exit 1
fi

mkdir -p docker-data/postgres docker-data/media docker-data/staticfiles
mkdir -p docker-data/caddy_data docker-data/caddy_config

profile_args=()
case "$DEPLOY_MODE" in
  cloudflare)
    if [[ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]]; then
      echo "DEPLOY_MODE=cloudflare but CLOUDFLARE_TUNNEL_TOKEN is empty."
      exit 1
    fi
    profile_args=(--profile cloudflare)
    ;;
  direct)
    profile_args=(--profile direct)
    ;;
  ""|none)
    ;;
  *)
    echo "Unsupported DEPLOY_MODE: $DEPLOY_MODE"
    echo "Use one of: cloudflare, direct, none"
    exit 1
    ;;
esac

compose_cmd=()
if docker compose version >/dev/null 2>&1; then
  compose_cmd=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose_cmd=(docker-compose)
fi

if ((${#compose_cmd[@]} > 0)); then
  "${compose_cmd[@]}" "${profile_args[@]}" up --build -d
else
  POSTGRES_DB=$(env_value POSTGRES_DB liquidlife)
  POSTGRES_USER=$(env_value POSTGRES_USER postgres)
  POSTGRES_PASSWORD=$(env_value POSTGRES_PASSWORD postgres)
  NEXT_PUBLIC_API_URL=$(env_value NEXT_PUBLIC_API_URL http://localhost:8000)
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=$(env_value NEXT_PUBLIC_GOOGLE_CLIENT_ID "")
  ALLOWED_HOSTS=$(env_value ALLOWED_HOSTS "localhost,127.0.0.1,backend")

  docker network inspect liquidlife-network >/dev/null 2>&1 || docker network create liquidlife-network >/dev/null

  API_DOMAIN=$(env_value API_DOMAIN api.localhost)
  docker rm -f liquidlife-cloudflared liquidlife-caddy liquidlife-frontend liquidlife-backend liquidlife-db >/dev/null 2>&1 || true

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
    --network-alias db \
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
    --network-alias backend \
    --env-file .env \
    -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@liquidlife-db:5432/${POSTGRES_DB}" \
    -e STATIC_ROOT=/app/staticfiles \
    -e MEDIA_ROOT=/app/media \
    -e PORT=8000 \
    -e ALLOWED_HOSTS="$ALLOWED_HOSTS" \
    -p 127.0.0.1:8000:8000 \
    -v "$ROOT_DIR/docker-data/media:/app/media" \
    -v "$ROOT_DIR/docker-data/staticfiles:/app/staticfiles" \
    liquidlife-backend:latest >/dev/null

  docker run -d \
    --name liquidlife-frontend \
    --restart unless-stopped \
    --network liquidlife-network \
    --network-alias frontend \
    --env-file .env \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e HOSTNAME=0.0.0.0 \
    -e NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
    -e NEXT_PUBLIC_GOOGLE_CLIENT_ID="$NEXT_PUBLIC_GOOGLE_CLIENT_ID" \
    -p 127.0.0.1:3000:3000 \
    liquidlife-frontend:latest >/dev/null

  if [[ "$DEPLOY_MODE" == "direct" ]]; then
    docker run -d \
      --name liquidlife-caddy \
      --restart unless-stopped \
      --network liquidlife-network \
      --env-file .env \
      -e PUBLIC_DOMAIN="$PUBLIC_DOMAIN" \
      -e API_DOMAIN="$API_DOMAIN" \
      -p 80:80 \
      -p 443:443 \
      -v "$ROOT_DIR/Caddyfile:/etc/caddy/Caddyfile:ro" \
      -v "$ROOT_DIR/docker-data/caddy_data:/data" \
      -v "$ROOT_DIR/docker-data/caddy_config:/config" \
      caddy:2 >/dev/null
  fi

  if [[ "$DEPLOY_MODE" == "cloudflare" ]]; then
    docker run -d \
      --name liquidlife-cloudflared \
      --restart unless-stopped \
      --network liquidlife-network \
      --env-file .env \
      cloudflare/cloudflared:latest \
      tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN" >/dev/null
  fi
fi

echo "Frontend direct: http://localhost:3000"
echo "Backend direct:  http://localhost:8000"
echo "Health:          http://localhost:8000/healthz"
if [[ "$DEPLOY_MODE" == "direct" ]]; then
  echo "Proxy HTTP:      http://localhost"
  echo "Proxy HTTPS:     https://${PUBLIC_DOMAIN}"
fi
if [[ "$DEPLOY_MODE" == "cloudflare" ]]; then
  echo "Cloudflare app:  https://${PUBLIC_DOMAIN}"
  echo "Cloudflare API:  https://$(env_value API_DOMAIN api.localhost)"
fi
