# Liquid Life Backend (Django REST)

## Setup

```bash
cd liquidlife_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## PostgreSQL Environment Variables

Set these before running:

```bash
export POSTGRES_DB=liquidlife
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
```

Optional Django settings:

```bash
export DJANGO_SECRET_KEY='your-secret'
export DJANGO_DEBUG=True
export DJANGO_ALLOWED_HOSTS='127.0.0.1,localhost'
```

## Migrate and Run

```bash
python manage.py migrate
python manage.py runserver
```

## API Endpoints

- `GET /jobs`
- `POST /jobs`
- `PUT /jobs/{id}`
- `DELETE /jobs/{id}`
