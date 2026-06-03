"""
ASR Service — Whisper-based Speech-to-Text
What: Transcribes raw audio bytes into text using OpenAI Whisper (local, no API cost).
Why: Running Whisper locally avoids per-request API costs and gives full control over model selection and latency.
How: Saves incoming bytes to a temp .wav file, passes it through the preloaded Whisper model, returns transcript + measured latency.
Errors: Raises ASRTimeoutError after 10 seconds; raises ASRError for any other failure.
"""

import asyncio
import os
import tempfile
import time

import whisper

# --- Custom Exceptions ---

class ASRTimeoutError(Exception):
    """Raised when Whisper transcription exceeds the allowed timeout."""

class ASRError(Exception):
    """Raised for any non-timeout ASR failure."""


# --- Module-level model singleton (loaded once at startup) ---
_whisper_model = None


def load_whisper_model(model_name: str = "base") -> None:
    """
    Preload the Whisper model into memory.
    Called during FastAPI lifespan startup so the first request doesn't pay the load penalty.
    """
    global _whisper_model
    _whisper_model = whisper.load_model(model_name)
    print(f"✅ Whisper '{model_name}' model loaded.")


def _get_model():
    if _whisper_model is None:
        raise ASRError("Whisper model not loaded. Call load_whisper_model() at startup.")
    return _whisper_model


# --- Core transcription (blocking, runs in thread pool) ---

def _transcribe_sync(audio_bytes: bytes) -> dict:
    """
    Synchronous transcription helper — intended to run in asyncio executor.
    Writes audio_bytes to a temp WAV file, runs Whisper, cleans up, returns result dict.
    """
    model = _get_model()
    t0 = time.perf_counter()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = model.transcribe(tmp_path, fp16=False)
        latency_ms = int((time.perf_counter() - t0) * 1000)
        return {
            "text": result["text"].strip(),
            "latency_ms": latency_ms,
        }
    finally:
        os.unlink(tmp_path)


# --- Public async API ---

async def transcribe_audio(audio_bytes: bytes) -> dict:
    """
    Transcribe audio bytes asynchronously with a 10-second hard timeout.

    Returns:
        {"text": "...", "latency_ms": 340}

    Raises:
        ASRTimeoutError: if transcription takes longer than 10 seconds.
        ASRError: for any other failure.
    """
    loop = asyncio.get_running_loop()
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_transcribe_sync, audio_bytes),
            timeout=10.0,
        )
        return result
    except asyncio.TimeoutError:
        raise ASRTimeoutError("Speech recognition timed out after 10 seconds.")
    except Exception as exc:
        raise ASRError(f"ASR pipeline failed: {exc}") from exc
