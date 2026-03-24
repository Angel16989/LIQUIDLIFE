# LiquidLife

Liquid Life is a full-stack life management app with:
- Next.js 16 frontend
- Django REST backend
- PostgreSQL
- JWT auth with admin approval
- document management and AI-assisted procurement

## Local Run

### macOS / Linux

```bash
./scripts/dev.sh
```

### Windows PowerShell

```powershell
.\scripts\dev.ps1
```

The dev scripts:
- load the root `.env`
- install dependencies
- run Django migrations
- start Django on `127.0.0.1:8000`
- start Next.js on `http://localhost:3000`

## Environment Setup

Create a root `.env` from [.env.example](.env.example):

```bash
cp .env.example .env
```

Minimum local values:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
SECRET_KEY=replace_with_a_long_random_secret
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/liquidlife
LIQUIDLIFE_ADMIN_PASSWORD=change_me_admin_password
OPENAI_API_KEY=your_openai_api_key_here
```

## Google + Email Setup

For live auth and approval email flows:

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
```

Notes:
- Google frontend and backend client IDs should match.
- Gmail SMTP should use a Gmail App Password, not the normal Gmail password.
- New registrations send approval emails to `LIQUIDLIFE_ADMIN_NOTIFICATION_EMAILS`.

## SMS Verification

Twilio Verify is supported, but it is optional.

If these are blank, the app falls back to email-only verification and the UI shows that SMS is unavailable:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

## Production Hosting

The repo is ready for staged or production hosting if you provide real production env values.

Minimum production changes:

```env
DEBUG=False
NEXT_PUBLIC_API_URL=https://api.your-domain.com
FRONTEND_BASE_URL=https://app.your-domain.com
ALLOWED_HOSTS=api.your-domain.com
CSRF_TRUSTED_ORIGINS=https://app.your-domain.com
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://app.your-domain.com
USE_X_FORWARDED_HOST=True
USE_X_FORWARDED_PROTO=True
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
DATABASE_CONN_MAX_AGE=60
STATIC_ROOT=/var/data/liquidlife/staticfiles
MEDIA_ROOT=/var/data/liquidlife/media
```

Deployment notes:
- Backend health check: `GET /healthz`
- Backend start command: `gunicorn liquidlife_backend.wsgi:application --bind 0.0.0.0:$PORT`
- Backend build command: `./build.sh`
- Backend static files are served with WhiteNoise.
- Uploaded media needs persistent storage. Do not deploy media to ephemeral disk if you need document persistence.

Recommended split:
1. Next.js frontend on Vercel
2. Django backend on Render, Railway, or a VPS
3. Managed PostgreSQL
4. Persistent disk or object storage for media

More deployment detail is in [DEPLOY.md](DEPLOY.md).
Google sign-in setup is isolated in [GOOGLE_SETUP.md](GOOGLE_SETUP.md).

## Backend Check

```bash
cd liquidlife_backend
./venv/bin/python manage.py check
```

## Frontend Check

```bash
cd frontend
source ~/.nvm/nvm.sh
nvm use 20
npm run lint
npm run build
```

## Windows

Windows-specific startup notes are in [WINDOWS.md](WINDOWS.md).
