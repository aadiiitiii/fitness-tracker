import { useState } from 'react'
import { Dumbbell, UtensilsCrossed, Star, BarChart2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import WorkoutTab from './components/WorkoutTab'
import FoodTab from './components/FoodTab'
import RatingTab from './components/RatingTab'
import ProgressTab from './components/ProgressTab'
import { exportAllData } from './utils/storage'

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

  function changeDate(delta) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d)
  }

  const dateStr = toDateStr(selectedDate)
  const isToday = dateStr === toDateStr(new Date())
  const showDateNav = activeTab !== 'progress'

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white max-w-md mx-auto relative">
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
          </div>
        </div>
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

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'workout' && <WorkoutTab date={dateStr} />}
        {activeTab === 'food' && <FoodTab date={dateStr} />}
        {activeTab === 'rating' && <RatingTab date={dateStr} />}
        {activeTab === 'progress' && <ProgressTab />}
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
