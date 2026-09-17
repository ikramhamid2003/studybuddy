from django.http import JsonResponse
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ChatSessionDetailView,
    ChatSessionListCreateView,
    ChatStreamView,
    GenerateView,
    GenerationListView,
    RegisterView,
    UnifiedAPIView,
)


def health(_request):
    """Small unauthenticated probe for deploy/platform health checks."""

    return JsonResponse({"status": "ok"})


urlpatterns = [
    # ── Legacy routes (preserved for test compatibility) ────────────────
    path("health/", health, name="health"),
    path("generate/", GenerateView.as_view(), name="generate"),
    path("generations/", GenerationListView.as_view(), name="generations"),
    path("chat/stream/", ChatStreamView.as_view(), name="chat_stream"),
    path("sessions/", ChatSessionListCreateView.as_view(), name="chat_sessions"),
    path("sessions/<int:pk>/", ChatSessionDetailView.as_view(), name="chat_session_detail"),
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # ── Aggregated endpoint (new frontend entry point) ──────────────────
    path("unified/", UnifiedAPIView.as_view(), name="unified"),
]
