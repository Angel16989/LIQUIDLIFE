from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document, Job
from .serializers import DocumentSerializer, JobSerializer


class DocumentListCreateAPIView(APIView):
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        documents = Document.objects.all().order_by("-updated_at", "-id")
        serializer = DocumentSerializer(documents, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        serializer = DocumentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentDetailAPIView(APIView):
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request, id: int):
        document = get_object_or_404(Document, id=id)
        serializer = DocumentSerializer(document, context={"request": request})
        return Response(serializer.data)

    def put(self, request, id: int):
        document = get_object_or_404(Document, id=id)
        serializer = DocumentSerializer(document, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, id: int):
        document = get_object_or_404(Document, id=id)
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JobListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        jobs = Job.objects.select_related("resume", "cover_letter").all().order_by("-application_date", "-id")
        serializer = JobSerializer(jobs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = JobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JobUpdateDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, id: int):
        job = get_object_or_404(Job.objects.select_related("resume", "cover_letter"), id=id)
        serializer = JobSerializer(job, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, id: int):
        job = get_object_or_404(Job, id=id)
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
