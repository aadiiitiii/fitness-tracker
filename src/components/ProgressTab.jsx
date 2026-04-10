import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  getWorkouts,
  getFoodLogs,
  getRatings,
  getWeightLog,
  saveWeightEntry,
} from '../utils/storage'

function getLast30Days() {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function getLast90Days() {
  const days = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function shortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function foodCalories(log) {
  return log.meals.reduce(
    (s, m) => s + m.items.reduce((ms, i) => ms + (Number(i.calories) || 0), 0),
    0
  )
}

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '10px',
  color: '#e2e8f0',
  fontSize: 12,
}

const tickStyle = { fill: '#64748b', fontSize: 11 }

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs font-medium text-slate-300 mt-0.5">{label}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  )
}

// Compute current streak: consecutive days ending today (or yesterday) with any log entry
function computeStreak(workoutDates, foodDates, ratingDates) {
  const allActiveDates = new Set([...workoutDates, ...foodDates, ...ratingDates])

  let streak = 0
  // Start from today; if today has no data, start from yesterday
  let cursor = new Date()
  // Check if today has data
  const todayStr = cursor.toISOString().split('T')[0]
  if (!allActiveDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (true) {
    const dateStr = cursor.toISOString().split('T')[0]
    if (allActiveDates.has(dateStr)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// Get all exercise names from last 90 days
function getExerciseNames(workouts, last90) {
  const set90 = new Set(last90)
  const names = new Set()
  for (const w of workouts) {
    if (!set90.has(w.date)) continue
    for (const ex of (w.exercises || [])) {
      if (ex.type === 'strength' && ex.name) names.add(ex.name)
    }
  }
  return [...names].sort()
}

// Build progression data for an exercise: [{date, maxWeight}] for last 20 sessions
function buildExerciseProgression(workouts, exerciseName) {
  const sessions = []
  for (const w of workouts) {
    const ex = (w.exercises || []).find(e =>
      e.name === exerciseName && e.type === 'strength' && e.sets?.length > 0
    )
    if (ex) {
      const maxW = Math.max(...ex.sets.map(s => Number(s.weight) || 0))
      if (maxW > 0) sessions.push({ date: w.date, maxWeight: maxW })
    }
  }
  // Sort by date ascending, take last 20
  sessions.sort((a, b) => a.date.localeCompare(b.date))
  return sessions.slice(-20).map(s => ({ ...s, label: shortDate(s.date) }))
}

export default function ProgressTab() {
  const days = getLast30Days()
  const last90 = getLast90Days()
  const allWorkouts = getWorkouts()
  const allFood = getFoodLogs()
  const allRatings = getRatings()

  const workoutDates = new Set(allWorkouts.map(w => w.date))
  const foodDates = new Set(allFood.map(f => f.date))
  const ratingDates = new Set(allRatings.map(r => r.date))

  const streak = computeStreak(workoutDates, foodDates, ratingDates)

  const chartData = days.map(date => {
    const food = allFood.find(f => f.date === date)
    const rating = allRatings.find(r => r.date === date)
    const calories = food ? foodCalories(food) : null
    const overall = rating
      ? Math.round((rating.workout + rating.nutrition + rating.energy + rating.sleep) / 4)
      : null

    return {
      date: shortDate(date),
      calories,
      worked_out: workoutDates.has(date) ? 1 : 0,
      overall,
      workout: rating?.workout ?? null,
      nutrition: rating?.nutrition ?? null,
      energy: rating?.energy ?? null,
    }
  })

  // Summary stats
  const recentWorkouts = [...workoutDates].filter(d => days.includes(d))
  const recentFood = allFood.filter(f => days.includes(f.date))
  const recentRatings = allRatings.filter(r => days.includes(r.date))

  const avgCalories =
    recentFood.length > 0
      ? Math.round(recentFood.reduce((s, f) => s + foodCalories(f), 0) / recentFood.length)
      : null

  const avgRating =
    recentRatings.length > 0
      ? (
          recentRatings.reduce(
            (s, r) => s + (r.workout + r.nutrition + r.energy + r.sleep) / 4,
            0
          ) / recentRatings.length
        ).toFixed(1)
      : null

  // Best day
  const bestDay = recentRatings.reduce(
    (best, r) => {
      const score = (r.workout + r.nutrition + r.energy + r.sleep) / 4
      return score > (best?.score ?? 0) ? { score, date: r.date } : best
    },
    null
  )

  // Weight log
  const today = new Date().toISOString().split('T')[0]
  const [weightInput, setWeightInput] = useState('')
  const [weightLog, setWeightLog] = useState([])

  useEffect(() => {
    const log = getWeightLog()
    setWeightLog(log)
    const todayEntry = log.find(w => w.date === today)
    if (todayEntry) setWeightInput(String(todayEntry.kg))
  }, [today])

  function handleSaveWeight() {
    const kg = parseFloat(weightInput)
    if (!kg || kg <= 0) return
    saveWeightEntry({ date: today, kg })
    const updated = getWeightLog()
    setWeightLog(updated)
  }

  // Build weight chart data (last 30 days)
  const weightChartData = days.map(date => {
    const entry = weightLog.find(w => w.date === date)
    return { date: shortDate(date), kg: entry ? entry.kg : null }
  }).filter(d => d.kg !== null)

  // Exercise progression
  const exerciseNames = getExerciseNames(allWorkouts, last90)
  const [selectedExercise, setSelectedExercise] = useState('')

  useEffect(() => {
    if (exerciseNames.length > 0 && !selectedExercise) {
      setSelectedExercise(exerciseNames[0])
    }
  }, [exerciseNames.length])

  const exerciseProgression = selectedExercise
    ? buildExerciseProgression(allWorkouts, selectedExercise)
    : []

  return (
    <div className="p-4 space-y-4 pb-6">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Last 30 Days</p>

      {/* Stats Row — 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Workouts"
          value={recentWorkouts.length}
          sub="sessions"
          color="text-emerald-400"
        />
        <StatCard
          label="Avg Calories"
          value={avgCalories ?? '—'}
          sub="per day"
          color="text-orange-400"
        />
        <StatCard
          label="Avg Rating"
          value={avgRating ?? '—'}
          sub="out of 10"
          color="text-yellow-400"
        />
        <StatCard
          label={`${streak > 0 ? '🔥 ' : ''}Streak`}
          value={streak}
          sub={streak === 1 ? 'day' : 'days'}
          color="text-red-400"
        />
      </div>

      {bestDay && (
        <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Best Day</div>
            <div className="text-sm font-semibold text-white mt-0.5">{shortDate(bestDay.date)}</div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{bestDay.score.toFixed(1)}</div>
        </div>
      )}

      {/* Body Weight */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Body Weight</h3>
          {weightChartData.length >= 2 && (() => {
            const delta = (weightChartData[weightChartData.length - 1].kg - weightChartData[0].kg).toFixed(1)
            const isDown = delta < 0
            const isUp = delta > 0
            return (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isDown ? 'text-emerald-400 bg-emerald-900/40' : isUp ? 'text-red-400 bg-red-900/40' : 'text-slate-400 bg-slate-700'}`}>
                {isDown ? '▼' : isUp ? '▲' : '—'} {Math.abs(delta)} kg (30d)
              </span>
            )
          })()}
        </div>

        {/* Current weight display */}
        {weightChartData.length > 0 && (
          <div className="mb-3 text-center">
            <span className="text-4xl font-bold text-purple-400">
              {weightChartData[weightChartData.length - 1].kg}
            </span>
            <span className="text-slate-400 text-sm ml-1">kg</span>
          </div>
        )}

        {/* Log today's weight */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Today's weight (kg)"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value.replace(/[^0-9.]/g, ''))}
            onFocus={e => e.target.select()}
            className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            onClick={handleSaveWeight}
            disabled={!weightInput || parseFloat(weightInput) <= 0}
            className="px-4 py-2 bg-purple-600 rounded-lg text-white text-sm font-semibold hover:bg-purple-500 disabled:opacity-40 flex-shrink-0"
          >
            Log
          </button>
        </div>

        {/* Chart */}
        {weightChartData.length >= 2 ? (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={weightChartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={tickStyle} interval={Math.max(0, Math.floor(weightChartData.length / 5) - 1)} />
                <YAxis tick={tickStyle} domain={['auto', 'auto']} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} kg`, 'Weight']} />
                <Line
                  type="monotone"
                  dataKey="kg"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : weightChartData.length === 1 ? (
          <p className="text-xs text-slate-500 text-center mt-3">Log one more day to see your trend</p>
        ) : (
          <p className="text-xs text-slate-500 text-center mt-3">Log your weight daily to track your trend</p>
        )}
      </div>

      {/* Calories Chart */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Daily Calories</h3>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={tickStyle} interval={6} />
            <YAxis tick={tickStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="calories"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              name="Calories"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Workout Frequency Chart */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Workout Days</h3>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <XAxis dataKey="date" tick={tickStyle} interval={6} />
            <Tooltip contentStyle={tooltipStyle} formatter={() => ['Worked out']} />
            <Bar dataKey="worked_out" fill="#10b981" radius={[4, 4, 0, 0]} name="Worked out" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rating Trends */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Rating Trends</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={tickStyle} interval={6} />
            <YAxis domain={[0, 10]} tick={tickStyle} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#a78bfa"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
              name="Overall"
            />
            <Line
              type="monotone"
              dataKey="workout"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              name="Workout"
              strokeDasharray="4 2"
            />
            <Line
              type="monotone"
              dataKey="nutrition"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              name="Nutrition"
              strokeDasharray="4 2"
            />
            <Line
              type="monotone"
              dataKey="energy"
              stroke="#38bdf8"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              name="Energy"
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Exercise Progression */}
      {exerciseNames.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Exercise Progress</h3>
          <select
            value={selectedExercise}
            onChange={e => setSelectedExercise(e.target.value)}
            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-4"
          >
            {exerciseNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {exerciseProgression.length >= 2 ? (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={exerciseProgression} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={tickStyle} interval={Math.max(0, Math.floor(exerciseProgression.length / 4) - 1)} />
                <YAxis tick={tickStyle} domain={['auto', 'auto']} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} lbs`, 'Max weight']} />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                  connectNulls={false}
                  name="Max weight (lbs)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : exerciseProgression.length === 1 ? (
            <p className="text-xs text-slate-500 text-center py-4">Only 1 session found — log more to see a trend</p>
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">No weight data for this exercise</p>
          )}
        </div>
      )}
    </div>
  )
}
