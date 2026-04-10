import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Dumbbell } from 'lucide-react'

export default function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  function switchMode(next) {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: import.meta.env.VITE_APP_URL || window.location.origin,
      })
      if (error) setError(error.message)
      else setMessage('Password reset email sent — check your inbox.')
      setLoading(false)
      return
    }

    const fn = mode === 'signup'
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password })
    const { error } = await fn
    if (error) setError(error.message)
    else if (mode === 'signup') setMessage('Check your email to confirm your account.')
    setLoading(false)
  }

  async function handleGoogle() {
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: import.meta.env.VITE_APP_URL || window.location.origin },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / App name */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-3">
            <Dumbbell size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-400 tracking-tight">Fitness Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">
            {mode === 'signin' ? 'Sign in to sync your data' : 'Create an account to get started'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
          {/* Google button — hidden on reset mode */}
          {mode !== 'reset' && <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 rounded-xl transition-colors mb-5"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>}

          {/* Divider — hidden on reset mode */}
          {mode !== 'reset' && <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>}

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            {mode !== 'reset' && (
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {password.length > 0 && password.length < 6 && (
                  <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
                )}
              </div>
            )}

            {/* Error / success messages */}
            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}
            {message && (
              <p className="text-emerald-400 text-sm bg-emerald-400/10 rounded-lg px-3 py-2">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading
                ? (mode === 'reset' ? 'Sending…' : mode === 'signup' ? 'Creating account…' : 'Signing in…')
                : (mode === 'reset' ? 'Send reset email' : mode === 'signup' ? 'Create account' : 'Sign in')}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-5 space-y-2 text-center">
            {mode !== 'reset' && (
              <p className="text-slate-400 text-sm">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}
            {mode === 'signin' && (
              <p className="text-slate-500 text-sm">
                <button
                  onClick={() => switchMode('reset')}
                  className="hover:text-slate-300 transition-colors"
                >
                  Forgot password?
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <p className="text-slate-400 text-sm">
                <button
                  onClick={() => switchMode('signin')}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  ← Back to sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Your data stays local even without an account.
        </p>
      </div>
    </div>
  )
}
