"""
Real-Time Voice Assistant — FastAPI Backend Entry Point
What: Initializes the FastAPI application, configures CORS, loads the Whisper model at startup, and registers all API routers.
Why: Centralizing app configuration ensures all cross-cutting concerns (CORS, startup lifecycle, router registration) are managed in one place.
How: Uses FastAPI lifespan context manager for model preloading, reads allowed origins from env, and mounts routers for auth and WebSocket.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from services.asr_service import load_whisper_model
from routers import websocket as ws_router
from routers import auth as auth_router

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load heavyweight models before serving requests; clean up after shutdown."""
    print("⏳ Loading Whisper model at startup...")
    load_whisper_model()
    print("✅ Whisper model loaded. Server ready.")
    yield
    print("🛑 Server shutting down.")


app = FastAPI(
    title="Real-Time Voice Assistant API",
    description="WebSocket-driven voice pipeline: Whisper ASR → Groq LLM → gTTS synthesis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(ws_router.router, tags=["websocket"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "voice-assistant-backend"}
