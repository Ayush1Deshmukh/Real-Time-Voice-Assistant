"""
LLM Service — Groq-powered language model inference
What: Sends a user transcript to Groq's llama-3.3-70b-versatile model and returns a concise voice-assistant reply.
Why: Groq's LPU architecture delivers sub-second inference on large models, which is essential for a sub-2s voice pipeline.
How: Uses the official `groq` SDK with a system prompt tuned for brevity, wrapped in an 8-second asyncio timeout.
Errors: Raises LLMTimeoutError on timeout; returns a graceful fallback string on other failures.
"""

import asyncio
import os
import time

from groq import AsyncGroq

# --- Custom Exceptions ---

class LLMTimeoutError(Exception):
    """Raised when the Groq API call exceeds the allowed timeout."""

class LLMError(Exception):
    """Raised for any non-timeout LLM failure."""


FALLBACK_RESPONSE = "I'm having trouble thinking right now. Please try again."

SYSTEM_PROMPT = (
    "You are a helpful, concise voice assistant. "
    "Keep responses under 3 sentences. "
    "Respond naturally and conversationally, as if speaking aloud."
)

MODEL_NAME = "llama-3.3-70b-versatile"


async def _call_groq(transcript: str) -> dict:
    """Internal async call to Groq — no timeout logic here (handled by caller)."""
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    t0 = time.perf_counter()
    chat_completion = await client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript},
        ],
        model=MODEL_NAME,
        temperature=0.7,
        max_tokens=256,
    )
    latency_ms = int((time.perf_counter() - t0) * 1000)
    response_text = chat_completion.choices[0].message.content.strip()
    return {"response": response_text, "latency_ms": latency_ms}


async def get_llm_response(transcript: str) -> dict:
    """
    Get a language model response for the given transcript.

    Returns:
        {"response": "...", "latency_ms": 620}

    Raises:
        LLMTimeoutError: if the API call exceeds 8 seconds.
        LLMError: for any other failure.
    """
    try:
        result = await asyncio.wait_for(_call_groq(transcript), timeout=8.0)
        return result
    except asyncio.TimeoutError:
        raise LLMTimeoutError("LLM inference timed out after 8 seconds.")
    except LLMTimeoutError:
        raise
    except Exception as exc:
        raise LLMError(f"LLM call failed: {exc}") from exc
