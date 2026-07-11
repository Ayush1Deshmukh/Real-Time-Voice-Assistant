import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useWebSocketContext } from '../../context/WebSocketContext'

function ConnectionPill({ status }) {
  const cfg = {
    connected:    { color: '#34d399', label: 'Connected' },
    reconnecting: { color: '#fbbf24', label: 'Reconnecting' },
    disconnected: { color: '#f87171', label: 'Disconnected' },
  }[status] || { color: '#64748b', label: 'Unknown' }

  return (
    <div className="status-pill" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="relative flex w-2 h-2">
        {status === 'connected' && (
          <span
            className="animate-ping-slow absolute inline-flex h-full w-full rounded-full"
            style={{ backgroundColor: cfg.color, opacity: 0.4 }}
          />
        )}
        <span className="relative inline-flex rounded-full w-2 h-2" style={{ backgroundColor: cfg.color }} />
      </span>
      <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}

export default function Navbar() {
  const { user, signOut }       = useAuth()
  const { connectionStatus }    = useWebSocketContext()
  const navigate                = useNavigate()
  const location                = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navLink = (to, label) => (
    <Link to={to}>
      <motion.span
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className={`text-sm font-medium transition-colors duration-200 cursor-pointer ${
          location.pathname === to ? 'text-brand-400' : 'text-slate-400 hover:text-slate-100'
        }`}
      >
        {label}
      </motion.span>
    </Link>
  )

  return (
    <motion.nav
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.1 }}
      className="sticky top-0 z-50"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(15,17,23,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard">
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-xl">🎙️</span>
            <span className="font-extrabold text-xl tracking-tight text-gradient-purple">VoiceAI</span>
          </motion.div>
        </Link>

        {/* Nav links */}
        {user && (
          <div className="hidden sm:flex items-center gap-6">
            {navLink('/dashboard', 'Assistant')}
            {navLink('/analytics', 'Analytics')}
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-4">
          {user && <ConnectionPill status={connectionStatus} />}
          {user && (
            <>
              <span className="hidden sm:block text-sm text-slate-500 truncate max-w-[160px]">
                {user.email}
              </span>
              <motion.button
                id="navbar-signout-btn"
                onClick={handleSignOut}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-ghost text-sm"
              >
                Sign out
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  )
}
