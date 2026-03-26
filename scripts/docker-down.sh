#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not accessible for the current user."
  echo "Use sudo or add your user to the docker group first."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  docker compose down
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose down
else
  docker rm -f liquidlife-cloudflared liquidlife-caddy liquidlife-frontend liquidlife-backend liquidlife-db >/dev/null 2>&1 || true
  docker network rm liquidlife-network >/dev/null 2>&1 || true
fi
