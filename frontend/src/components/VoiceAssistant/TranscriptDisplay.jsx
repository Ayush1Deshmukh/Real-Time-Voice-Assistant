import { motion, AnimatePresence } from 'framer-motion'

export default function TranscriptDisplay({ transcript, isLoading }) {
  if (!transcript && !isLoading) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="card p-5 w-full max-w-xl"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">You said</span>
          {isLoading && (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full block ml-1"
            />
          )}
        </div>

        {transcript ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-slate-100 text-lg leading-relaxed font-medium"
          >
            "{transcript}"
          </motion.p>
        ) : (
          <div className="space-y-2">
            <div className="skeleton h-4 w-4/5 rounded" />
            <div className="skeleton h-4 w-3/5 rounded" />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
