from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import StaticPage
from .serializers import StaticPageSerializer


class StaticPageDetailAPIView(generics.RetrieveAPIView):
    serializer_class = StaticPageSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return StaticPage.objects.filter(is_published=True)