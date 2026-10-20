import logging
from contextvars import ContextVar
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_groq import ChatGroq
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Token counts are reported out-of-band rather than added to each return value,
# because every caller already depends on these functions returning a
# str/dict/model. A ContextVar keeps the value local to the request, and each
# call clears it first so a worker thread can never attribute the previous
# request's tokens to the current Generation row.
_LAST_USAGE: ContextVar[dict[str, int] | None] = ContextVar(
    "studybuddy_last_usage", default=None
)


def take_last_usage() -> dict[str, int]:
    """Return the token counts from this context's most recent LLM call, then clear them."""

    usage = _LAST_USAGE.get()
    _LAST_USAGE.set(None)
    return usage or {"input_tokens": 0, "output_tokens": 0}


def reset_last_usage() -> None:
    """Forget any token counts left in this context without reading them."""

    _LAST_USAGE.set(None)


def estimate_cost_usd(input_tokens: int, output_tokens: int) -> Decimal:
    """Price a call with the per-million rates from settings.

    Both rates default to 0, so an unconfigured deployment records an honest
    zero instead of a made-up number.
    """

    rate_in = Decimal(str(settings.GROQ_PRICE_PER_M_INPUT))
    rate_out = Decimal(str(settings.GROQ_PRICE_PER_M_OUTPUT))
    raw = (input_tokens * rate_in + output_tokens * rate_out) / Decimal(1_000_000)
    # Round rather than truncate: the column only keeps 4 decimals, and a
    # sub-cent call should not always report as free.
    return raw.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def _extract_usage(message) -> dict[str, int] | None:
    """Read token counts off a LangChain message across both provider shapes."""

    meta = getattr(message, "usage_metadata", None) or {}
    if not meta:
        # Older/alternative providers only report the OpenAI-style token_usage.
        meta = (getattr(message, "response_metadata", None) or {}).get("token_usage") or {}
    if not meta:
        return None

    input_tokens = meta.get("input_tokens", meta.get("prompt_tokens", 0)) or 0
    output_tokens = meta.get("output_tokens", meta.get("completion_tokens", 0)) or 0
    return {"input_tokens": int(input_tokens), "output_tokens": int(output_tokens)}


def _record_usage(message) -> None:
    usage = _extract_usage(message)
    if usage:
        _LAST_USAGE.set(usage)


def _get_llm(streaming: bool = False, max_tokens: int = 800):
    """Create a Groq chat model with the mode/token budget requested by caller."""
    if not settings.GROQ_API_KEY:
        # Fail early with a setup hint before LangChain attempts a network call.
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
    _LAST_USAGE.set(None)
    # System + user messages keep instructions separate from student content.
    result = llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])
    _record_usage(result)
    return str(result.content).strip()


def query_groq_json(system: str, user: str, max_tokens: int = 800) -> dict:
    """Drop-in replacement: parsed JSON response, using LangChain's JsonOutputParser
    instead of your hand-rolled regex extract_json()."""
    llm = _get_llm(max_tokens=max_tokens)
    _LAST_USAGE.set(None)
    # The parser discards the message object, so invoke the model directly to
    # keep access to its usage metadata before handing the text to the parser.
    result = llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])
    _record_usage(result)
    return JsonOutputParser().invoke(result)


def stream_groq(system: str, user: str, max_tokens: int = 800):
    """Drop-in replacement: yields text chunks for your SSE endpoint."""
    llm = _get_llm(streaming=True, max_tokens=max_tokens)
    _LAST_USAGE.set(None)
    for chunk in llm.stream([SystemMessage(content=system), HumanMessage(content=user)]):
        # Usage, when the provider sends it, rides on the final chunk.
        _record_usage(chunk)
        # Streaming may include metadata-only chunks; skip those for SSE output.
        if chunk.content:
            yield str(chunk.content)


# ── Structured output (Quiz / Flashcards) ───────────────────────────────────


def query_groq_structured(
    system: str, user: str, schema: type[BaseModel], max_tokens: int = 800
) -> BaseModel:
    """Query Groq and parse the response directly into the given Pydantic schema.

    Prefers native LangChain ``with_structured_output`` (tool-/JSON-mode) when
    the configured Groq model supports it. Falls back to JSON prompting +
    ``JsonOutputParser`` so models without tool calling keep working.
    """
    llm = _get_llm(max_tokens=max_tokens)
    messages = [SystemMessage(content=system), HumanMessage(content=user)]
    _LAST_USAGE.set(None)

    try:
        # include_raw keeps the AIMessage so we can still record token usage.
        structured = llm.with_structured_output(schema, include_raw=True)
        payload = structured.invoke(messages)
        if isinstance(payload, dict):
            raw = payload.get("raw")
            parsed = payload.get("parsed")
            if raw is not None:
                _record_usage(raw)
            if parsed is not None and isinstance(parsed, schema):
                return parsed
            if parsed is not None:
                return schema.model_validate(parsed)
            if payload.get("parsing_error"):
                raise ValueError(str(payload["parsing_error"]))
        elif isinstance(payload, schema):
            return payload
    except Exception:
        # Fall through to JSON prompting for models/providers that reject
        # tool calling or return an unusable structured payload.
        logger.debug("Structured output unavailable, using JSON prompting", exc_info=True)

    result = llm.invoke(messages)
    _record_usage(result)
    data = JsonOutputParser().invoke(result)
    return schema.model_validate(data)


# ── Chat with proper message history objects ────────────────────────────────


def build_message_history(system: str, history: list[dict], message: str) -> list[BaseMessage]:
    """Convert your ChatSerializer's history format ([{"role": "user"/"assistant"/
    "system", "content": ...}, ...]) into LangChain message objects."""
    messages: list[BaseMessage] = [SystemMessage(content=system)]
    for turn in history:
        # Preserve roles so the model sees a real conversation, not a flattened
        # transcript string.
        if turn["role"] == "user":
            messages.append(HumanMessage(content=turn["content"]))
        elif turn["role"] == "system":
            # Groq accepts a system message only in first position, so inbound
            # system turns fold into the single leading SystemMessage.
            messages[0] = SystemMessage(
                content=f"{messages[0].content}\n\n{turn['content']}"
            )
        else:
            messages.append(AIMessage(content=turn["content"]))
    messages.append(HumanMessage(content=message))
    return messages


def chat_groq(system: str, history: list[dict], message: str, max_tokens: int = 600) -> str:
    """Multi-turn chat using real message objects instead of a flattened
    transcript string — no more regex-stripping 'Study Buddy:' prefixes."""
    llm = _get_llm(max_tokens=max_tokens)
    messages = build_message_history(system, history, message)
    _LAST_USAGE.set(None)
    result = llm.invoke(messages)
    _record_usage(result)
    return str(result.content).strip()


def stream_chat_groq(
    system: str, history: list[dict], message: str, max_tokens: int = 600
):
    """Streaming version of chat_groq, for the SSE chat endpoint."""
    llm = _get_llm(streaming=True, max_tokens=max_tokens)
    messages = build_message_history(system, history, message)
    _LAST_USAGE.set(None)
    for chunk in llm.stream(messages):
        _record_usage(chunk)
        # LangChain may emit empty structural chunks; only forward visible text.
        if chunk.content:
            yield chunk.content
