"""
TTS Service — gTTS-based text-to-speech synthesis
What: Converts text to an MP3 audio clip using Google Text-to-Speech (gTTS) and returns Base64-encoded bytes.
Why: gTTS is free, requires no API key, and produces natural-sounding speech for a portfolio-grade demo.
How: Saves synthesized audio to a temp file, reads it back as bytes, encodes to Base64, and returns with latency.
     The blocking gTTS call runs in an asyncio thread pool to avoid blocking the event loop.
Errors: Raises TTSTimeoutError after 5 seconds; raises TTSDegradedError for other failures (caller may choose text-only fallback).
"""

import asyncio
import base64
import os
import tempfile
import time

from gtts import gTTS

# --- Custom Exceptions ---

class TTSTimeoutError(Exception):
    """Raised when gTTS synthesis exceeds the allowed timeout."""

class TTSDegradedError(Exception):
    """Raised for any non-timeout TTS failure — triggers text-only degraded mode."""


def _synthesize_sync(text: str) -> dict:
    """
    Blocking synthesis helper — runs in asyncio executor.
    Creates a gTTS object, saves MP3, reads back, returns Base64 + latency.
    """
    t0 = time.perf_counter()
    tts = gTTS(text=text, lang="en", slow=False)

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        tts.save(tmp_path)
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return {"audio_b64": audio_b64, "latency_ms": latency_ms}
    finally:
        os.unlink(tmp_path)


async def synthesize_speech(text: str) -> dict:
    """
    Synthesize speech from text asynchronously with a 5-second hard timeout.

    Returns:
        {"audio_b64": "...", "latency_ms": 280}

    Raises:
        TTSTimeoutError: if synthesis takes longer than 5 seconds.
        TTSDegradedError: for any other synthesis failure.
    """
    loop = asyncio.get_running_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _synthesize_sync, text),
            timeout=5.0,
        )
        return result
    except asyncio.TimeoutError:
        raise TTSTimeoutError("TTS synthesis timed out after 5 seconds.")
    except TTSTimeoutError:
        raise
    except Exception as exc:
        raise TTSDegradedError(f"TTS synthesis failed: {exc}") from exc
