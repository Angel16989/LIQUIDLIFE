from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Job
from .serializers import JobSerializer


class JobListCreateAPIView(APIView):
    def get(self, request):
        jobs = Job.objects.all().order_by("-application_date", "-id")
        serializer = JobSerializer(jobs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = JobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class JobUpdateDeleteAPIView(APIView):
    def put(self, request, id: int):
        job = get_object_or_404(Job, id=id)
        serializer = JobSerializer(job, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, id: int):
        job = get_object_or_404(Job, id=id)
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
