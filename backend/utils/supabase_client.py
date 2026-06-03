"""
Supabase Client Utility
What: Initializes the Supabase client using service-role credentials and provides helper functions for DB operations.
Why: Centralizing the Supabase connection avoids repeated initialization across the codebase and ensures consistent error handling.
How: Uses the `supabase` Python SDK with the SERVICE_KEY (bypasses RLS for server-side writes).
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase client initialized from environment variables."""
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment.")
        _supabase_client = create_client(url, key)
    return _supabase_client


async def save_session_metrics(
    user_id: str,
    asr_ms: int,
    llm_ms: int,
    tts_ms: int,
    total_ms: int,
    transcript: str = "",
    response: str = "",
    is_replay: bool = False,
) -> dict:
    """
    Insert a session metrics row into the `session_metrics` Supabase table.

    Args:
        user_id: UUID of the authenticated user.
        asr_ms: ASR stage latency in milliseconds.
        llm_ms: LLM stage latency in milliseconds.
        tts_ms: TTS stage latency in milliseconds.
        total_ms: End-to-end pipeline latency in milliseconds.
        transcript: The recognized speech text.
        response: The AI-generated text response.
        is_replay: True if this run was triggered by the Replay Mode feature.

    Returns:
        The inserted row data from Supabase.
    """
    client = get_supabase()
    payload = {
        "user_id": user_id,
        "asr_latency_ms": asr_ms,
        "llm_latency_ms": llm_ms,
        "tts_latency_ms": tts_ms,
        "total_latency_ms": total_ms,
        "transcript": transcript,
        "response": response,
        "is_replay": is_replay,
    }
    try:
        result = client.table("session_metrics").insert(payload).execute()
        return result.data
    except Exception as e:
        print(f"⚠️ Failed to save session metrics to Supabase: {e}")
        return None
