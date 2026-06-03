import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'

export default function ReplayMode() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReplay = async () => {
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      })
      if (!res.ok) throw new Error('Replay failed')
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-xl">
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2 w-full focus:outline-none"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▶
        </motion.span>
        Debug / Replay Mode
      </motion.button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="card-solid p-4 text-sm mt-2">
              <p className="text-slate-400 mb-3">
                Run a simulated full pipeline test using pre-recorded text to test latency without audio.
              </p>
              
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={handleReplay}
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-ghost bg-slate-800 text-slate-200 border border-slate-700"
                >
                  {loading ? 'Running...' : 'Run Pipeline Test'}
                </motion.button>
                
                {error && <span className="text-red-400">{error}</span>}
                {success && <span className="text-emerald-400 flex items-center gap-1"><motion.span initial={{scale:0}} animate={{scale:1}}>✓</motion.span> Metrics recorded</span>}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-800">
                <Link to="/analytics" className="text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
                  View Results in Analytics <span>→</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
