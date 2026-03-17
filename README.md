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

## OpenAI Setup For Procurement

Put your OpenAI key in a `.env` file at the repo root or in `liquidlife_backend/.env`.

Use [.env.example](.env.example) as the template:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

Then restart the backend or rerun the dev script.

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
