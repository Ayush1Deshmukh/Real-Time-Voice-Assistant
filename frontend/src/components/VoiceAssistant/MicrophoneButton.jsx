import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MIME_TYPE = 'audio/webm;codecs=opus'
const RINGS = [1, 2, 3, 4] // 4 concentric rings

/**
 * MicrophoneButton — premium voice recording button with real-time audio visualizer.
 *
 * Audio Visualization:
 *   Uses Web Audio API (AnalyserNode) to sample mic volume in real-time via
 *   requestAnimationFrame. Maps average frequency amplitude (0–255) to concentric
 *   ring scale/opacity, creating a live "halo" that breathes with the user's voice.
 *
 * States:
 *   idle       → pulsing blue mic with gentle idle glow rings
 *   recording  → red stop button + concentric rings pulsing to voice volume
 *   processing → spinner overlay
 */
export default function MicrophoneButton({ onAudioReady, disabled = false, processing = false, isConnected = true }) {
  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const audioCtxRef      = useRef(null)
  const analyserRef      = useRef(null)
  const rafRef           = useRef(null)

  const [recording,  setRecording]  = useState(false)
  const [permError,  setPermError]  = useState('')
  const [volume,     setVolume]     = useState(0) // 0–1 live volume

  // Tear down audio context and RAF on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  // ── Animation loop: sample analyser every frame ─────────────────────────
  const startAnalyser = useCallback((stream) => {
    const ctx      = new AudioContext()
    const source   = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize        = 256
    analyser.smoothingTimeConstant = 0.75
    source.connect(analyser)

    audioCtxRef.current  = ctx
    analyserRef.current  = analyser
    const data = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      setVolume(avg / 128) // 0–~2, clamped later
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const stopAnalyser = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null
    setVolume(0)
  }, [])

  // ── Recording control ────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setPermError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Request specific mime type for cross-browser consistency
      let options = { mimeType: MIME_TYPE };
      if (!MediaRecorder.isTypeSupported(MIME_TYPE)) {
        // Fallback for Safari/iOS
        options = { mimeType: 'audio/mp4' };
        if (!MediaRecorder.isTypeSupported('audio/mp4')) {
           options = {}; // Browser default
        }
      }
      
      const recorder = new MediaRecorder(stream, options)
      chunksRef.current = []

      // Collect data properly
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
        }
      }
      recorder.onstop = () => {
        // Build the single clean blob for the backend
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || MIME_TYPE })
        onAudioReady(blob)
        stream.getTracks().forEach((t) => t.stop())
        stopAnalyser()
      }

      mediaRecorderRef.current = recorder
      // Use standard timeslice to ensure data chunks are pushed regularly
      recorder.start(250)
      startAnalyser(stream)
      setRecording(true)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermError('Microphone access denied. Please allow mic permissions in your browser.')
      } else {
        setPermError(`Could not start recording: ${err.message}`)
      }
    }
  }, [onAudioReady, startAnalyser, stopAnalyser])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [recording])

  const handleClick = () => {
    if (disabled || processing || !isConnected) return
    if (recording) stopRecording()
    else startRecording()
  }

  // Map 0–1+ volume to ring scales (clamped 0–1 for animation)
  const vol = Math.min(volume, 1.4)
  const isDisabled = disabled || !isConnected

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      {/* ── Button + Rings container ─────────────────────────────────── */}
      <div className="relative flex items-center justify-center w-40 h-40">

        {/* Concentric rings */}
        {RINGS.map((ring) => {
          const baseSize = 96 + ring * 20 // 116, 136, 156, 176px
          const idleScale = 1
          const activeScale = recording
            ? 1 + (vol * 0.18 * ring)  // outer rings expand more
            : idleScale

          return (
            <motion.div
              key={ring}
              className={recording ? '' : 'ring-idle'}
              animate={recording
                ? { scale: activeScale, opacity: Math.max(0.08, 0.4 - ring * 0.08 + vol * 0.15) }
                : { scale: [1, 1 + ring * 0.03, 1], opacity: [0.25, 0.4, 0.25] }
              }
              transition={recording
                ? { duration: 0.05, ease: 'linear' }
                : { duration: 2.4, ease: 'easeInOut', repeat: Infinity, delay: ring * 0.3 }
              }
              style={{
                position: 'absolute',
                width:  baseSize,
                height: baseSize,
                borderRadius: '50%',
                border: `1.5px solid ${recording ? 'rgba(232, 121, 249, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`,
                background: recording
                  ? `rgba(232, 121, 249, ${0.03 - ring * 0.005})`
                  : `rgba(99, 102, 241, ${0.04 - ring * 0.008})`,
                boxShadow: recording
                  ? `0 0 ${10 + vol * 30}px rgba(168, 85, 247, ${0.2 + vol * 0.4})`
                  : `0 0 15px rgba(99, 102, 241, 0.2)`,
              }}
            />
          )
        })}

        {/* Main button */}
        <motion.button
          id="mic-button"
          onClick={handleClick}
          disabled={isDisabled}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
          whileHover={!isDisabled && !processing ? { scale: 1.05 } : {}}
          whileTap={!isDisabled && !processing ? { scale: 0.95 } : {}}
          animate={recording ? { scale: 1 } : { scale: [1, 1.02, 1] }}
          transition={recording ? { duration: 0.1 } : { duration: 3, ease: 'easeInOut', repeat: Infinity }}
          className={recording ? 'ring-active' : ''}
          style={{
            position: 'relative',
            zIndex: 10,
            width: 88,
            height: 88,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            background: processing
              ? 'rgba(15, 23, 42, 0.9)'
              : recording
              ? 'linear-gradient(135deg, #a855f7, #e879f9)'
              : 'linear-gradient(135deg, #4f46e5, #6366f1)',
            boxShadow: processing || isDisabled
              ? 'none'
              : recording
              ? `0 0 ${20 + vol * 40}px rgba(168, 85, 247, ${0.6 + vol * 0.4}), inset 0 0 10px rgba(255,255,255,0.2)`
              : '0 0 30px rgba(99, 102, 241, 0.4), inset 0 0 10px rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.2)',
            outline: 'none',
            opacity: isDisabled ? 0.4 : 1,
            backdropFilter: 'blur(8px)'
          }}
        >
          <AnimatePresence mode="wait">
            {processing ? (
              <motion.span
                key="spinner"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin block"
              />
            ) : recording ? (
              <motion.span
                key="stop"
                initial={{ opacity: 0, scale: 0.3, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.3, rotate: 45 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-7 h-7 bg-white rounded-md block"
              />
            ) : (
              <motion.svg
                key="mic"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-10 h-10 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2z" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Status label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={!isConnected ? 'conn' : processing ? 'proc' : recording ? 'rec' : 'idle'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-medium text-center tracking-wide"
          style={{ color: !isConnected ? '#fbbf24' : processing ? '#94a3b8' : recording ? '#e879f9' : '#a5b4fc' }}
        >
          {!isConnected ? '🔌 Connecting to backend…'
            : processing ? '⚡ Processing your voice…'
            : recording ? '● Listening — click to stop'
            : 'Tap to speak'}
        </motion.p>
      </AnimatePresence>

      {/* Permission error */}
      <AnimatePresence>
        {permError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="max-w-xs text-center rounded-xl px-4 py-2 text-xs text-red-400"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {permError}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
