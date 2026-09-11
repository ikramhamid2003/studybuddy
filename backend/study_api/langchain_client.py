from django.conf import settings
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel


def _get_llm(streaming: bool = False, max_tokens: int = 800):
    if not settings.GROQ_API_KEY:
        raise ValueError(
            "GROQ_API_KEY is not set. Add it to your .env file.\n"
            "Get a FREE key at: https://console.groq.com"
        )
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model=settings.GROQ_MODEL,
        temperature=0.4,
        max_tokens=max_tokens,
        streaming=streaming,
    )


def query_groq(system: str, user: str, max_tokens: int = 800) -> str:
    """Drop-in replacement: plain text response."""
    llm = _get_llm(max_tokens=max_tokens)
    result = llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])
    return result.content.strip()


def query_groq_json(system: str, user: str, max_tokens: int = 800) -> dict:
    """Drop-in replacement: parsed JSON response, using LangChain's JsonOutputParser
    instead of your hand-rolled regex extract_json()."""
    llm = _get_llm(max_tokens=max_tokens)
    parser = JsonOutputParser()
    chain = llm | parser
    return chain.invoke([SystemMessage(content=system), HumanMessage(content=user)])


def stream_groq(system: str, user: str, max_tokens: int = 800):
    """Drop-in replacement: yields text chunks for your SSE endpoint."""
    llm = _get_llm(streaming=True, max_tokens=max_tokens)
    for chunk in llm.stream([SystemMessage(content=system), HumanMessage(content=user)]):
        if chunk.content:
            yield chunk.content


# ── Structured output (Quiz / Flashcards) ───────────────────────────────────


def query_groq_structured(
    system: str, user: str, schema: type[BaseModel], max_tokens: int = 800
):
    """Query Groq and parse the response directly into the given Pydantic schema.
    Returns a validated instance of `schema`, not a raw dict. Uses Groq's native
    tool-calling under the hood, so it's more reliable than JsonOutputParser for
    responses with a fixed shape (e.g. quiz questions, flashcards)."""
    llm = _get_llm(max_tokens=max_tokens)
    structured_llm = llm.with_structured_output(schema)
    return structured_llm.invoke(
        [SystemMessage(content=system), HumanMessage(content=user)]
    )


# ── Chat with proper message history objects ────────────────────────────────


def build_message_history(system: str, history: list[dict], message: str):
    """Convert your ChatSerializer's history format ([{"role": "user"/"assistant",
    "content": ...}, ...]) into LangChain message objects."""
    messages = [SystemMessage(content=system)]
    for turn in history:
        if turn["role"] == "user":
            messages.append(HumanMessage(content=turn["content"]))
        else:
            messages.append(AIMessage(content=turn["content"]))
    messages.append(HumanMessage(content=message))
    return messages


def chat_groq(system: str, history: list[dict], message: str, max_tokens: int = 600) -> str:
    """Multi-turn chat using real message objects instead of a flattened
    transcript string — no more regex-stripping 'Study Buddy:' prefixes."""
    llm = _get_llm(max_tokens=max_tokens)
    messages = build_message_history(system, history, message)
    result = llm.invoke(messages)
    return result.content.strip()


def stream_chat_groq(
    system: str, history: list[dict], message: str, max_tokens: int = 600
):
    """Streaming version of chat_groq, for the SSE chat endpoint."""
    llm = _get_llm(streaming=True, max_tokens=max_tokens)
    messages = build_message_history(system, history, message)
    for chunk in llm.stream(messages):
        if chunk.content:
            yield chunk.content
