# Docker Deployment On One Linux Server

This setup runs the full stack on a single machine:
- Next.js frontend
- Django backend
- PostgreSQL

Containers:
- `frontend` on port `3000`
- `backend` on port `8000`
- `db` internal only

Persistent data lives under:
- `docker-data/postgres`
- `docker-data/media`
- `docker-data/staticfiles`

## 1. Prepare `.env`

Create the root env file:

```bash
cp .env.example .env
nano .env
```

If this machine will be accessed from other devices, use the machine IP or domain, not `localhost`.

Example for a server at `192.168.1.50`:

```env
NEXT_PUBLIC_API_URL=http://192.168.1.50:8000
FRONTEND_BASE_URL=http://192.168.1.50:3000
ALLOWED_HOSTS=192.168.1.50,localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://192.168.1.50:3000
CSRF_TRUSTED_ORIGINS=http://192.168.1.50:3000
POSTGRES_DB=liquidlife
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change_me_db_password
LIQUIDLIFE_ADMIN_PASSWORD=change_me_admin_password
SECRET_KEY=replace_with_a_long_random_secret
DEBUG=False
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
- `http://localhost:3000`

From another device:
- `http://SERVER_IP:3000`

## Common server mistake

If another laptop opens the frontend but login or data calls fail, the frontend was probably built with `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.

That only works on the same machine.

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
- `3000/tcp` for the frontend
- `8000/tcp` for the backend if clients or the frontend call it directly

If you later put Nginx or Caddy in front, you can move to:
- `80/tcp`
- `443/tcp`

## Security note

This Docker setup is enough to run the app on your machine today.

It is not a full hardened internet-facing reverse-proxy setup yet. If you later expose it publicly on a real domain, the next step is:
1. add Nginx or Caddy
2. terminate HTTPS there
3. move the app behind `80/443`
