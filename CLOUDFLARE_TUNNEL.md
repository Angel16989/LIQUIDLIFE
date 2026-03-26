# Cloudflare Tunnel Setup For `rasikn.com`

Use this path if you cannot access the router or do not want to open inbound ports.

This setup keeps the app on your tower PC and publishes it through Cloudflare Tunnel:
- `https://rasikn.com` -> frontend
- `https://api.rasikn.com` -> backend
- `https://liquidlife.rasikn.com` -> same frontend, but routed into the Liquid Life app experience

## Why this path

Cloudflare Tunnel uses an outbound-only connection from your machine to Cloudflare.
That means:
- no router port forwarding
- no public inbound ports required
- no direct exposure of your home IP to the app visitors

## 1. Move DNS authority to Cloudflare

At GoDaddy:
1. Add `rasikn.com` to your Cloudflare account.
2. Cloudflare will assign two nameservers.
3. In GoDaddy, replace the domain nameservers with the two Cloudflare nameservers.

Wait until Cloudflare shows the zone as active.

## 2. Create a Cloudflare Tunnel

In Cloudflare Zero Trust:
1. Go to `Networks` -> `Tunnels`
2. Create a tunnel
3. Choose `Cloudflared`
4. Name it something like `liquidlife-tower`
5. Keep going until Cloudflare shows the connector/token command

You do not need to install `cloudflared` directly on Linux because this repo runs it in Docker.

Copy the tunnel token from the command. It is the long `eyJ...` value.

## 3. Add public hostnames

Inside the tunnel settings, add these public hostnames:

1. Frontend
- Hostname: `rasikn.com`
- Service type: `HTTP`
- URL: `http://localhost:3000`

2. Backend
- Hostname: `api.rasikn.com`
- Service type: `HTTP`
- URL: `http://localhost:8000`

3. Liquid Life app subdomain
- Hostname: `liquidlife.rasikn.com`
- Service type: `HTTP`
- URL: `http://localhost:3000`

Cloudflare will create the corresponding DNS records automatically when you add the public hostnames.

Use `localhost` in the hostname routes if `cloudflared` is installed as a Linux service on the tower PC.
Only use `frontend` / `backend` service names if `cloudflared` itself is running inside Docker on the same bridge network.

## 4. Configure `.env`

In the repo root:

```bash
cp .env.example .env
nano .env
```

Use at least:

```env
DEPLOY_MODE=cloudflare
PUBLIC_DOMAIN=rasikn.com
API_DOMAIN=api.rasikn.com
NEXT_PUBLIC_API_URL=https://api.rasikn.com
FRONTEND_BASE_URL=https://rasikn.com
NEXT_PUBLIC_GITHUB_USERNAME=Angel16989
NEXT_PUBLIC_SITE_OWNER=Rasik N
NEXT_PUBLIC_LIQUIDLIFE_APP_URL=https://liquidlife.rasikn.com
ALLOWED_HOSTS=rasikn.com,api.rasikn.com,localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=https://rasikn.com,https://liquidlife.rasikn.com
CSRF_TRUSTED_ORIGINS=https://rasikn.com,https://liquidlife.rasikn.com
DEBUG=False
USE_X_FORWARDED_HOST=True
USE_X_FORWARDED_PROTO=True
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here
```

Also set your real:
- `SECRET_KEY`
- `LIQUIDLIFE_ADMIN_PASSWORD`
- `POSTGRES_PASSWORD`
- email settings
- OpenAI key if needed

## 5. Start the app

```bash
./scripts/docker-up.sh
```

That starts:
- `db`
- `backend`
- `frontend`
- `cloudflared`

## 6. Check logs

```bash
docker logs -f liquidlife-cloudflared
docker logs -f liquidlife-backend
docker logs -f liquidlife-frontend
```

## 7. Test

Open:
- `https://rasikn.com`
- `https://api.rasikn.com/healthz`

## Notes

- You do not need `A` records pointing to your home IP for the tunnel hostnames once Cloudflare manages the DNS records for the tunnel.
- If you previously added `A` records for `@` and `api`, remove them if they conflict with the tunnel hostnames.
- If Google login is added later, update the Google OAuth authorized origins to:
  - `https://rasikn.com`
