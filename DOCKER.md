# Direct Docker Deployment On One Linux Server

Use this document only if you can access your router and forward ports.

If you cannot access the router, use [CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md) instead.

This setup runs the full stack on a single machine:
- Next.js frontend
- Django backend
- PostgreSQL
- Caddy reverse proxy with HTTPS

Containers:
- `frontend` on port `3000`
- `backend` on port `8000`
- `db` internal only
- `caddy` on ports `80` and `443`

Persistent data lives under:
- `docker-data/postgres`
- `docker-data/media`
- `docker-data/staticfiles`
- `docker-data/caddy_data`
- `docker-data/caddy_config`

## 1. Prepare `.env`

Create the root env file:

```bash
cp .env.example .env
nano .env
```

If this machine will be accessed from other devices, use the machine IP or domain, not `localhost`.

Example for `rasikn.com`:

```env
DEPLOY_MODE=direct
NEXT_PUBLIC_API_URL=https://api.rasikn.com
FRONTEND_BASE_URL=https://rasikn.com
PUBLIC_DOMAIN=rasikn.com
API_DOMAIN=api.rasikn.com
ALLOWED_HOSTS=rasikn.com,api.rasikn.com,localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=https://rasikn.com
CSRF_TRUSTED_ORIGINS=https://rasikn.com
POSTGRES_DB=liquidlife
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change_me_db_password
LIQUIDLIFE_ADMIN_PASSWORD=change_me_admin_password
SECRET_KEY=replace_with_a_long_random_secret
DEBUG=False
USE_X_FORWARDED_HOST=True
USE_X_FORWARDED_PROTO=True
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
```

If you are adding Google login later:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_ID=
```

If you are not ready for Google yet, leave those blank.

## 2. Start the stack

```bash
./scripts/docker-up.sh
```

That command:
- creates the persistent data directories
- builds the images
- starts all services in the background
- uses Docker Compose when installed, or falls back to plain `docker` on machines that only have the core Docker CLI

If the script says the Docker daemon is not accessible, fix the server user permissions first:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

## 3. Check the stack

```bash
docker ps --filter name=liquidlife
curl http://localhost:8000/healthz
```

Expected backend response:

```json
{"status":"ok","database":true}
```

## 4. Open the app

From this machine:
- `https://rasikn.com`

From another device:
- `https://rasikn.com`
- `https://api.rasikn.com/healthz`

## DNS

Create these DNS records at your registrar:
- `A` record: `rasikn.com` -> your public server IP
- `A` record: `api.rasikn.com` -> your public server IP

If you use `www`, either:
- add `www` as another `A` record to the same IP
- or redirect it at the registrar

## Common server mistake

If another laptop opens the frontend but login or data calls fail, the frontend was probably built with the wrong `NEXT_PUBLIC_API_URL`.

For `rasikn.com`, it must be:

```env
NEXT_PUBLIC_API_URL=https://api.rasikn.com
```

Fix it by changing `.env` and rebuilding the frontend:

```bash
./scripts/docker-up.sh
```

## Useful commands

Start:

```bash
./scripts/docker-up.sh
```

Stop:

```bash
./scripts/docker-down.sh
```

Logs:

```bash
docker logs -f liquidlife-frontend
docker logs -f liquidlife-backend
docker logs -f liquidlife-db
```

Restart one service:

```bash
docker restart liquidlife-backend
docker restart liquidlife-frontend
```

Pull code update and redeploy:

```bash
git pull origin main
./scripts/docker-up.sh
```

## Ports and firewall

Open at least:
- `80/tcp`
- `443/tcp`

Note:
- `3000` and `8000` are bound to `127.0.0.1` only for local troubleshooting
- external traffic should go through `80/443`

## Security note

This Docker setup is enough to run the app on your machine today.

It is not a full hardened internet-facing reverse-proxy setup yet. If you later expose it publicly on a real domain, the next step is:
1. keep this tower PC patched and stable
2. back up `docker-data/`
3. later move media/object storage off local disk if needed
