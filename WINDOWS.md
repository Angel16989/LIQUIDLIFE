# LiquidLife on Windows

## Requirements

- PowerShell 7+ or Windows PowerShell 5.1
- `nvm-windows` installed: https://github.com/coreybutler/nvm-windows
- Python 3.10+
- PostgreSQL running for your configured database

## One-Command Local Run

From the repo root in PowerShell:

```powershell
.\scripts\dev.ps1
```

This will:
- switch to Node.js 20 with `nvm`
- install frontend dependencies
- create or reuse the backend virtual environment
- install backend dependencies
- run Django migrations
- start Django on `127.0.0.1:8000`
- start Next.js on `http://localhost:3000`
- open the browser automatically

## Environment Setup

Create a `.env` file in the repo root using `.env.example` as the template.

Minimum local dev values:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
SECRET_KEY=replace_with_a_long_random_secret
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/liquidlife
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
LIQUIDLIFE_ADMIN_PASSWORD=change_me_admin_password
```

Then rerun:

```powershell
.\scripts\dev.ps1
```

For live Google login and Gmail approval emails, fill the matching values from [.env.example](.env.example).

If Twilio SMS env vars are blank, the app will use email-only verification and show that SMS is unavailable.

## First-Time Setup Only

If you only want the setup steps without starting the servers:

```powershell
.\scripts\bootstrap.ps1
```

## If PowerShell blocks script execution

Run this in the same PowerShell window first:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
