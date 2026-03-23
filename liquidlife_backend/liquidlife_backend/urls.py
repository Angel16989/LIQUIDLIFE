from django.contrib import admin
from django.urls import include, path

from .views import healthcheck

urlpatterns = [
    path("healthz", healthcheck, name="healthcheck"),
    path("admin/", admin.site.urls),
    path("", include("jobs.urls")),
    path("auth/", include("accounts.urls")),
    path("procurement/", include("procurement.urls")),
]
