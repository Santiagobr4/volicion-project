from django.core.cache import cache
from django.db import connections
from django.db.utils import OperationalError
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET


@require_GET
@never_cache
def healthz(_request):
    checks = {"db": "ok", "cache": "ok"}
    status = 200

    try:
        with connections["default"].cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except OperationalError as exc:
        checks["db"] = f"error: {exc.__class__.__name__}"
        status = 503

    try:
        cache.set("healthz_ping", "1", timeout=5)
        if cache.get("healthz_ping") != "1":
            checks["cache"] = "error: roundtrip mismatch"
            status = 503
    except Exception as exc:
        checks["cache"] = f"error: {exc.__class__.__name__}"
        status = 503

    return JsonResponse({"status": "ok" if status == 200 else "degraded", "checks": checks}, status=status)
