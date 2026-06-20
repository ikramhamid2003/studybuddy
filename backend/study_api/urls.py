from django.urls import path
from .views import ExplainView, SummarizeView, QuizView, FlashcardsView, ChatView, ChatStreamView

urlpatterns = [
    path("explain/", ExplainView.as_view(), name="explain"),
    path("summarize/", SummarizeView.as_view(), name="summarize"),
    path("quiz/", QuizView.as_view(), name="quiz"),
    path("flashcards/", FlashcardsView.as_view(), name="flashcards"),
    path("chat/", ChatView.as_view(), name="chat"),
    path("chat/stream/", ChatStreamView.as_view(), name="chat_stream"),
]

