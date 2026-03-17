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

## OpenAI Setup For Procurement

Create a `.env` file in the repo root or in `liquidlife_backend` using `.env.example` as the template:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

Then rerun:

```powershell
.\scripts\dev.ps1
```

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
