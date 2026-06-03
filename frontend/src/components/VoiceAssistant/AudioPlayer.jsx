import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/** Animated waveform bars — dance when playing, freeze when paused */
function WaveformBars({ isPlaying, barCount = 28 }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: barCount }).map((_, i) => {
        // Create a natural-looking wave pattern
        const baseHeight = 4 + Math.sin(i * 0.7) * 6 + Math.sin(i * 1.3) * 4
        const clampedBase = Math.max(4, Math.min(24, baseHeight))

        return (
          <motion.div
            key={i}
            className="rounded-full flex-shrink-0"
            style={{ width: 3, backgroundColor: 'rgba(99,128,255,0.85)' }}
            animate={isPlaying
              ? {
                  height: [
                    clampedBase,
                    clampedBase + 6 + Math.random() * 10,
                    clampedBase + 2,
                    clampedBase + 10 + Math.random() * 8,
                    clampedBase,
                  ],
                  opacity: [0.7, 1, 0.8, 1, 0.7],
                }
              : { height: clampedBase, opacity: 0.35 }
            }
            transition={isPlaying
              ? {
                  duration: 0.6 + (i % 5) * 0.08,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: (i % 7) * 0.04,
                }
              : { duration: 0.3 }
            }
          />
        )
      })}
    </div>
  )
}

function formatTime(secs) {
  if (!isFinite(secs) || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * AudioPlayer — custom premium player replacing the ugly browser <audio> controls.
 *
 * Features:
 *  - Auto-plays when audioUrl arrives
 *  - Animated waveform bars dance in real-time while playing
 *  - Custom play/pause button with spring animation
 *  - Scrubable progress bar with hover preview
 *  - Elapsed / total duration display
 *  - Entrance animation when AI response arrives
 */
export default function AudioPlayer({ audioUrl }) {
  const audioRef       = useRef(null)
  const progressRef    = useRef(null)
  const [playing,   setPlaying]   = useState(false)
  const [progress,  setProgress]  = useState(0)   // 0–1
  const [current,   setCurrent]   = useState(0)
  const [duration,  setDuration]  = useState(0)
  const [hoverPos,  setHoverPos]  = useState(null) // 0–1 hover position
  const [loaded,    setLoaded]    = useState(false)

  // Reset state when a new audioUrl arrives
  useEffect(() => {
    if (!audioUrl) return
    setPlaying(false)
    setProgress(0)
    setCurrent(0)
    setDuration(0)
    setLoaded(false)
    const audio = audioRef.current
    if (!audio) return
    audio.load()
    const onLoaded = () => {
      setDuration(audio.duration)
      setLoaded(true)
      audio.play().catch(() => {})
    }
    audio.addEventListener('loadedmetadata', onLoaded)
    return () => audio.removeEventListener('loadedmetadata', onLoaded)
  }, [audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setProgress(1) }
    const onTime  = () => {
      if (!audio.duration) return
      setCurrent(audio.currentTime)
      setProgress(audio.currentTime / audio.duration)
    }
    audio.addEventListener('play',       onPlay)
    audio.addEventListener('pause',      onPause)
    audio.addEventListener('ended',      onEnded)
    audio.addEventListener('timeupdate', onTime)
    return () => {
      audio.removeEventListener('play',       onPlay)
      audio.removeEventListener('pause',      onPause)
      audio.removeEventListener('ended',      onEnded)
      audio.removeEventListener('timeupdate', onTime)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [])

  const seek = useCallback((e) => {
    const audio = audioRef.current
    if (!audio || !progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * audio.duration
    setProgress(ratio)
  }, [])

  const onHover = useCallback((e) => {
    if (!progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    setHoverPos(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }, [])

  if (!audioUrl) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="w-full max-w-xl"
      >
        {/* Hidden real audio element */}
        <audio ref={audioRef} src={audioUrl} preload="auto" style={{ display: 'none' }} />

        <div
          className="card p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(22,27,39,0.9) 0%, rgba(30,35,54,0.9) 100%)',
            boxShadow: playing
              ? '0 0 32px rgba(61,87,252,0.2), 0 8px 32px rgba(0,0,0,0.3)'
              : '0 8px 32px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.07)',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          {/* AI label */}
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              animate={playing
                ? { scale: [1,1.4,1], opacity: [0.8,1,0.8] }
                : { scale: 1, opacity: 0.5 }
              }
              transition={{ duration: 0.8, repeat: playing ? Infinity : 0, ease: 'easeInOut' }}
              className="w-2 h-2 rounded-full bg-brand-400"
            />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              AI Response
            </span>
            {playing && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-brand-400 font-medium ml-auto"
              >
                Playing…
              </motion.span>
            )}
          </div>

          {/* Main controls row */}
          <div className="flex items-center gap-4">
            {/* Play / Pause button */}
            <motion.button
              onClick={togglePlay}
              disabled={!loaded}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center focus:outline-none"
              style={{
                background: 'linear-gradient(135deg, #2c3ef1, #6180ff)',
                boxShadow: playing
                  ? '0 0 20px rgba(61,87,252,0.6), 0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.3)',
                opacity: loaded ? 1 : 0.4,
              }}
            >
              <AnimatePresence mode="wait">
                {!loaded ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    transition={{ rotate: { duration: 0.8, repeat: Infinity, ease: 'linear' } }}
                    className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full block"
                  />
                ) : playing ? (
                  <motion.svg
                    key="pause"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="play"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="w-4 h-4 text-white ml-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Waveform + progress column */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {/* Waveform bars */}
              <div className="overflow-hidden">
                <WaveformBars isPlaying={playing} barCount={30} />
              </div>

              {/* Progress bar */}
              <div
                ref={progressRef}
                onClick={seek}
                onMouseMove={onHover}
                onMouseLeave={() => setHoverPos(null)}
                className="relative h-1.5 rounded-full cursor-pointer group"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                {/* Filled portion */}
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background: 'linear-gradient(90deg, #3d57fc, #6180ff)',
                  }}
                />
                {/* Hover preview */}
                {hoverPos !== null && (
                  <div
                    className="absolute top-0 h-full rounded-full opacity-30"
                    style={{
                      width: `${hoverPos * 100}%`,
                      background: 'rgba(99,128,255,0.6)',
                    }}
                  />
                )}
                {/* Thumb */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${progress * 100}% - 6px)` }}
                />
              </div>
            </div>

            {/* Time */}
            <div className="flex-shrink-0 text-right">
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {formatTime(current)}
              </span>
              <span className="text-xs font-mono text-slate-600 tabular-nums">
                /{formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
