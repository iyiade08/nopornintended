from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import ContactMessage, ContentReport
from .serializers import ContactMessageSerializer, ContentReportSerializer


class ContactMessageCreateAPIView(generics.CreateAPIView):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    permission_classes = [AllowAny]


class ContentReportCreateAPIView(generics.CreateAPIView):
    queryset = ContentReport.objects.all()
    serializer_class = ContentReportSerializer
    permission_classes = [AllowAny]