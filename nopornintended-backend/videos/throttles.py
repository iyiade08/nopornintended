from rest_framework.throttling import AnonRateThrottle


class CommentThrottle(AnonRateThrottle):
    scope = "comments"
    rate = "5/minute"

    def allow_request(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return super().allow_request(request, view)


class ReactionThrottle(AnonRateThrottle):
    scope = "reactions"
    rate = "60/minute"
