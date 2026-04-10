import { useState, useEffect } from 'react'
import { Droplets } from 'lucide-react'
import { getWaterForDate, saveWaterLog } from '../../utils/storage'

export default function WaterTracker({ date }) {
  const [glasses, setGlasses] = useState(0)
  const [waterUnit, setWaterUnit] = useState(() => localStorage.getItem('ft_water_unit') || 'glasses')
  const [mlInput, setMlInput] = useState('')

  useEffect(() => {
    const w = getWaterForDate(date)
    setGlasses(w.glasses)
    setMlInput(String(w.glasses * 250))
  }, [date])

  function switchUnit(unit) {
    setWaterUnit(unit)
    localStorage.setItem('ft_water_unit', unit)
  }

  function updateGlasses(delta) {
    const next = Math.max(0, glasses + delta)
    setGlasses(next)
    setMlInput(String(next * 250))
    saveWaterLog({ date, glasses: next })
  }

  function handleMlChange(val) {
    setMlInput(val)
  }

  function handleMlBlur() {
    const ml = parseInt(mlInput, 10) || 0
    const nextGlasses = Math.round(ml / 250)
    setGlasses(nextGlasses)
    setMlInput(String(nextGlasses * 250))
    saveWaterLog({ date, glasses: nextGlasses })
  }

  const ml = glasses * 250

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-blue-400" />
          <span className="font-semibold text-white text-sm">Water</span>
        </div>
        <div className="flex gap-1">
          {['glasses', 'ml'].map(u => (
            <button
              key={u}
              onClick={() => switchUnit(u)}
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                waterUnit === u ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {waterUnit === 'glasses' ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{ml} ml total</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateGlasses(-1)}
                disabled={glasses === 0}
                className="w-8 h-8 rounded-full bg-slate-700 text-white font-bold hover:bg-slate-600 disabled:opacity-30 flex items-center justify-center text-lg"
              >
                −
              </button>
              <span className="text-lg font-bold text-blue-400 w-6 text-center">{glasses}</span>
              <button
                onClick={() => updateGlasses(1)}
                className="w-8 h-8 rounded-full bg-slate-700 text-white font-bold hover:bg-slate-600 flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {glasses} glass{glasses !== 1 ? 'es' : ''} · each glass = 250 ml
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              step={50}
              min={0}
              value={mlInput}
              onChange={e => handleMlChange(e.target.value)}
              onBlur={handleMlBlur}
              className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-sm">ml</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            ≈ {glasses} glass{glasses !== 1 ? 'es' : ''} · saved on blur
          </div>
        </>
      )}
    </div>
  )
}
