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

## Live Google + Gmail Setup

For production-style auth and approval email flows, set these values in `.env`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_web_client_id
GOOGLE_OAUTH_CLIENT_ID=your_google_web_client_id
LIQUIDLIFE_ADMIN_NOTIFICATION_EMAILS=your-admin@gmail.com
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-admin@gmail.com
EMAIL_HOST_PASSWORD=your_gmail_app_password
DEFAULT_FROM_EMAIL=your-admin@gmail.com
AUTHORIZATION_EMAIL_ACTION_MAX_AGE_SECONDS=604800
EMAIL_VERIFICATION_MAX_AGE_SECONDS=604800
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid
```

Notes:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_ID` should be the same Google Web client ID.
- For Gmail SMTP, use an App Password, not your normal Gmail password.
- `LIQUIDLIFE_ADMIN_NOTIFICATION_EMAILS` receives pending-registration approval emails with direct approve/reject links.
- Twilio Verify is used for SMS phone verification before non-admin users can access the main app features.
- Normal registrations require:
  - admin approval
  - email verification
  - phone verification
- Google sign-in can satisfy email verification automatically when Google is authoritative for that email account.

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
