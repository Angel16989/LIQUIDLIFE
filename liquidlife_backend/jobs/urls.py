from django.urls import path

from .views import JobListCreateAPIView, JobUpdateDeleteAPIView

urlpatterns = [
    path("jobs", JobListCreateAPIView.as_view(), name="jobs-list-create"),
    path("jobs/<int:id>", JobUpdateDeleteAPIView.as_view(), name="jobs-update-delete"),
]
