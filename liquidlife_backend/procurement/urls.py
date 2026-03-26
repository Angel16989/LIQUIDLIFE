from django.urls import path

from .views import (
    ProcurementATSAPIView,
    ProcurementApplicationPairAPIView,
    ProcurementCoverLetterAPIView,
    ProcurementResumeAutofillAPIView,
    ProcurementResumeAPIView,
    ProcurementStatusAPIView,
)

urlpatterns = [
    path("status", ProcurementStatusAPIView.as_view(), name="procurement-status"),
    path("generate-pair", ProcurementApplicationPairAPIView.as_view(), name="procurement-generate-pair"),
    path("parse-resume", ProcurementResumeAutofillAPIView.as_view(), name="procurement-parse-resume"),
    path("cover-letter", ProcurementCoverLetterAPIView.as_view(), name="procurement-cover-letter"),
    path("resume", ProcurementResumeAPIView.as_view(), name="procurement-resume"),
    path("ats-review", ProcurementATSAPIView.as_view(), name="procurement-ats-review"),
]
