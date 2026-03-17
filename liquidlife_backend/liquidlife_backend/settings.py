import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent


def load_env_file(path: Path):
    if not path.exists() or not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if not key or key in os.environ:
            continue

        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]

        os.environ[key] = value


for env_file in (BASE_DIR / ".env", REPO_ROOT / ".env"):
    load_env_file(env_file)


def env(*names: str, default: str | None = None, required: bool = False) -> str:
    for name in names:
        value = os.getenv(name)
        if value is not None and value != "":
            return value

    if required and default is None:
        raise RuntimeError(f"Missing required environment variable. Expected one of: {', '.join(names)}")

    return default or ""


def env_bool(*names: str, default: bool = False) -> bool:
    value = env(*names, default=str(default))
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(*names: str, default: str = "") -> list[str]:
    value = env(*names, default=default)
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_database_url(database_url: str) -> dict:
    parsed = urlparse(database_url)
    scheme = parsed.scheme.lower()

    if scheme in {"postgres", "postgresql", "pgsql"}:
        config = {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": parsed.username or "",
            "PASSWORD": parsed.password or "",
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or ""),
        }
    elif scheme == "sqlite":
        sqlite_path = parsed.path
        if not sqlite_path or sqlite_path == "/:memory:":
            sqlite_name = ":memory:"
        elif database_url.startswith("sqlite:////"):
            sqlite_name = parsed.path
        else:
            sqlite_name = str((BASE_DIR / parsed.path.lstrip("/")).resolve())

        config = {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": sqlite_name,
        }
    else:
        raise RuntimeError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")

    options = {}
    query_options = parse_qs(parsed.query)
    if "sslmode" in query_options:
        options["sslmode"] = query_options["sslmode"][-1]
    if options:
        config["OPTIONS"] = options

    return config


DEBUG = env_bool("DEBUG", "DJANGO_DEBUG", default=True)
SECRET_KEY = env("SECRET_KEY", "DJANGO_SECRET_KEY", required=True)

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "DJANGO_ALLOWED_HOSTS", default="127.0.0.1,localhost")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "accounts",
    "jobs",
    "procurement",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "liquidlife_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "liquidlife_backend.wsgi.application"
ASGI_APPLICATION = "liquidlife_backend.asgi.application"

DATABASE_URL = env("DATABASE_URL", default="")

if DATABASE_URL:
    DATABASES = {
        "default": parse_database_url(DATABASE_URL),
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB", default="liquidlife"),
            "USER": env("POSTGRES_USER", default="postgres"),
            "PASSWORD": env("POSTGRES_PASSWORD", default="postgres"),
            "HOST": env("POSTGRES_HOST", default="127.0.0.1"),
            "PORT": env("POSTGRES_PORT", default="5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Keep endpoints exactly as /jobs and /jobs/{id}
APPEND_SLASH = False

CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", default=DEBUG)
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", default="")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
}

LIQUIDLIFE_ADMIN_USERNAME = env("LIQUIDLIFE_ADMIN_USERNAME", default="LIQUIDLIFEADMIN")
LIQUIDLIFE_ADMIN_PASSWORD = env("LIQUIDLIFE_ADMIN_PASSWORD", default="")
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:3000")
GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID", default="")
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
OPENAI_MODEL = env("OPENAI_MODEL", default="gpt-4o-mini")

EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Liquid Life <no-reply@liquidlife.local>")
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = int(env("EMAIL_PORT", default="587"))
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", default=True)
