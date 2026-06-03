"""
ASR Service — Whisper-based Speech-to-Text
What: Transcribes raw audio bytes into text using OpenAI Whisper (local, no API cost).
Why: Running Whisper locally avoids per-request API costs and gives full control over model selection and latency.
How: Saves incoming bytes to a temp .wav file, passes it through the preloaded Whisper model, returns transcript + measured latency.
Errors: Raises ASRTimeoutError after 10 seconds; raises ASRError for any other failure.
"""

import os
import tempfile
import time
import asyncio
from groq import AsyncGroq

# --- Custom Exceptions ---

class ASRTimeoutError(Exception):
    """Raised when Groq transcription exceeds the allowed timeout."""

class ASRError(Exception):
    """Raised for any non-timeout ASR failure."""


# Initialize Groq client
# This assumes GROQ_API_KEY is available in the environment
_groq_client = None

def _get_groq_client() -> AsyncGroq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ASRError("GROQ_API_KEY is not set in the environment.")
        _groq_client = AsyncGroq(api_key=api_key)
    return _groq_client


# --- Public async API ---

async def transcribe_audio(audio_bytes: bytes) -> dict:
    """
    Transcribe audio bytes asynchronously using Groq's Whisper API with a 10-second hard timeout.

    Returns:
        {"text": "...", "latency_ms": 340}

    Raises:
        ASRTimeoutError: if transcription takes longer than 10 seconds.
        ASRError: for any other failure.
    """
    client = _get_groq_client()
    t0 = time.perf_counter()

    # Groq SDK requires a file-like object with a name attribute ending in a valid extension
    # So we write the bytes to a temp file, open it, and pass it to the API.
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Wrap the API call in wait_for to enforce the timeout
        async def _call_groq():
            with open(tmp_path, "rb") as audio_file:
                return await client.audio.transcriptions.create(
                    file=("audio.webm", audio_file.read()),
                    model="distil-whisper-large-v3-en",
                    response_format="text",
                )
        
        result_text = await asyncio.wait_for(_call_groq(), timeout=10.0)
        
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return {
            "text": result_text.strip(),
            "latency_ms": latency_ms,
        }
    except asyncio.TimeoutError:
        raise ASRTimeoutError("Speech recognition timed out after 10 seconds.")
    except Exception as exc:
        raise ASRError(f"ASR pipeline failed: {exc}") from exc
    finally:
        os.unlink(tmp_path)

