import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const inputVariants = {
  initial: { opacity: 0, x: -10 },
  animate: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 280, damping: 24 },
  }),
}

export default function LoginForm() {
  const { signIn }           = useAuth()
  const navigate             = useNavigate()
  const [email, setEmail]    = useState('')
  const [password, setPass]  = useState('')
  const [error, setError]    = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(err.message)
    else navigate('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <motion.div custom={0} variants={inputVariants} initial="initial" animate="animate">
        <label htmlFor="login-email" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-widest">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="input-field"
        />
      </motion.div>

      <motion.div custom={1} variants={inputVariants} initial="initial" animate="animate">
        <label htmlFor="login-password" className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-widest">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPass(e.target.value)}
          placeholder="••••••••"
          required
          className="input-field"
        />
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 text-sm text-red-400"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </motion.div>
      )}

      <motion.div custom={2} variants={inputVariants} initial="initial" animate="animate">
        <motion.button
          id="login-submit-btn"
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(61,87,252,0.4)' }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full block"
              />
              Signing in…
            </>
          ) : 'Sign In'}
        </motion.button>
      </motion.div>

      <motion.p
        custom={3} variants={inputVariants} initial="initial" animate="animate"
        className="text-center text-sm text-slate-500"
      >
        Don't have an account?{' '}
        <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Sign up
        </Link>
      </motion.p>
    </form>
  )
}
