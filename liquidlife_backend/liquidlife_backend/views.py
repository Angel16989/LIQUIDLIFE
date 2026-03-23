from django.db import connections
from django.db.utils import OperationalError
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def healthcheck(_request):
    database_ok = True
    try:
        with connections["default"].cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except OperationalError:
        database_ok = False

    status_code = 200 if database_ok else 503
    return JsonResponse(
        {
            "status": "ok" if database_ok else "degraded",
            "database": database_ok,
        },
        status=status_code,
    )
