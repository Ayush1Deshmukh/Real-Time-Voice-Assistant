import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import MicrophoneButton from '../components/VoiceAssistant/MicrophoneButton'
import TranscriptDisplay from '../components/VoiceAssistant/TranscriptDisplay'
import ResponseDisplay from '../components/VoiceAssistant/ResponseDisplay'
import AudioPlayer from '../components/VoiceAssistant/AudioPlayer'
import ReplayMode from '../components/VoiceAssistant/ReplayMode'
import ErrorBoundary from '../components/ErrorBoundary'

/** Stagger container for child elements */
const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
}

const itemVariants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
}

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit:    { opacity: 0, transition: { duration: 0.25 } },
}

// ─── How It Works pipeline diagram with live stage highlighting ────────────────
function HowItWorks({ activeStage }) {
  const [open, setOpen] = useState(false)

  const stages = [
    {
      key: 'asr',
      icon: '🎙️',
      label: 'Whisper ASR',
      sub: 'Local ML model',
      target: '< 500ms',
      activeOn: ['asr', 'processing'],
      activeColor: 'rgba(59,130,246,0.5)',
      borderColor: '#3b82f6',
    },
    {
      key: 'llm',
      icon: '🧠',
      label: 'Groq LLM',
      sub: 'Llama 3.3 70B',
      target: '< 800ms',
      activeOn: ['llm'],
      activeColor: 'rgba(139,92,246,0.5)',
      borderColor: '#8b5cf6',
    },
    {
      key: 'tts',
      icon: '🔊',
      label: 'gTTS',
      sub: 'Google TTS',
      target: '< 400ms',
      activeOn: ['complete'],
      activeColor: 'rgba(249,115,22,0.5)',
      borderColor: '#f97316',
    },
  ]

  return (
    <motion.div variants={itemVariants} className="card overflow-hidden w-full max-w-xl">
      <motion.button
        id="how-it-works-toggle"
        onClick={() => setOpen(o => !o)}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
        className="w-full px-6 py-4 flex items-center justify-between transition-colors"
      >
        <span className="font-semibold text-slate-200 text-sm">⚙️ How It Works</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-slate-500 text-xs"
        >
          ▼
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25,0.46,0.45,0.94] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              <p className="text-xs text-slate-500 mb-5">
                Your voice travels through 3 stages — each independently timed.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {stages.map((s, i) => {
                  const isActive = s.activeOn.includes(activeStage)
                  return (
                    <div key={s.key} className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <motion.div
                        animate={isActive
                          ? { borderColor: s.borderColor, boxShadow: `0 0 16px ${s.activeColor}` }
                          : { borderColor: 'rgba(255,255,255,0.06)', boxShadow: 'none' }
                        }
                        transition={{ duration: 0.3 }}
                        className="flex-1 sm:w-40 rounded-xl p-4 text-center"
                        style={{
                          border: '1px solid rgba(255,255,255,0.06)',
                          background: isActive ? `${s.activeColor.replace('0.5','0.08')}` : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div className="text-2xl mb-1">{s.icon}</div>
                        <p className="font-semibold text-slate-200 text-sm">{s.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
                        <p className="text-xs text-emerald-400 font-mono mt-2">Target {s.target}</p>
                      </motion.div>
                      {i < stages.length - 1 && (
                        <motion.div
                          animate={isActive ? { opacity: 1, scale: 1.2 } : { opacity: 0.3, scale: 1 }}
                          className="hidden sm:flex items-center gap-1"
                        >
                          <div className="w-6 h-px bg-slate-600" />
                          <span className="text-slate-500 text-xs">▶</span>
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [textInput, setTextInput] = useState('')
  const {
    sendAudio, status, transcript, response, audioUrl, isConnected,
    asrMs, llmMs, ttsMs, totalMs, canType, error, ttsDegraded,
  } = useWebSocket(user?.id)

  const isProcessing  = status === 'processing' || status === 'asr' || status === 'llm'
  const showTranscript = transcript || isProcessing
  const showResponse   = response || (isProcessing && transcript)

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center gap-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center">
          <h1 className="text-3xl font-bold text-gradient mb-1">Voice Assistant</h1>
          <p className="text-slate-500 text-sm">Sub-1.5s AI pipeline · Whisper + Groq + gTTS</p>
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              className="w-full max-w-xl rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <span>⚠️</span> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mic button */}
        <motion.div variants={itemVariants}>
          <ErrorBoundary>
            <MicrophoneButton 
              onAudioReady={sendAudio} 
              processing={isProcessing} 
              isConnected={isConnected} 
            />
          </ErrorBoundary>
        </motion.div>

        {/* Text fallback */}
        <AnimatePresence>
          {canType && (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-xl flex gap-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                id="text-fallback-input"
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your message instead…"
                className="input-field flex-1"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="btn-primary px-4"
              >
                Send
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Transcript */}
        <AnimatePresence>
          {showTranscript && (
            <motion.div key="transcript" className="w-full max-w-xl">
              <TranscriptDisplay transcript={transcript} isLoading={status === 'asr' && !transcript} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response */}
        <AnimatePresence>
          {showResponse && (
            <motion.div key="response" className="w-full max-w-xl">
              <ResponseDisplay
                response={response}
                isLoading={status === 'llm' && !response}
                asrMs={asrMs}
                llmMs={llmMs}
                ttsMs={ttsMs}
                totalMs={totalMs}
                ttsDegraded={ttsDegraded}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio player */}
        <AnimatePresence>
          {audioUrl && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-xl"
            >
              <AudioPlayer audioUrl={audioUrl} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replay mode */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <ReplayMode />
        </motion.div>

        {/* How It Works — with live pipeline highlighting */}
        <HowItWorks activeStage={status} />
      </motion.div>
    </motion.div>
  )
}
