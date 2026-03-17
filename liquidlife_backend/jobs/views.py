import mimetypes

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .document_content import ensure_document_content
from .models import Document, Job
from .serializers import DocumentSerializer, JobSerializer


class DocumentListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        documents = Document.objects.filter(owner=request.user).order_by("-updated_at", "-id")
        serializer = DocumentSerializer(documents, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        serializer = DocumentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(owner=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request, id: int):
        document = get_object_or_404(Document, id=id, owner=request.user)
        ensure_document_content(document)
        serializer = DocumentSerializer(document, context={"request": request})
        return Response(serializer.data)

    def put(self, request, id: int):
        document = get_object_or_404(Document, id=id, owner=request.user)
        serializer = DocumentSerializer(document, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, id: int):
        document = get_object_or_404(Document, id=id, owner=request.user)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentFileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id: int):
        document = get_object_or_404(Document, id=id, owner=request.user)
        if not document.file:
            return Response({"detail": "Document file not found."}, status=status.HTTP_404_NOT_FOUND)

        filename = document.file.name.rsplit("/", 1)[-1]
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        response = FileResponse(document.file.open("rb"), as_attachment=False, filename=filename, content_type=content_type)
        return response


class JobListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        jobs = Job.objects.select_related("resume", "cover_letter").filter(owner=request.user).order_by("-application_date", "-id")
        serializer = JobSerializer(jobs, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        serializer = JobSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(owner=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JobUpdateDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, id: int):
        job = get_object_or_404(Job.objects.select_related("resume", "cover_letter"), id=id, owner=request.user)
        serializer = JobSerializer(job, data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, id: int):
        job = get_object_or_404(Job, id=id, owner=request.user)
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
