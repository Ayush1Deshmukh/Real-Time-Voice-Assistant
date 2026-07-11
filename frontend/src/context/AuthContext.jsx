import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../lib/firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth'

/**
 * AuthContext — wraps the entire app with Firebase session state.
 *
 * Exposes:
 *   user       — current Firebase User object (null if logged out)
 *   loading    — true while the initial session is being resolved
 *   signIn(email, password) → { error }
 *   signUp(email, password) → { error }
 *   signOut()
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for auth state changes (resolves initial session and handles login/logout)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    }, (error) => {
      console.error("Firebase auth error:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (email, password) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOutUser = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Firebase signout error:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
