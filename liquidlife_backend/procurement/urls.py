from django.urls import path

from .views import ProcurementATSAPIView, ProcurementCoverLetterAPIView, ProcurementResumeAPIView, ProcurementStatusAPIView

urlpatterns = [
    path("status", ProcurementStatusAPIView.as_view(), name="procurement-status"),
    path("cover-letter", ProcurementCoverLetterAPIView.as_view(), name="procurement-cover-letter"),
    path("resume", ProcurementResumeAPIView.as_view(), name="procurement-resume"),
    path("ats-review", ProcurementATSAPIView.as_view(), name="procurement-ats-review"),
]
