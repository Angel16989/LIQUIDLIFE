from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("jobs.urls")),
    path("auth/", include("accounts.urls")),
    path("procurement/", include("procurement.urls")),
]
