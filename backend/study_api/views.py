import re
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import (
    ExplainSerializer,
    SummarizeSerializer,
    QuizSerializer,
    FlashcardsSerializer,
    ChatSerializer,
)
from .hf_client import query_hf, query_hf_json


# ── Prompts ────────────────────────────────────────────────────────────────────

EXPLAIN_SYSTEM = (
    "You are an expert tutor. Your task is to explain a concept clearly. "
    "Always respond with ONLY a valid JSON object — no markdown fences, no extra text. "
    'Use exactly this format: '
    '{"explanation":"clear explanation text","key_points":["point 1","point 2","point 3"],'
    '"analogy":"a simple real-world analogy","example":"a concrete example"}'
)

SUMMARIZE_SYSTEM = (
    "You are an expert at condensing academic study material. "
    "Always respond with ONLY a valid JSON object — no markdown fences, no extra text. "
    'Use exactly this format: '
    '{"summary":"concise summary paragraph","key_concepts":["concept 1","concept 2","concept 3"],'
    '"important_terms":[{"term":"term name","definition":"brief definition"}],'
    '"study_tips":["tip 1","tip 2"]}'
)

QUIZ_SYSTEM = (
    "You are a quiz generator for students. "
    "Always respond with ONLY a valid JSON object — no markdown, no extra text. "
    'Use exactly this format: '
    '{"questions":[{"id":1,"question":"question text",'
    '"options":["A) option","B) option","C) option","D) option"],'
    '"answer":"A) option","explanation":"why this is correct"}]}'
)

FLASHCARDS_SYSTEM = (
    "You are a study flashcard creator. "
    "Always respond with ONLY a valid JSON object — no markdown, no extra text. "
    'Use exactly this format: '
    '{"flashcards":[{"id":1,"front":"term or question","back":"definition or answer","hint":"short memory hint"}]}'
)

CHAT_SYSTEM = (
    "You are a friendly, knowledgeable study buddy AI assistant. "
    "Help students understand concepts, answer questions, and guide their learning. "
    "Be encouraging, clear, and concise. Use examples when helpful. "
    "Format responses in plain text — no JSON needed."
)


# ── Views ──────────────────────────────────────────────────────────────────────

class ExplainView(APIView):
    """POST /api/explain/ — Explain a concept at a given level."""

    def post(self, request):
        serializer = ExplainSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        topic = serializer.validated_data["topic"]
        level = serializer.validated_data["level"]

        user_msg = (
            f'Explain the concept of "{topic}" at a {level} level. '
            "Be engaging, clear, and use simple language where possible."
        )

        try:
            data = query_hf_json(EXPLAIN_SYSTEM, user_msg, max_tokens=700)
            return Response(data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": f"Failed to parse AI response: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            return Response(
                {"error": f"AI request failed: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class SummarizeView(APIView):
    """POST /api/summarize/ — Summarize study notes."""

    def post(self, request):
        serializer = SummarizeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        notes = serializer.validated_data["notes"]
        fmt = serializer.validated_data["format"]

        user_msg = (
            f"Summarize the following study notes in {fmt} format. "
            "Extract the key concepts, define important terms, and provide study tips.\n\n"
            f"NOTES:\n{notes}"
        )

        try:
            data = query_hf_json(SUMMARIZE_SYSTEM, user_msg, max_tokens=800)
            return Response(data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": f"Failed to parse AI response: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            return Response(
                {"error": f"AI request failed: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class QuizView(APIView):
    """POST /api/quiz/ — Generate multiple-choice quiz questions."""

    def post(self, request):
        serializer = QuizSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        topic = serializer.validated_data["topic"]
        num_questions = serializer.validated_data["num_questions"]
        difficulty = serializer.validated_data["difficulty"]

        user_msg = (
            f'Generate exactly {num_questions} multiple-choice quiz questions about "{topic}" '
            f"at {difficulty} difficulty level. Each question must have 4 options (A, B, C, D), "
            "one correct answer, and a brief explanation."
        )

        try:
            data = query_hf_json(QUIZ_SYSTEM, user_msg, max_tokens=1000)
            # Ensure questions list exists
            if "questions" not in data:
                raise ValueError("Response missing 'questions' key")
            return Response(data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": f"Failed to parse quiz: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            return Response(
                {"error": f"AI request failed: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class FlashcardsView(APIView):
    """POST /api/flashcards/ — Generate study flashcards."""

    def post(self, request):
        serializer = FlashcardsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        topic = serializer.validated_data["topic"]
        num_cards = serializer.validated_data["num_cards"]

        user_msg = (
            f'Create exactly {num_cards} study flashcards for the topic: "{topic}". '
            "Mix definitions, concepts, and application-type questions. "
            "Each card should have a short hint to help with memorization."
        )

        try:
            data = query_hf_json(FLASHCARDS_SYSTEM, user_msg, max_tokens=900)
            if "flashcards" not in data:
                raise ValueError("Response missing 'flashcards' key")
            return Response(data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": f"Failed to parse flashcards: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            return Response(
                {"error": f"AI request failed: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class ChatView(APIView):
    """POST /api/chat/ — Multi-turn study assistant chat."""

    def post(self, request):
        serializer = ChatSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        message = serializer.validated_data["message"]
        history = serializer.validated_data.get("history", [])[-6:]  # Last 6 turns

        # Build conversation string
        conversation = ""
        for turn in history:
            tag = "Student" if turn["role"] == "user" else "Study Buddy"
            conversation += f"{tag}: {turn['content']}\n"
        conversation += f"Student: {message}\nStudy Buddy:"

        try:
            raw = query_hf(CHAT_SYSTEM, conversation, max_tokens=600)
            # Strip any "Study Buddy:" prefix the model might echo
            reply = re.sub(r"^Study Buddy:\s*", "", raw).strip()
            # Truncate at next "Student:" if model hallucinates continuation
            if "Student:" in reply:
                reply = reply.split("Student:")[0].strip()
            return Response({"reply": reply}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"AI request failed: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
