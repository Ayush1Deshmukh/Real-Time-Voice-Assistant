import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
export default function LatencyDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchMetrics = async () => {
      try {
        const q = query(
          collection(db, 'session_metrics'),
          where('user_id', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const metrics = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            created_at: data.timestamp ? data.timestamp.toMillis() : Date.now()
          };
        });
        setData(metrics.reverse()) // oldest to newest for chart
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
      setLoading(false)
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 3000) // live polling
    return () => clearInterval(interval)
  }, [user])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 h-24 skeleton" />
        ))}
        <div className="md:col-span-4 card h-80 skeleton" />
      </div>
    )
  }

  if (!data.length) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="text-center p-12 text-slate-500 card border-dashed border-slate-700 bg-transparent mt-6"
      >
        <p>No metrics recorded yet.</p>
        <p className="text-sm mt-2">Speak into the mic or use Replay Mode to generate data.</p>
      </motion.div>
    )
  }

  const latest = data[data.length - 1]
  const avg = (key) => Math.round(data.reduce((acc, curr) => acc + (curr[key] || 0), 0) / data.length)
  
  const stats = [
    { label: 'Total', val: avg('total_latency_ms'), target: 1500 },
    { label: 'ASR', val: avg('asr_latency_ms'), target: 500 },
    { label: 'LLM', val: avg('llm_latency_ms'), target: 800 },
    { label: 'TTS', val: avg('tts_latency_ms'), target: 400 },
  ]

  return (
    <motion.div 
      initial="initial" animate="animate"
      variants={{
        initial: {},
        animate: { transition: { staggerChildren: 0.1 } }
      }}
      className="space-y-6"
    >
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const healthy = stat.val <= stat.target
          return (
            <motion.div 
              key={stat.label}
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
              }}
              whileHover={{ scale: 1.05 }}
              className="card p-4 flex flex-col justify-center relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl -mr-8 -mt-8 transition-opacity duration-300 opacity-20 group-hover:opacity-40 ${healthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1 z-10">Avg {stat.label}</span>
              <div className="flex items-end gap-2 z-10">
                <span className={`text-2xl font-bold ${healthy ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {stat.val}ms
                </span>
              </div>
              <span className="text-xs text-slate-500 mt-1 z-10">Target &lt;{stat.target}ms</span>
            </motion.div>
          )
        })}
      </div>

      {/* Latest Breakdown Bar */}
      <motion.div 
        variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        className="card p-5"
      >
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center justify-between">
          <span>Latest Request Breakdown</span>
          <span className="text-xs font-mono text-slate-500">{latest.total_latency_ms}ms total</span>
        </h3>
        <div className="w-full h-4 flex rounded-full overflow-hidden bg-slate-800">
          <motion.div initial={{width:0}} animate={{ width: `${(latest.asr_latency_ms / latest.total_latency_ms) * 100}%` }} transition={{duration: 0.8, ease: "easeOut"}} className="bg-blue-500" title={`ASR: ${latest.asr_latency_ms}ms`} />
          <motion.div initial={{width:0}} animate={{ width: `${(latest.llm_latency_ms / latest.total_latency_ms) * 100}%` }} transition={{duration: 0.8, ease: "easeOut", delay: 0.2}} className="bg-purple-500" title={`LLM: ${latest.llm_latency_ms}ms`} />
          <motion.div initial={{width:0}} animate={{ width: `${(latest.tts_latency_ms / latest.total_latency_ms) * 100}%` }} transition={{duration: 0.8, ease: "easeOut", delay: 0.4}} className="bg-orange-500" title={`TTS: ${latest.tts_latency_ms}ms`} />
        </div>
        <div className="flex justify-between text-xs font-medium mt-2">
          <span className="text-blue-400">ASR</span>
          <span className="text-purple-400">LLM</span>
          <span className="text-orange-400">TTS</span>
        </div>
      </motion.div>

      {/* Stacked Area Chart */}
      <motion.div 
        variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        className="card p-5 h-80"
      >
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Historical Latency (Last 20)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="created_at" tickFormatter={(t) => new Date(t).toLocaleTimeString()} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(22,27,39,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(16px)' }}
              itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}
              labelFormatter={(t) => new Date(t).toLocaleString()}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="asr_latency_ms" stackId="a" fill="#3b82f6" name="ASR (Whisper)" radius={[0,0,4,4]} />
            <Bar dataKey="llm_latency_ms" stackId="a" fill="#8b5cf6" name="LLM (Groq)" />
            <Bar dataKey="tts_latency_ms" stackId="a" fill="#f97316" name="TTS (gTTS)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  )
}
