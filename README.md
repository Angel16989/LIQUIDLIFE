# LiquidLife

## One-Command Local Run

From repo root:

```bash
./scripts/dev.sh
```

What this does automatically:
- Uses Node.js 20 via `nvm`
- Installs frontend dependencies
- Creates/uses backend virtualenv
- Installs backend dependencies
- Runs Django migrations
- Starts backend on `127.0.0.1:8000`
- Starts Next.js on `localhost:3000`
- Opens your browser to `http://localhost:3000`

## First-Time Setup Only

If you just want setup without running servers:

```bash
./scripts/bootstrap.sh
```

## Requirements

- `nvm` installed
- Python 3.10+
- PostgreSQL running for your configured DB
