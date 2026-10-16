from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import ContactMessage, ContentReport
from .serializers import ContactMessageSerializer, ContentReportSerializer
from .throttles import SubmissionThrottle


class ContactMessageCreateAPIView(generics.CreateAPIView):
    throttle_classes = [SubmissionThrottle]
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    permission_classes = [AllowAny]


class ContentReportCreateAPIView(generics.CreateAPIView):
    throttle_classes = [SubmissionThrottle]
    queryset = ContentReport.objects.all()
    serializer_class = ContentReportSerializer
    permission_classes = [AllowAny]
