from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsVerifiedAccountOrAdmin
from jobs.models import Document

from .serializers import (
    ApplicationPairGenerationSerializer,
    AtsReviewSerializer,
    CoverLetterGenerationSerializer,
    ProcurementStatusSerializer,
    ResumeAutofillSerializer,
    ResumeGenerationSerializer,
)
from .services import (
    ProcurementAIConfigurationError,
    ProcurementAIError,
    ats_review,
    extract_resume_profile,
    extract_resume_text,
    generate_application_documents,
    generate_cover_letter,
    generate_resume,
    get_ai_status,
    strip_html,
)


class ProcurementStatusAPIView(APIView):
    permission_classes = [IsVerifiedAccountOrAdmin]

    def get(self, request):
        serializer = ProcurementStatusSerializer(get_ai_status())
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProcurementCoverLetterAPIView(APIView):
    permission_classes = [IsVerifiedAccountOrAdmin]

    def post(self, request):
        serializer = CoverLetterGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resume_text = ""
        resume_document_id = data.get("resume_document_id")
        if resume_document_id:
            resume = get_object_or_404(
                Document,
                id=resume_document_id,
                owner=request.user,
                doc_type=Document.DocType.RESUME,
            )
            resume_text = strip_html(resume.content)

        try:
            payload = generate_cover_letter(
                profile=data["profile"],
                job_description=data["job_description"],
                resume_text=resume_text,
                tone=data.get("tone", "professional"),
                company_name=data.get("company_name", ""),
            )
        except ProcurementAIConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ProcurementAIError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(payload, status=status.HTTP_200_OK)


class ProcurementResumeAPIView(APIView):
    permission_classes = [IsVerifiedAccountOrAdmin]

    def post(self, request):
        serializer = ResumeGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resume_text = ""
        resume_document_id = data.get("resume_document_id")
        if resume_document_id:
            resume = get_object_or_404(
                Document,
                id=resume_document_id,
                owner=request.user,
                doc_type=Document.DocType.RESUME,
            )
            resume_text = strip_html(resume.content)

        try:
            payload = generate_resume(
                profile=data["profile"],
                job_description=data["job_description"],
                resume_text=resume_text,
                tone=data.get("tone", "professional"),
                target_role=data.get("target_role", ""),
                template_name=data.get("template_name", "balanced"),
                template_config=data.get("template_config") or {},
            )
        except ProcurementAIConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ProcurementAIError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(payload, status=status.HTTP_200_OK)


class ProcurementApplicationPairAPIView(APIView):
    permission_classes = [IsVerifiedAccountOrAdmin]

    def post(self, request):
        serializer = ApplicationPairGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resume_text = ""
        resume_document_id = data.get("resume_document_id")
        if resume_document_id:
            resume = get_object_or_404(
                Document,
                id=resume_document_id,
                owner=request.user,
                doc_type=Document.DocType.RESUME,
            )
            resume_text = strip_html(resume.content)

        try:
            payload = generate_application_documents(
                profile=data["profile"],
                job_description=data["job_description"],
                resume_text=resume_text,
                company_name=data.get("company_name", ""),
                target_role=data.get("target_role", ""),
                template_name=data.get("template_name", "balanced"),
                template_config=data.get("template_config") or {},
            )
        except ProcurementAIConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ProcurementAIError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(payload, status=status.HTTP_200_OK)


class ProcurementATSAPIView(APIView):
    permission_classes = [IsVerifiedAccountOrAdmin]

    def post(self, request):
        serializer = AtsReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        resume_content = data.get("resume_content", "")
        resume_document_id = data.get("resume_document_id")
        if resume_document_id:
            resume = get_object_or_404(
                Document,
                id=resume_document_id,
                owner=request.user,
                doc_type=Document.DocType.RESUME,
            )
            resume_content = resume.content

        payload = ats_review(
            job_description=data["job_description"],
            resume_content=resume_content,
        )
        return Response(payload, status=status.HTTP_200_OK)


class ProcurementResumeAutofillAPIView(APIView):
    permission_classes = [IsVerifiedAccountOrAdmin]

    def post(self, request):
        serializer = ResumeAutofillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resume_file = serializer.validated_data["resume"]
        resume_text = extract_resume_text(resume_file)
        if not resume_text.strip():
            return Response(
                {"detail": "Could not extract readable content from that resume."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = extract_resume_profile(resume_text)
        return Response({"profile": profile}, status=status.HTTP_200_OK)
