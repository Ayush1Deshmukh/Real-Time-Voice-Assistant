import { motion } from 'framer-motion'
import LatencyDashboard from '../components/Dashboard/LatencyDashboard'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25,0.46,0.45,0.94] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.25 } },
}

export default function AnalyticsPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-5xl mx-auto px-4 py-8 space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 24 }}
      >
        <h1 className="text-3xl font-bold text-gradient mb-1">Latency Analytics</h1>
        <p className="text-slate-500 text-sm">
          Real-time breakdown of ASR → LLM → TTS pipeline performance · Refreshes every 3s
        </p>
      </motion.div>
      <LatencyDashboard />
    </motion.div>
  )
}
