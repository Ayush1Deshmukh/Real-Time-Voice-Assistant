import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_URL } from '../config'
import { useWebSocketContext } from '../context/WebSocketContext'

const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 1000 // exponential: 1s, 2s, 4s

/**
 * useWebSocket — manages the voice pipeline WebSocket connection lifecycle.
 *
 * Features:
 *  - Connects to /ws/{userId} on mount, disconnects on unmount.
 *  - Parses every JSON status frame and maps it to the correct state field.
 *  - Auto-reconnects with exponential backoff (max 3 retries) on unexpected disconnect.
 *  - Broadcasts connection status through WebSocketContext for the Navbar pill.
 *
 * Returns:
 *  { sendAudio, status, transcript, response, audioUrl, isConnected,
 *    asrMs, llmMs, ttsMs, totalMs, canType, error, ttsDegraded }
 */
export function useWebSocket(userId) {
  const wsRef          = useRef(null)
  const retriesRef     = useRef(0)
  const retryTimerRef  = useRef(null)
  const isMountedRef   = useRef(true)

  const { setConnectionStatus } = useWebSocketContext()

  const [isConnected,  setIsConnected]  = useState(false)
  const [status,       setStatus]       = useState('idle')       // 'idle' | 'asr' | 'llm' | 'tts' | 'complete' | 'error'
  const [transcript,   setTranscript]   = useState('')
  const [response,     setResponse]     = useState('')
  const [audioUrl,     setAudioUrl]     = useState(null)
  const [asrMs,        setAsrMs]        = useState(null)
  const [llmMs,        setLlmMs]        = useState(null)
  const [ttsMs,        setTtsMs]        = useState(null)
  const [totalMs,      setTotalMs]      = useState(null)
  const [canType,      setCanType]      = useState(false)
  const [error,        setError]        = useState(null)
  const [ttsDegraded,  setTtsDegraded]  = useState(false)

  const connect = useCallback(() => {
    if (!userId || !isMountedRef.current) return

    const url = `${WS_URL}/ws/${userId}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!isMountedRef.current) return
      retriesRef.current = 0
      setIsConnected(true)
      setConnectionStatus('connected')
      setStatus('idle')
      setError(null)
    }

    ws.onmessage = (evt) => {
      if (!isMountedRef.current) return
      try {
        const msg = JSON.parse(evt.data)
        handleMessage(msg)
      } catch {
        console.warn('Non-JSON WS message:', evt.data)
      }
    }

    ws.onclose = () => {
      if (!isMountedRef.current) return
      setIsConnected(false)

      if (retriesRef.current < MAX_RETRIES) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, retriesRef.current)
        retriesRef.current += 1
        setConnectionStatus('reconnecting')
        setError(`Connection lost. Retrying in ${delay / 1000}s… (attempt ${retriesRef.current}/${MAX_RETRIES})`)
        retryTimerRef.current = setTimeout(connect, delay)
      } else {
        setConnectionStatus('disconnected')
        setError('Connection lost. Please reload the page.')
      }
    }

    ws.onerror = (evt) => {
      console.error('WebSocket error:', evt)
    }
  }, [userId, setConnectionStatus])

  const handleMessage = useCallback((msg) => {
    switch (msg.stage) {
      case 'asr_done':
        setStatus('asr')
        setTranscript(msg.data?.text || '')
        setAsrMs(msg.latency_ms)
        setCanType(false)
        setError(null)
        break

      case 'llm_done':
        setStatus('llm')
        setResponse(msg.data?.response || '')
        setLlmMs(msg.latency_ms)
        break

      case 'complete':
        setStatus('complete')
        setTtsMs(msg.tts_ms)
        setTotalMs(msg.total_ms)
        setTtsDegraded(false)
        if (msg.audio_b64) {
          const blob = b64ToBlob(msg.audio_b64, 'audio/mpeg')
          const url  = URL.createObjectURL(blob)
          setAudioUrl(url)
        }
        break

      case 'tts_degraded':
        setStatus('complete')
        setTtsDegraded(true)
        setResponse(msg.response || '')
        setAudioUrl(null)
        break

      case 'error':
        setStatus('error')
        setError(msg.message || 'An error occurred.')
        if (msg.can_type) setCanType(true)
        if (msg.fallback_text) setResponse(msg.fallback_text)
        break

      default:
        break
    }
  }, [])

  const sendAudio = useCallback((audioBlob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected. Please wait and try again.')
      return
    }
    setStatus('processing')
    setTranscript('')
    setResponse('')
    setAudioUrl(null)
    setAsrMs(null)
    setLlmMs(null)
    setTtsMs(null)
    setTotalMs(null)
    setError(null)
    setTtsDegraded(false)
    setCanType(false)
    wsRef.current.send(audioBlob)
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    connect()
    return () => {
      isMountedRef.current = false
      clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return {
    sendAudio,
    status,
    transcript,
    response,
    audioUrl,
    isConnected,
    asrMs,
    llmMs,
    ttsMs,
    totalMs,
    canType,
    error,
    ttsDegraded,
  }
}

// --- Helpers ---

function b64ToBlob(b64, mimeType) {
  const byteChars = atob(b64)
  const byteNums  = Array.from(byteChars, (c) => c.charCodeAt(0))
  const byteArray = new Uint8Array(byteNums)
  return new Blob([byteArray], { type: mimeType })
}
