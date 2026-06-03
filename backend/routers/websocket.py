"""
WebSocket Router — Real-time voice pipeline endpoint
What: Handles binary audio data over WebSocket, orchestrates ASR → LLM → TTS, and streams progressive status updates back to the client.
Why: WebSockets allow true streaming — the client gets ASR results immediately, before LLM and TTS complete, making the UX feel faster.
How: Each pipeline stage sends a JSON status frame; failures trigger tiered graceful degradation rather than silent errors.
"""

import asyncio
import base64
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.asr_service import transcribe_audio, ASRTimeoutError, ASRError
from services.llm_service import get_llm_response, LLMTimeoutError, LLMError
from services.tts_service import synthesize_speech, TTSTimeoutError, TTSDegradedError
from utils.supabase_client import save_session_metrics

router = APIRouter()


async def _send_json(ws: WebSocket, payload: dict) -> None:
    """Helper to serialize and send a JSON frame over the WebSocket."""
    await ws.send_text(json.dumps(payload))


@router.websocket("/ws/{user_id}")
async def voice_pipeline(websocket: WebSocket, user_id: str):
    """
    Main real-time voice pipeline endpoint.

    Protocol:
      Client → Server: binary audio bytes (WAV format)
      Server → Client: JSON status frames for each pipeline stage

    Status frame shapes:
      {"stage": "asr_done",   "data": {"text": "..."}, "latency_ms": 340}
      {"stage": "llm_done",   "data": {"response": "..."}, "latency_ms": 620}
      {"stage": "complete",   "audio_b64": "...", "total_ms": 1240}
      {"stage": "error",      "component": "...", "message": "...", ...}
      {"stage": "tts_degraded", "text_only": true, "response": "..."}
    """
    await websocket.accept()

    try:
        while True:
            # --- Receive binary audio ---
            audio_bytes = await websocket.receive_bytes()
            pipeline_start = time.perf_counter()

            # ======================================================
            # STAGE 1: Automatic Speech Recognition
            # ======================================================
            try:
                asr_result = await transcribe_audio(audio_bytes)
                transcript = asr_result["text"]
                asr_ms = asr_result["latency_ms"]

                await _send_json(websocket, {
                    "stage": "asr_done",
                    "data": {"text": transcript},
                    "latency_ms": asr_ms,
                })

            except (ASRTimeoutError, ASRError) as exc:
                # ASR failure → ask user to type instead
                await _send_json(websocket, {
                    "stage": "error",
                    "component": "asr",
                    "message": "Could not understand audio. Please try speaking again.",
                    "can_type": True,
                })
                continue

            # ======================================================
            # STAGE 2: LLM Inference
            # ======================================================
            try:
                llm_result = await get_llm_response(transcript)
                llm_response = llm_result["response"]
                llm_ms = llm_result["latency_ms"]

                await _send_json(websocket, {
                    "stage": "llm_done",
                    "data": {"response": llm_response},
                    "latency_ms": llm_ms,
                })

            except (LLMTimeoutError, LLMError) as exc:
                # LLM failure → send fallback text, skip TTS
                fallback = "I'm sorry, I couldn't process that right now."
                await _send_json(websocket, {
                    "stage": "error",
                    "component": "llm",
                    "message": "AI is temporarily unavailable.",
                    "fallback_text": fallback,
                })
                continue

            # ======================================================
            # STAGE 3: Text-to-Speech Synthesis
            # ======================================================
            tts_ms = 0
            audio_b64 = None
            tts_degraded = False

            try:
                tts_result = await synthesize_speech(llm_response)
                audio_b64 = tts_result["audio_b64"]
                tts_ms = tts_result["latency_ms"]

            except (TTSTimeoutError, TTSDegradedError) as exc:
                # TTS failure → degrade to text-only, never hang silently
                tts_degraded = True
                await _send_json(websocket, {
                    "stage": "tts_degraded",
                    "text_only": True,
                    "response": llm_response,
                })

            # ======================================================
            # PIPELINE COMPLETE
            # ======================================================
            total_ms = int((time.perf_counter() - pipeline_start) * 1000)

            if not tts_degraded:
                await _send_json(websocket, {
                    "stage": "complete",
                    "audio_b64": audio_b64,
                    "transcript": transcript,
                    "response": llm_response,
                    "total_ms": total_ms,
                    "asr_ms": asr_ms,
                    "llm_ms": llm_ms,
                    "tts_ms": tts_ms,
                })

            # Save metrics to Supabase (fire-and-forget, non-blocking)
            asyncio.create_task(
                save_session_metrics(
                    user_id=user_id,
                    asr_ms=asr_ms,
                    llm_ms=llm_ms,
                    tts_ms=tts_ms if not tts_degraded else 0,
                    total_ms=total_ms,
                    transcript=transcript,
                    response=llm_response,
                    is_replay=False,
                )
            )

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user {user_id}")
    except Exception as exc:
        print(f"Unhandled WebSocket error for user {user_id}: {exc}")
        try:
            await _send_json(websocket, {
                "stage": "error",
                "component": "pipeline",
                "message": "An unexpected error occurred. Please reload and try again.",
                "fallback_text": "Something went wrong. Please try again.",
            })
        except Exception:
            pass
