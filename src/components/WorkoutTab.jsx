import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { getWorkoutForDate, saveWorkout, getWorkouts, uuid } from '../utils/storage'

// --- Hevy CSV import ---

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += c
    }
  }
  result.push(current)
  return result
}

function parseHevyCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  const headers = parseCSVLine(lines[0]).map(h => h.trim())

  const rows = lines.slice(1)
    .map(line => {
      const values = parseCSVLine(line)
      return Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]))
    })
    .filter(r => r['Exercise Name'])

  // Detect weight column (kg or lbs depending on user's Hevy settings)
  const weightCol = headers.find(h => h.startsWith('Weight'))

  // Group rows: date → exercise name → [sets]
  const byDate = {}
  for (const row of rows) {
    const startTime = row['Start Time']
    if (!startTime) continue
    const date = startTime.slice(0, 10) // YYYY-MM-DD
    if (!byDate[date]) byDate[date] = {}
    const exName = row['Exercise Name']
    if (!byDate[date][exName]) byDate[date][exName] = []
    byDate[date][exName].push(row)
  }

  return Object.entries(byDate).map(([date, exercises]) => ({
    date,
    exercises: Object.entries(exercises).map(([name, sets]) => {
      const firstSet = sets[0]
      const hasSeconds = sets.some(s => Number(s['Seconds'] || 0) > 0)
      const hasReps = sets.some(s => Number(s['Reps'] || 0) > 0)
      const isCardio = hasSeconds && !hasReps

      if (isCardio) {
        const totalSec = sets.reduce((s, r) => s + Number(r['Seconds'] || 0), 0)
        const distM = Number(firstSet['Distance (meters)'] || 0)
        return {
          id: uuid(),
          name,
          type: 'cardio',
          sets: [],
          duration: String(Math.round(totalSec / 60)),
          distance: distM ? String(Math.round(distM / 1609.34 * 10) / 10) : '',
        }
      }

      return {
        id: uuid(),
        name,
        type: 'strength',
        sets: sets.map(s => ({
          reps: s['Reps'] || '',
          weight: weightCol ? (s[weightCol] || '') : '',
        })),
        duration: '',
        distance: '',
      }
    }),
  }))
}

// --- Paste workout text parser ---

function parseSetLine(line) {
  // "1 · 60 kg × 10", "60kg x 10", "Set 1: 60 kg × 10 reps", "3 x 60 x 10"
  const m = line.match(/(\d+\.?\d*)\s*(?:kg|lbs?|lb)?\s*[x×]\s*(\d+)/i)
  if (m) return { weight: m[1], reps: m[2] }
  // reps first: "10 x 60kg", "10 reps @ 60kg"
  const m2 = line.match(/(\d+)\s*(?:reps?)?\s*[x×@]\s*(\d+\.?\d*)\s*(?:kg|lbs?)?/i)
  if (m2) return { reps: m2[1], weight: m2[2] }
  return null
}

function parsePastedWorkout(text) {
  // Split into blocks by blank lines
  const blocks = text.trim().split(/\n\s*\n/)
  const exercises = []

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    // Skip lines that look like workout metadata (date, duration, title without sets)
    const hasSets = lines.slice(1).some(l => parseSetLine(l))
    if (!hasSets && lines.length === 1) continue // lone header line

    // First line = exercise name (strip leading emojis, bullet chars)
    const name = lines[0].replace(/^[\d\s·\-•]+/, '').trim()
    if (!name) continue

    const sets = lines.slice(1).map(l => parseSetLine(l)).filter(Boolean)
    if (!sets.length) continue

    exercises.push({
      id: uuid(),
      name,
      type: 'strength',
      sets,
      duration: '',
      distance: '',
    })
  }

  return exercises
}

function PasteWorkoutForm({ onSave, onCancel }) {
  const [text, setText] = useState('')
  const preview = text.trim() ? parsePastedWorkout(text) : []

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">Paste workout</h3>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 text-xs">Cancel</button>
      </div>

      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Paste your Hevy workout here, e.g.\n\nBench Press\n1 · 60 kg × 10\n2 · 70 kg × 8\n\nSquat\n1 · 100 kg × 5`}
        rows={7}
        className="w-full bg-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-mono"
      />

      {preview.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-medium">Preview — {preview.length} exercise{preview.length !== 1 ? 's' : ''} detected</p>
          {preview.map((ex, i) => (
            <div key={i} className="bg-slate-700/50 rounded-lg px-3 py-2">
              <div className="text-sm text-white font-medium">{ex.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {ex.sets.map((s, j) => `${j + 1}. ${s.weight ? s.weight + ' × ' : ''}${s.reps} reps`).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {text.trim() && preview.length === 0 && (
        <p className="text-xs text-red-400">Couldn't detect any exercises — check the format.</p>
      )}

      <button
        onClick={() => preview.length && onSave(preview)}
        disabled={!preview.length}
        className="w-full py-2.5 bg-emerald-600 rounded-lg text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40"
      >
        Add {preview.length > 0 ? preview.length : ''} exercise{preview.length !== 1 ? 's' : ''} to today
      </button>
    </div>
  )
}

function HevyImportButton({ onImport }) {
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null) // null | {imported, skipped}

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const workouts = parseHevyCSV(ev.target.result)
        const existing = getWorkouts()
        const existingDates = new Set(existing.map(w => w.date))
        let imported = 0, skipped = 0
        for (const w of workouts) {
          if (existingDates.has(w.date)) { skipped++; continue }
          saveWorkout(w)
          imported++
        }
        setStatus({ imported, skipped })
        onImport()
        setTimeout(() => setStatus(null), 4000)
      } catch {
        setStatus({ error: true })
        setTimeout(() => setStatus(null), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current.click()}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
      >
        <Upload size={13} /> Import Hevy CSV
      </button>
      {status && (
        <p className={`text-xs mt-1 ${status.error ? 'text-red-400' : 'text-emerald-400'}`}>
          {status.error
            ? 'Failed to parse CSV — make sure it\'s a Hevy export.'
            : `Imported ${status.imported} day${status.imported !== 1 ? 's' : ''}${status.skipped ? `, skipped ${status.skipped} already logged` : ''}.`}
        </p>
      )}
    </div>
  )
}

function makeExercise() {
  return {
    id: uuid(),
    name: '',
    type: 'strength',
    sets: [{ reps: '', weight: '' }],
    duration: '',
    distance: '',
  }
}

// Compute per-exercise PR weight across all workouts
function computePRs() {
  const workouts = getWorkouts()
  const prMap = {} // exerciseName (lowercase) -> maxWeight (number)
  for (const w of workouts) {
    for (const ex of (w.exercises || [])) {
      if (ex.type !== 'strength') continue
      const key = ex.name.toLowerCase()
      for (const set of (ex.sets || [])) {
        const w = Number(set.weight)
        if (w > 0 && (prMap[key] === undefined || w > prMap[key])) {
          prMap[key] = w
        }
      }
    }
  }
  return prMap
}

function ExerciseCard({ ex, onDelete, prMap }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-semibold text-white">{ex.name}</span>
          <span
            className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
              ex.type === 'strength' ? 'bg-emerald-900 text-emerald-300' : 'bg-blue-900 text-blue-300'
            }`}
          >
            {ex.type}
          </span>
        </div>
        <button onClick={onDelete} className="text-slate-500 hover:text-red-400 p-1 -mt-1 -mr-1">
          <Trash2 size={15} />
        </button>
      </div>

      {ex.type === 'strength' ? (
        <div className="space-y-1 mt-2">
          <div className="grid grid-cols-3 text-xs text-slate-500 px-1 mb-1">
            <span>Set</span>
            <span>Reps</span>
            <span>Weight</span>
          </div>
          {ex.sets.map((set, i) => {
            const w = Number(set.weight)
            const prWeight = prMap?.[ex.name.toLowerCase()]
            const isPR = w > 0 && prWeight !== undefined && w >= prWeight
            return (
              <div key={i} className="grid grid-cols-3 text-sm text-slate-300 bg-slate-700/50 rounded-lg px-3 py-1.5">
                <span>{i + 1}</span>
                <span>{set.reps || '—'}</span>
                <span className="flex items-center gap-1.5">
                  {set.weight ? `${set.weight} lbs` : '—'}
                  {isPR && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-900/40 px-1.5 py-0.5 rounded-full leading-none">
                      PR
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex gap-4 mt-2 text-sm text-slate-300">
          {ex.duration && (
            <span className="bg-slate-700/50 rounded-lg px-3 py-1.5">{ex.duration} min</span>
          )}
          {ex.distance && (
            <span className="bg-slate-700/50 rounded-lg px-3 py-1.5">{ex.distance} mi</span>
          )}
        </div>
      )}
    </div>
  )
}

// Find the most recent session for a given exercise name across all workouts
function findLastSession(name) {
  const workouts = getWorkouts()
  const lowerName = name.toLowerCase()
  // Sort descending by date
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date))
  for (const w of sorted) {
    const match = (w.exercises || []).find(ex =>
      ex.name.toLowerCase().includes(lowerName) && ex.type === 'strength'
    )
    if (match && match.sets?.length > 0) {
      return { date: w.date, sets: match.sets }
    }
  }
  return null
}

function formatSetsHint(sets) {
  // Summarize as e.g. "3×10 @ 80 lbs" using the most common reps/weight
  if (!sets.length) return ''
  const count = sets.length
  // Use first set as representative
  const { reps, weight } = sets[0]
  if (weight && reps) return `${count}×${reps} @ ${weight} lbs`
  if (reps) return `${count}×${reps}`
  return `${count} sets`
}

function AddExerciseForm({ onSave, onCancel }) {
  const [ex, setEx] = useState(makeExercise())
  const [historyHint, setHistoryHint] = useState(null)

  useEffect(() => {
    if (ex.name.trim().length >= 3) {
      const last = findLastSession(ex.name.trim())
      setHistoryHint(last)
    } else {
      setHistoryHint(null)
    }
  }, [ex.name])

  function addSet() {
    setEx(e => ({ ...e, sets: [...e.sets, { reps: '', weight: '' }] }))
  }

  function removeSet(idx) {
    setEx(e => ({ ...e, sets: e.sets.filter((_, i) => i !== idx) }))
  }

  function updateSet(idx, field, value) {
    setEx(e => {
      const sets = [...e.sets]
      sets[idx] = { ...sets[idx], [field]: value }
      return { ...e, sets }
    })
  }

  function handleSave() {
    if (!ex.name.trim()) return
    onSave(ex)
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-white">Add Exercise</h3>

      <div>
        <input
          placeholder="Exercise name (e.g. Bench Press)"
          value={ex.name}
          onChange={e => setEx(x => ({ ...x, name: e.target.value }))}
          autoFocus
          className="w-full bg-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {historyHint && (
          <p className="text-xs text-slate-400 mt-1.5 px-1">
            Last time:{' '}
            <span className="text-slate-300">
              {new Date(historyHint.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {' — '}
            <span className="text-emerald-400">{formatSetsHint(historyHint.sets)}</span>
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {['strength', 'cardio'].map(t => (
          <button
            key={t}
            onClick={() => setEx(x => ({ ...x, type: t }))}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              ex.type === t ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {t === 'strength' ? '🏋️ Strength' : '🏃 Cardio'}
          </button>
        ))}
      </div>

      {ex.type === 'strength' ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 text-xs text-slate-500 px-1">
            <span>Set</span>
            <span>Reps</span>
            <span>Weight (lbs)</span>
          </div>
          {ex.sets.map((set, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-6 text-center">{i + 1}</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="10"
                value={set.reps}
                onChange={e => updateSet(i, 'reps', e.target.value)}
                className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="number"
                inputMode="decimal"
                placeholder="135"
                value={set.weight}
                onChange={e => updateSet(i, 'weight', e.target.value)}
                className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {ex.sets.length > 1 && (
                <button onClick={() => removeSet(i)} className="text-slate-500 hover:text-red-400 p-1">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addSet}
            className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-1"
          >
            <Plus size={14} /> Add set
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Duration (min)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="30"
              value={ex.duration}
              onChange={e => setEx(x => ({ ...x, duration: e.target.value }))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Distance (mi)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="3.1"
              value={ex.distance}
              onChange={e => setEx(x => ({ ...x, distance: e.target.value }))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-700 rounded-lg text-slate-300 text-sm font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!ex.name.trim()}
          className="flex-1 py-2.5 bg-emerald-600 rounded-lg text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default function WorkoutTab({ date }) {
  const [workout, setWorkout] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [prMap, setPrMap] = useState({})

  function reload() {
    setWorkout(getWorkoutForDate(date))
    setPrMap(computePRs())
  }

  useEffect(() => {
    setWorkout(getWorkoutForDate(date))
    setShowForm(false)
    setPrMap(computePRs())
  }, [date])

  function handleSaveExercise(exercise) {
    const updated = workout
      ? { ...workout, exercises: [...workout.exercises, exercise] }
      : { date, exercises: [exercise] }
    saveWorkout(updated)
    setWorkout(updated)
    setShowForm(false)
    setPrMap(computePRs())
  }

  function handlePasteImport(exercises) {
    const updated = workout
      ? { ...workout, exercises: [...workout.exercises, ...exercises] }
      : { date, exercises }
    saveWorkout(updated)
    setWorkout(updated)
    setShowPaste(false)
    setPrMap(computePRs())
  }

  function handleDelete(id) {
    const updated = { ...workout, exercises: workout.exercises.filter(e => e.id !== id) }
    saveWorkout(updated)
    setWorkout(updated)
    setPrMap(computePRs())
  }

  const exercises = workout?.exercises || []

  return (
    <div className="p-4 space-y-3 pb-6">
      <div className="flex justify-end">
        <HevyImportButton onImport={reload} />
      </div>

      {exercises.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-5xl mb-3">💪</div>
          <p className="text-sm">No exercises logged for this day</p>
        </div>
      )}

      {exercises.map(ex => (
        <ExerciseCard key={ex.id} ex={ex} onDelete={() => handleDelete(ex.id)} prMap={prMap} />
      ))}

      {showPaste ? (
        <PasteWorkoutForm onSave={handlePasteImport} onCancel={() => setShowPaste(false)} />
      ) : showForm ? (
        <AddExerciseForm onSave={handleSaveExercise} onCancel={() => setShowForm(false)} />
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 py-3.5 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus size={18} /> Add Exercise
          </button>
          <button
            onClick={() => setShowPaste(true)}
            className="py-3.5 px-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            title="Paste from Hevy"
          >
            <Upload size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
