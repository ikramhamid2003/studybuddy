from rest_framework import serializers


class ExplainSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=300, required=True)
    level = serializers.ChoiceField(
        choices=["beginner", "intermediate", "advanced"],
        default="beginner"
    )


class SummarizeSerializer(serializers.Serializer):
    notes = serializers.CharField(min_length=20, max_length=8000, required=True)
    format = serializers.ChoiceField(
        choices=["bullets", "paragraph", "outline"],
        default="bullets"
    )


class QuizSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=300, required=True)
    num_questions = serializers.IntegerField(min_value=1, max_value=8, default=5)
    difficulty = serializers.ChoiceField(
        choices=["easy", "medium", "hard"],
        default="medium"
    )


class FlashcardsSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=300, required=True)
    num_cards = serializers.IntegerField(min_value=3, max_value=15, default=8)


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=2000)


class ChatSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, required=True)
    history = ChatMessageSerializer(many=True, required=False, default=list)
