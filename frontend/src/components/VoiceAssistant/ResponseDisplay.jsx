import { motion, AnimatePresence } from 'framer-motion'

export default function ResponseDisplay({ response, isLoading, asrMs, llmMs, ttsMs, totalMs, ttsDegraded }) {
  if (!response && !isLoading) return null

  const badge = (label, value, bg, text) =>
    value != null ? (
      <motion.span
        key={label}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}
      >
        {label}: {value}ms
      </motion.span>
    ) : null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.05 }}
        className="card p-5 w-full max-w-xl"
        style={{ boxShadow: '0 8px 32px rgba(61,87,252,0.08), inset 0 1px 0 rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-brand-400"
          />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">VoiceAI</span>
          {isLoading && (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full block ml-1"
            />
          )}
        </div>

        {response ? (
          <>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-slate-100 text-lg leading-relaxed"
            >
              {response}
            </motion.p>

            {(asrMs || llmMs || ttsMs) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap gap-2 mt-4 pt-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                {badge('ASR', asrMs, 'bg-blue-500/10', 'text-blue-400')}
                {badge('LLM', llmMs, 'bg-purple-500/10', 'text-purple-400')}
                {badge('TTS', ttsMs, 'bg-orange-500/10', 'text-orange-400')}
                {totalMs && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      totalMs < 1500
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    Total: {(totalMs / 1000).toFixed(2)}s
                  </motion.span>
                )}
              </motion.div>
            )}

            {ttsDegraded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 flex items-center gap-2 text-xs text-amber-400"
              >
                <span>⚠️</span>
                <span>Audio synthesis unavailable — showing text only.</span>
              </motion.div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
