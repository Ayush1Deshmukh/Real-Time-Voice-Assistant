"""
Pydantic schemas for request/response validation across the voice assistant API.
"""

from pydantic import BaseModel
from typing import Optional


class ASRResult(BaseModel):
    text: str
    latency_ms: int


class LLMResult(BaseModel):
    response: str
    latency_ms: int


class TTSResult(BaseModel):
    audio_b64: str
    latency_ms: int


class PipelineStatus(BaseModel):
    stage: str
    data: Optional[dict] = None
    latency_ms: Optional[int] = None
    audio_b64: Optional[str] = None
    total_ms: Optional[int] = None
    message: Optional[str] = None
    fallback_text: Optional[str] = None
    component: Optional[str] = None
    can_type: Optional[bool] = None
    text_only: Optional[bool] = None
    response: Optional[str] = None


class ReplayRequest(BaseModel):
    audio_b64: str
    user_id: str
    is_replay: bool = True


class SessionMetrics(BaseModel):
    user_id: str
    asr_latency_ms: int
    llm_latency_ms: int
    tts_latency_ms: int
    total_latency_ms: int
    transcript: Optional[str] = None
    response: Optional[str] = None
    is_replay: bool = False
