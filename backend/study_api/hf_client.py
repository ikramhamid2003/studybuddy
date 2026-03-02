"""
Groq API client — FREE, fast, reliable.
Sign up at https://console.groq.com → API Keys → Create Key (free)

Free models available:
  - llama-3.3-70b-versatile   (best quality)
  - llama-3.1-8b-instant      (fastest)
  - mixtral-8x7b-32768        (good for long text)
  - gemma2-9b-it              (lightweight)
"""

import re
import json
import requests
from django.conf import settings

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"


def call_groq(system: str, user: str, max_tokens: int = 800) -> str:
    """Call Groq API and return text response."""
    if not settings.GROQ_API_KEY:
        raise ValueError(
            "GROQ_API_KEY is not set. Add it to your .env file.\n"
            "Get a FREE key at: https://console.groq.com"
        )

    response = requests.post(
        GROQ_ENDPOINT,
        headers={
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.4,
            "top_p": 0.9,
            "stream": False,
        },
        timeout=30,
    )

    response.raise_for_status()
    data = response.json()

    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as e:
        raise ValueError(f"Unexpected Groq response: {data}") from e


def extract_json(text: str) -> dict:
    """Robustly extract JSON from model output."""
    # 1. Direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # 2. Extract from ```json ... ``` block
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Find first JSON object in text
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON found. Raw output:\n{text[:400]}")


def query_hf(system: str, user: str, max_tokens: int = 800) -> str:
    """Kept same name so views.py needs no changes."""
    return call_groq(system, user, max_tokens)


def query_hf_json(system: str, user: str, max_tokens: int = 800) -> dict:
    """Kept same name so views.py needs no changes."""
    raw = call_groq(system, user, max_tokens)
    return extract_json(raw)