import { useState, useEffect, lazy, Suspense } from 'react'
import { Dumbbell, UtensilsCrossed, Star, BarChart2, ChevronLeft, ChevronRight, Download, LogOut } from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import ErrorBoundary from './components/ErrorBoundary'

const WorkoutTab = lazy(() => import('./components/WorkoutTab'))
const FoodTab = lazy(() => import('./components/FoodTab'))
const RatingTab = lazy(() => import('./components/RatingTab'))
const ProgressTab = lazy(() => import('./components/ProgressTab'))
import { exportAllData, pullFromSupabase, clearLocalData } from './utils/storage'
import { supabase } from './lib/supabase'

function toDateStr(date) {
  return date.toISOString().split('T')[0]
}

function displayDate(date) {
  const todayStr = toDateStr(new Date())
  const dateStr = toDateStr(date)
  if (dateStr === todayStr) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === toDateStr(yesterday)) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const TABS = [
  { id: 'workout', label: 'Workout', Icon: Dumbbell },
  { id: 'food', label: 'Food', Icon: UtensilsCrossed },
  { id: 'rating', label: 'Rating', Icon: Star },
  { id: 'progress', label: 'Progress', Icon: BarChart2 },
]

function handleExport() {
  const data = exportAllData()
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `fitness-data-${dateStr}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function App() {
  const [activeTab, setActiveTab] = useState('workout')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [syncError, setSyncError] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('ft_onboarded'))

  useEffect(() => {
    // Check for an existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        pullFromSupabase()
      }
      setAuthLoading(false)
    })

    // Listen for sync errors from storage layer
    const handleSyncError = () => {
      setSyncError(true)
      setTimeout(() => setSyncError(false), 5000)
    }
    window.addEventListener('supabase-sync-error', handleSyncError)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        pullFromSupabase().then(() => setUser(session.user))
      } else if (event === 'SIGNED_OUT') {
        clearLocalData()
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('supabase-sync-error', handleSyncError)
    }
  }, [])

  function changeDate(delta) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  // Full-screen loading spinner while checking session
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen />
  }

  const dateStr = toDateStr(selectedDate)
  const isToday = dateStr === toDateStr(new Date())
  const showDateNav = activeTab !== 'progress'

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white max-w-md mx-auto relative">
      {/* Sync error banner */}
      {syncError && (
        <div className="flex-none bg-red-900/80 text-red-200 text-xs text-center py-1.5 px-4">
          Sync failed — data saved locally, will retry when connection restores.
        </div>
      )}

      {/* Header */}
      <div className="flex-none px-4 pt-12 pb-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-emerald-400 tracking-tight">Fitness Tracker</h1>
          <div className="flex items-center gap-2">
            {showDateNav && !isToday && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-xs text-emerald-400 border border-emerald-700 rounded-full px-2 py-0.5"
              >
                Go to today
              </button>
            )}
            <button
              onClick={handleExport}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              title="Export all data as JSON"
            >
              <Download size={18} />
            </button>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        {/* User email */}
        <p className="text-xs text-slate-500 truncate max-w-[180px] mb-1">{user.email}</p>
        {showDateNav && (
          <div className="flex items-center justify-between mt-1">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 active:bg-slate-700"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-semibold text-slate-200">{displayDate(selectedDate)}</span>
            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 disabled:opacity-25 active:bg-slate-700"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Onboarding banner */}
      {showOnboarding && (
        <div className="flex-none bg-emerald-900/60 border-b border-emerald-800 px-4 py-2 flex items-center justify-between gap-3">
          <span className="text-xs text-emerald-200">👋 Welcome! Log workouts → track food → rate your day → see progress</span>
          <button
            onClick={() => { localStorage.setItem('ft_onboarded', '1'); setShowOnboarding(false) }}
            className="flex-shrink-0 text-xs font-semibold text-emerald-300 border border-emerald-700 rounded-full px-2.5 py-0.5 hover:bg-emerald-800 transition-colors"
          >
            Got it
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ErrorBoundary key={activeTab}>
            {activeTab === 'workout' && <WorkoutTab date={dateStr} />}
            {activeTab === 'food' && <FoodTab date={dateStr} />}
            {activeTab === 'rating' && <RatingTab date={dateStr} />}
            {activeTab === 'progress' && <ProgressTab />}
          </ErrorBoundary>
        </Suspense>
      </div>

      {/* Bottom Nav */}
      <div className="flex-none flex border-t border-slate-800 bg-slate-900 pb-safe">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${
              activeTab === id ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 1.8} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
