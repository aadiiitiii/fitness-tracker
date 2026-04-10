import { useState, useEffect } from 'react'
import { getRatingForDate, saveRating, getWeightForDate, saveWeightEntry, getWeightUnit, saveWeightUnit } from '../utils/storage'

const CATEGORIES = [
  { key: 'workout', label: 'Workout Quality', emoji: '💪', desc: 'How hard did you train?' },
  { key: 'nutrition', label: 'Nutrition', emoji: '🥗', desc: 'How well did you eat?' },
  { key: 'energy', label: 'Energy Level', emoji: '⚡', desc: 'How energized did you feel?' },
  { key: 'sleep', label: 'Sleep Quality', emoji: '😴', desc: 'How well did you sleep?' },
]

function makeDefault(date) {
  return { date, workout: 5, nutrition: 5, energy: 5, sleep: 5, notes: '' }
}

function scoreColor(val) {
  if (val >= 8) return 'text-emerald-400'
  if (val >= 6) return 'text-yellow-400'
  if (val >= 4) return 'text-orange-400'
  return 'text-red-400'
}

function scoreLabel(val) {
  if (val >= 9) return 'Excellent'
  if (val >= 7) return 'Good'
  if (val >= 5) return 'Okay'
  if (val >= 3) return 'Poor'
  return 'Bad'
}

function RatingSlider({ category, value, onChange }) {
  const { emoji, label, desc } = category
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <div className="font-medium text-white text-sm">{label}</div>
            <div className="text-xs text-slate-500">{desc}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${scoreColor(value)}`}>{value}</div>
          <div className={`text-xs ${scoreColor(value)}`}>{scoreLabel(value)}</div>
        </div>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full mt-2"
      />
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>1 — Terrible</span>
        <span>10 — Perfect</span>
      </div>
    </div>
  )
}

export default function RatingTab({ date }) {
  const [rating, setRating] = useState(() => getRatingForDate(date) || makeDefault(date))
  const [saveState, setSaveState] = useState('idle') // idle | saved
  const [weightInput, setWeightInput] = useState('')
  const [weightSaved, setWeightSaved] = useState(false)
  const [weightUnit, setWeightUnit] = useState(() => getWeightUnit())

  useEffect(() => {
    setRating(getRatingForDate(date) || makeDefault(date))
    setSaveState('idle')
    const entry = getWeightForDate(date)
    if (entry) {
      const unit = getWeightUnit()
      setWeightInput(unit === 'lbs' ? String(Math.round(entry.kg * 2.205 * 10) / 10) : String(entry.kg))
    } else {
      setWeightInput('')
    }
    setWeightSaved(false)
  }, [date])

  function handleUnitToggle(unit) {
    const current = parseFloat(weightInput)
    if (current > 0) {
      if (unit === 'lbs' && weightUnit === 'kg') {
        setWeightInput(String(Math.round(current * 2.205 * 10) / 10))
      } else if (unit === 'kg' && weightUnit === 'lbs') {
        setWeightInput(String(Math.round((current / 2.205) * 10) / 10))
      }
    }
    setWeightUnit(unit)
    saveWeightUnit(unit)
  }

  function handleSaveWeight() {
    const val = parseFloat(weightInput)
    if (!val || val <= 0) return
    const kg = weightUnit === 'lbs' ? val / 2.205 : val
    saveWeightEntry({ date, kg: Math.round(kg * 100) / 100 })
    setWeightSaved(true)
    setTimeout(() => setWeightSaved(false), 2000)
  }

  function set(key, val) {
    setRating(r => ({ ...r, [key]: val }))
    setSaveState('idle')
  }

  function handleSave() {
    saveRating(rating)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }

  const overall = Math.round(
    (rating.workout + rating.nutrition + rating.energy + rating.sleep) / 4
  )

  return (
    <div className="p-4 space-y-3 pb-6">
      {/* Overall Score */}
      <div className="bg-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Day Score</div>
          <div className="text-xs text-slate-500 mt-0.5">Average of all ratings</div>
        </div>
        <div className="text-right">
          <div className={`text-5xl font-bold ${scoreColor(overall)}`}>{overall}</div>
          <div className={`text-sm font-medium ${scoreColor(overall)}`}>{scoreLabel(overall)}</div>
        </div>
      </div>

      {/* Category Sliders */}
      {CATEGORIES.map(cat => (
        <RatingSlider
          key={cat.key}
          category={cat}
          value={rating[cat.key]}
          onChange={val => set(cat.key, val)}
        />
      ))}

      {/* Notes */}
      <div className="bg-slate-800 rounded-xl p-4">
        <label className="text-sm font-medium text-slate-300 block mb-2">Notes / Reflections</label>
        <textarea
          placeholder="How was your day? Any wins, struggles, or things to remember?"
          value={rating.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          className="w-full bg-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
        />
      </div>

      {/* Body Weight */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-slate-300">⚖️ Body Weight</div>
          <div className="flex gap-1">
            {['kg', 'lbs'].map(u => (
              <button
                key={u}
                onClick={() => handleUnitToggle(u)}
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                  weightUnit === u ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            inputMode="decimal"
            placeholder={weightUnit === 'lbs' ? 'e.g. 160' : 'e.g. 72.5'}
            value={weightInput}
            onChange={e => setWeightInput(e.target.value.replace(/[^0-9.]/g, ''))}
            onFocus={e => e.target.select()}
            className="flex-1 bg-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <span className="text-slate-400 text-sm">{weightUnit}</span>
          <button
            onClick={handleSaveWeight}
            disabled={!weightInput || parseFloat(weightInput) <= 0}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0 transition-all disabled:opacity-40 ${
              weightSaved ? 'bg-purple-800 text-purple-300' : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {weightSaved ? '✓' : 'Log'}
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
          saveState === 'saved'
            ? 'bg-emerald-800 text-emerald-300'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
        }`}
      >
        {saveState === 'saved' ? '✓ Saved!' : 'Save Rating'}
      </button>
    </div>
  )
}
