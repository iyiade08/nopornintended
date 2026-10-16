from rest_framework.throttling import AnonRateThrottle


class SubmissionThrottle(AnonRateThrottle):
    scope = "submissions"
    rate = "10/hour"
