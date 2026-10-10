from django.urls import path

from .views import ContactMessageCreateAPIView, ContentReportCreateAPIView

urlpatterns = [
    path("contact/", ContactMessageCreateAPIView.as_view(), name="contact-create"),
    path("reports/", ContentReportCreateAPIView.as_view(), name="content-report-create"),
]