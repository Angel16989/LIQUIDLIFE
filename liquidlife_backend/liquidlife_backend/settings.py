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
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
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
DATABASE_CONN_MAX_AGE = int(env("DATABASE_CONN_MAX_AGE", default="60" if not DEBUG else "0"))

if DATABASE_URL:
    DATABASES = {
        "default": {
            **parse_database_url(DATABASE_URL),
            "CONN_MAX_AGE": DATABASE_CONN_MAX_AGE,
        },
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
            "CONN_MAX_AGE": DATABASE_CONN_MAX_AGE,
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
STATIC_ROOT = Path(env("STATIC_ROOT", default=str(BASE_DIR / "staticfiles")))
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
MEDIA_URL = env("MEDIA_URL", default="/media/")
MEDIA_ROOT = Path(env("MEDIA_ROOT", default=str(BASE_DIR / "media")))
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Keep endpoints exactly as /jobs and /jobs/{id}
APPEND_SLASH = False

CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", default=DEBUG)
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", default="")
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", default="")

USE_X_FORWARDED_HOST = env_bool("USE_X_FORWARDED_HOST", default=not DEBUG)
USE_X_FORWARDED_PROTO = env_bool("USE_X_FORWARDED_PROTO", default=not DEBUG)
if USE_X_FORWARDED_PROTO:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", default=not DEBUG)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", default=not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", default=not DEBUG)
SESSION_COOKIE_SAMESITE = env("SESSION_COOKIE_SAMESITE", default="Lax")
CSRF_COOKIE_SAMESITE = env("CSRF_COOKIE_SAMESITE", default="Lax")
SECURE_HSTS_SECONDS = int(env("SECURE_HSTS_SECONDS", default="0" if DEBUG else "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=not DEBUG)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", default=False)
SECURE_CONTENT_TYPE_NOSNIFF = env_bool("SECURE_CONTENT_TYPE_NOSNIFF", default=True)
SECURE_REFERRER_POLICY = env("SECURE_REFERRER_POLICY", default="strict-origin-when-cross-origin")
X_FRAME_OPTIONS = env("X_FRAME_OPTIONS", default="DENY")

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
LIQUIDLIFE_ADMIN_NOTIFICATION_EMAILS = env_list("LIQUIDLIFE_ADMIN_NOTIFICATION_EMAILS", default="")
AUTHORIZATION_EMAIL_ACTION_MAX_AGE_SECONDS = int(env("AUTHORIZATION_EMAIL_ACTION_MAX_AGE_SECONDS", default="604800"))
EMAIL_VERIFICATION_MAX_AGE_SECONDS = int(env("EMAIL_VERIFICATION_MAX_AGE_SECONDS", default="604800"))

EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Liquid Life <no-reply@liquidlife.local>")
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = int(env("EMAIL_PORT", default="587"))
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", default=True)

TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN", default="")
TWILIO_VERIFY_SERVICE_SID = env("TWILIO_VERIFY_SERVICE_SID", default="")
