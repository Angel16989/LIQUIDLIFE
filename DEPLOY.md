# Deploying LiquidLife

This repo is split cleanly:
- `frontend/` is the Next.js app
- `liquidlife_backend/` is the Django API

Recommended deployment:
1. Deploy `frontend/` to Vercel
2. Deploy `liquidlife_backend/` to Render or Railway
3. Use managed PostgreSQL
4. Attach persistent storage for Django `MEDIA_ROOT`

If you want to host the whole app on one Linux machine using Docker instead, use [DOCKER.md](DOCKER.md).

Google sign-in setup is documented separately in [GOOGLE_SETUP.md](GOOGLE_SETUP.md).

## Frontend

Project root:
- `frontend`

Build command:

```bash
npm install
npm run build
```

Start command:

```bash
npm run start
```

Required env:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_web_client_id
```

## Backend

Project root:
- `liquidlife_backend`

Build command:

```bash
pip install -r requirements.txt
./build.sh
```

Start command:

```bash
gunicorn liquidlife_backend.wsgi:application --bind 0.0.0.0:$PORT
```

Or use the included [Procfile](liquidlife_backend/Procfile).

Required env:

```env
SECRET_KEY=replace_with_a_real_secret
DEBUG=False
ALLOWED_HOSTS=api.your-domain.com
FRONTEND_BASE_URL=https://app.your-domain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://app.your-domain.com
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
DATABASE_URL=postgresql://...
DATABASE_CONN_MAX_AGE=60
USE_X_FORWARDED_HOST=True
USE_X_FORWARDED_PROTO=True
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
STATIC_ROOT=/var/data/liquidlife/staticfiles
MEDIA_ROOT=/var/data/liquidlife/media
```

Auth/email env:

```env
LIQUIDLIFE_ADMIN_USERNAME=LIQUIDLIFEADMIN
LIQUIDLIFE_ADMIN_PASSWORD=replace_with_a_real_admin_password
LIQUIDLIFE_ADMIN_NOTIFICATION_EMAILS=your-admin@gmail.com
GOOGLE_OAUTH_CLIENT_ID=your_google_web_client_id
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-admin@gmail.com
EMAIL_HOST_PASSWORD=your_gmail_app_password
DEFAULT_FROM_EMAIL=your-admin@gmail.com
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
ACCOUNT_VERIFICATION_REQUIRED=False
ACCOUNT_VERIFICATION_NOTICE_ENABLED=True
```

Optional SMS env:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

If Twilio env vars are blank, the app falls back to email-only verification.
If `ACCOUNT_VERIFICATION_REQUIRED=False`, users see a soft upcoming-verification notice instead of being blocked.

## Health Check

Backend health endpoint:

```text
GET /healthz
```

Expected response:

```json
{
  "status": "ok",
  "database": true
}
```

## Storage Warning

Uploaded documents live under Django media storage.

If your host uses ephemeral disk and you do not mount persistent storage, uploaded files can disappear after restart or redeploy. Use one of:
- a persistent disk
- object storage later (Azure Blob, S3, etc.)

## First Production Smoke Test

After deploy:
1. Open landing page
2. Register a normal user
3. Confirm admin email receives approval request
4. Approve the user
5. Verify email
6. Login
7. Open `/documents`
8. Upload a file and refresh
9. Open `/procurement`
10. Generate a resume or cover letter
