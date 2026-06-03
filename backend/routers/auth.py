"""
Auth Router — Replay pipeline endpoint
What: Provides a REST endpoint for replaying a prior audio session through the full ASR → LLM → TTS pipeline.
Why: Replay mode lets users demo the pipeline without a live microphone and enables latency comparison between runs.
How: Accepts Base64-encoded audio, decodes it, runs the same pipeline as the WebSocket handler, tags the saved metrics as is_replay=True.
"""

import asyncio
import base64
import time

from fastapi import APIRouter, HTTPException

from models.schemas import ReplayRequest
from services.asr_service import transcribe_audio, ASRTimeoutError, ASRError
from services.llm_service import get_llm_response, LLMTimeoutError, LLMError
from services.tts_service import synthesize_speech, TTSTimeoutError, TTSDegradedError
from utils.supabase_client import save_session_metrics

router = APIRouter()


@router.post("/api/replay")
async def replay_pipeline(request: ReplayRequest):
    """
    Replay a prior audio recording through the full voice pipeline.

    Accepts Base64-encoded audio, runs ASR → LLM → TTS, saves metrics tagged
    with is_replay=True so the dashboard can distinguish replays from live sessions.

    Returns a full JSON breakdown with per-stage latencies for side-by-side comparison.
    """
    pipeline_start = time.perf_counter()

    # Decode Base64 audio
    try:
        audio_bytes = base64.b64decode(request.audio_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Base64 audio data.")

    # --- ASR ---
    try:
        asr_result = await transcribe_audio(audio_bytes)
        transcript = asr_result["text"]
        asr_ms = asr_result["latency_ms"]
    except (ASRTimeoutError, ASRError) as exc:
        raise HTTPException(status_code=500, detail=f"ASR failed: {exc}")

    # --- LLM ---
    try:
        llm_result = await get_llm_response(transcript)
        llm_response = llm_result["response"]
        llm_ms = llm_result["latency_ms"]
    except (LLMTimeoutError, LLMError) as exc:
        raise HTTPException(status_code=500, detail=f"LLM failed: {exc}")

    # --- TTS ---
    audio_b64 = None
    tts_ms = 0
    tts_degraded = False
    try:
        tts_result = await synthesize_speech(llm_response)
        audio_b64 = tts_result["audio_b64"]
        tts_ms = tts_result["latency_ms"]
    except (TTSTimeoutError, TTSDegradedError):
        tts_degraded = True

    total_ms = int((time.perf_counter() - pipeline_start) * 1000)

    # Save tagged metrics
    await save_session_metrics(
        user_id=request.user_id,
        asr_ms=asr_ms,
        llm_ms=llm_ms,
        tts_ms=tts_ms,
        total_ms=total_ms,
        transcript=transcript,
        response=llm_response,
        is_replay=True,
    )

    return {
        "transcript": transcript,
        "response": llm_response,
        "audio_b64": audio_b64,
        "tts_degraded": tts_degraded,
        "latencies": {
            "asr_ms": asr_ms,
            "llm_ms": llm_ms,
            "tts_ms": tts_ms,
            "total_ms": total_ms,
        },
        "is_replay": True,
    }
