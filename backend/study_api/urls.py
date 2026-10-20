from django.http import JsonResponse
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import UsernameTokenObtainPairSerializer
from .views import (
    ChatSessionDetailView,
    ChatSessionListCreateView,
    ChatStreamView,
    ChatSuggestionsView,
    GenerateView,
    GenerationDetailView,
    GenerationListView,
    MeView,
    RagDocumentDetailView,
    RagDocumentsView,
    RagQueryView,
    RagUploadView,
    RegisterView,
    UsageStatsView,
)


def health(_request):
    """Small unauthenticated probe for deploy/platform health checks."""

    return JsonResponse({"status": "ok"})


urlpatterns = [
    # ── Legacy routes (preserved for test compatibility) ────────────────
    path("health/", health, name="health"),
    path("generate/", GenerateView.as_view(), name="generate"),
    path("generations/", GenerationListView.as_view(), name="generations"),
    path("generations/<int:pk>/", GenerationDetailView.as_view(), name="generation_detail"),
    path("chat/stream/", ChatStreamView.as_view(), name="chat_stream"),
    path("sessions/", ChatSessionListCreateView.as_view(), name="chat_sessions"),
    path("sessions/<int:pk>/", ChatSessionDetailView.as_view(), name="chat_session_detail"),
    path("sessions/<int:pk>/suggestions/", ChatSuggestionsView.as_view(), name="chat_suggestions"),
    path("usage/", UsageStatsView.as_view(), name="usage_stats"),
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path(
        "auth/login/",
        TokenObtainPairView.as_view(serializer_class=UsernameTokenObtainPairSerializer),
        name="token_obtain_pair",
    ),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="auth_me"),
    # ── RAG dedicated upload endpoint (multipart) ────────────────────────
    path("rag/upload/", RagUploadView.as_view(), name="rag_upload"),
    path("rag/documents/", RagDocumentsView.as_view(), name="rag_documents"),
    path("rag/documents/<int:pk>/", RagDocumentDetailView.as_view(), name="rag_document_detail"),
    path("rag/query/", RagQueryView.as_view(), name="rag_query"),
]
