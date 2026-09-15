from pydantic import BaseModel, Field


class QuizQuestion(BaseModel):
    id: int = Field(description="1-based question number")
    question: str = Field(description="The question text")
    options: list[str] = Field(
        description='Exactly 4 options, each prefixed like "A) ..."',
        min_length=4,
        max_length=4,
    )
    answer: str = Field(description='The correct option, e.g. "A) option text"')
    explanation: str = Field(description="Why this answer is correct")


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]


class Flashcard(BaseModel):
    id: int = Field(description="1-based card number")
    front: str = Field(description="Term or question side")
    back: str = Field(description="Definition or answer side")
    hint: str = Field(description="Short memory hint")


class FlashcardsResponse(BaseModel):
    flashcards: list[Flashcard]
