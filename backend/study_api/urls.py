from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import ExplainView, SummarizeView, QuizView, FlashcardsView, ChatView, ChatStreamView, RegisterView

urlpatterns = [
    path("explain/", ExplainView.as_view(), name="explain"),
    path("summarize/", SummarizeView.as_view(), name="summarize"),
    path("quiz/", QuizView.as_view(), name="quiz"),
    path("flashcards/", FlashcardsView.as_view(), name="flashcards"),
    path("chat/", ChatView.as_view(), name="chat"),
    path("chat/stream/", ChatStreamView.as_view(), name="chat_stream"),
    path("auth/register/", RegisterView.as_view(), name="auth_register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

