import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const inputVariants = {
  initial: { opacity: 0, x: -10 },
  animate: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 280, damping: 24 },
  }),
}

export default function SignupForm() {
  const { signUp }            = useAuth()
  const navigate              = useNavigate()
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error: err } = await signUp(email, password)
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess(true)
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="text-center space-y-4 py-4"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6 }}
          className="text-5xl"
        >📧</motion.div>
        <h3 className="text-lg font-semibold text-slate-100">Check your email</h3>
        <p className="text-sm text-slate-400">
          Confirmation sent to <strong className="text-slate-200">{email}</strong>.{' '}
          After confirming,{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">sign in</Link>.
        </p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {[
        { id: 'signup-email', label: 'Email', type: 'email', value: email, onChange: setEmail, placeholder: 'you@example.com' },
        { id: 'signup-password', label: 'Password', type: 'password', value: password, onChange: setPass, placeholder: 'Min. 6 characters' },
        { id: 'signup-confirm', label: 'Confirm Password', type: 'password', value: confirm, onChange: setConfirm, placeholder: '••••••••' },
      ].map((field, i) => (
        <motion.div key={field.id} custom={i} variants={inputVariants} initial="initial" animate="animate">
          <label htmlFor={field.id} className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-widest">
            {field.label}
          </label>
          <input
            id={field.id}
            type={field.type}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            placeholder={field.placeholder}
            required
            className="input-field"
          />
        </motion.div>
      ))}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl px-4 py-3 text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div custom={3} variants={inputVariants} initial="initial" animate="animate">
        <motion.button
          id="signup-submit-btn"
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
              Creating account…
            </>
          ) : 'Create Account'}
        </motion.button>
      </motion.div>

      <motion.p
        custom={4} variants={inputVariants} initial="initial" animate="animate"
        className="text-center text-sm text-slate-500"
      >
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Sign in
        </Link>
      </motion.p>
    </form>
  )
}
