from rest_framework.pagination import PageNumberPagination


class VideoPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = "page_size"
    max_page_size = 48

    def paginate_queryset(self, queryset, request, view=None):
        # Preserve the original list response for existing API consumers.
        if not any(key in request.query_params for key in ("page", "page_size")):
            return None
        return super().paginate_queryset(queryset, request, view)


class CommentPagination(PageNumberPagination):
    page_size = 10
