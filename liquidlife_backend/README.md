# Liquid Life Backend

## Local Setup

```bash
cd liquidlife_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

The backend also loads the root `.env` file automatically.

## Production Run

Install requirements and run:

```bash
./build.sh
gunicorn liquidlife_backend.wsgi:application --bind 0.0.0.0:$PORT
```

Or use the included [Procfile](Procfile).

## Important Environment Values

```env
SECRET_KEY=replace_with_a_real_secret
DEBUG=False
ALLOWED_HOSTS=api.your-domain.com
FRONTEND_BASE_URL=https://app.your-domain.com
CSRF_TRUSTED_ORIGINS=https://app.your-domain.com
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://app.your-domain.com
DATABASE_URL=postgresql://...
STATIC_ROOT=/var/data/liquidlife/staticfiles
MEDIA_ROOT=/var/data/liquidlife/media
```

## Health Check

```text
GET /healthz
```
