from django.urls import path

from .views import (
    DocumentDetailAPIView,
    DocumentFileAPIView,
    DocumentListCreateAPIView,
    JobListCreateAPIView,
    JobUpdateDeleteAPIView,
)

urlpatterns = [
    path("jobs", JobListCreateAPIView.as_view(), name="jobs-list-create"),
    path("jobs/<int:id>", JobUpdateDeleteAPIView.as_view(), name="jobs-update-delete"),
    path("documents", DocumentListCreateAPIView.as_view(), name="documents-list-create"),
    path("documents/<int:id>", DocumentDetailAPIView.as_view(), name="documents-detail"),
    path("documents/<int:id>/file", DocumentFileAPIView.as_view(), name="documents-file"),
]
