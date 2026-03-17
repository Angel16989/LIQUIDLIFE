# LiquidLife

## One-Command Local Run

### macOS / Linux

From repo root:

```bash
./scripts/dev.sh
```

### Windows PowerShell

From repo root:

```powershell
.\scripts\dev.ps1
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

## Environment Setup

Create a `.env` file at the repo root and use [.env.example](.env.example) as the template.

Minimum local dev values:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
SECRET_KEY=replace_with_a_long_random_secret
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/liquidlife
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
LIQUIDLIFE_ADMIN_PASSWORD=change_me_admin_password
```

The local startup scripts load this root `.env` file for both Django and Next.js.

Windows-specific notes are also in [WINDOWS.md](WINDOWS.md).

## First-Time Setup Only

### macOS / Linux

If you just want setup without running servers:

```bash
./scripts/bootstrap.sh
```

### Windows PowerShell

If you just want setup without running servers:

```powershell
.\scripts\bootstrap.ps1
```

## Requirements

- `nvm` installed on macOS/Linux, or `nvm-windows` on Windows
- Python 3.10+
- PostgreSQL running for your configured DB
