import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, X, ChevronRight, Bookmark, ScanLine } from 'lucide-react'
import { getRecentFoods, addRecentFood, saveCustomFood } from '../../utils/storage'
import {
  makeItem,
  searchLocalFoods,
  searchCustomFoods,
  searchOpenFoodFacts,
  searchUSDA,
  calcNutrition,
  recentFoodToResult,
  BARCODE_SUPPORTED,
} from './foodApi'
import BarcodeScanner from './BarcodeScanner'

export default function AddFoodForm({ onSave, onCancel }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [servingG, setServingG] = useState('100')
  const [servings, setServings] = useState(1)
  const [unit, setUnit] = useState('g') // 'g' | 'servings'
  const [mode, setMode] = useState('search') // 'search' | 'manual'
  const [manualItem, setManualItem] = useState(makeItem())
  const [showRecent, setShowRecent] = useState(false)
  const [recentFoods, setRecentFoods] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    setRecentFoods(getRecentFoods())
  }, [])

  function dedupKey(name) {
    return name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
  }

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const local = searchLocalFoods(query)
      const custom = searchCustomFoods(query).map(f => ({ ...f, isCustom: true }))

      const seen = new Set()
      const localResults = []
      for (const f of [...custom, ...local]) {
        const key = dedupKey(f.name)
        if (seen.has(key)) continue
        seen.add(key)
        localResults.push(f)
      }

      setResults(localResults)
      setLoading(true)
      try {
        const [off, usda] = await Promise.allSettled([
          searchOpenFoodFacts(query),
          searchUSDA(query),
        ])
        const usdaResults = usda.status === 'fulfilled' ? usda.value : []
        const offResults = off.status === 'fulfilled' ? off.value : []
        const webResults = []
        const webSeen = new Set(seen)
        for (const f of [...usdaResults, ...offResults]) {
          const key = dedupKey(f.name)
          if (webSeen.has(key)) continue
          webSeen.add(key)
          webResults.push(f)
        }
        const maxWeb = Math.max(0, 25 - localResults.length)
        setResults([...localResults, ...webResults.slice(0, maxWeb)])
      } catch {
        // keep local results
      }
      setLoading(false)
    }, 400)
  }, [query])

  function selectResult(result) {
    setSelected(result)
    setResults([])
    setShowRecent(false)
    setServingG(String(result.defaultServing))
    setServings(1)
    setUnit('servings')
  }

  const effectiveGrams = unit === 'g' ? (parseFloat(servingG) || 0) : servings * (selected?.defaultServing || 100)
  const nutrition = selected ? calcNutrition(selected, effectiveGrams) : null

  function handleAdd() {
    const item = makeItem({
      name: selected.name,
      calories: String(nutrition.calories),
      protein: String(nutrition.protein),
      carbs: String(nutrition.carbs),
      fat: String(nutrition.fat),
      grams: Math.round(effectiveGrams),
    })
    addRecentFood(item)
    onSave(item)
  }

  if (mode === 'manual') {
    return (
      <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400 font-medium">Manual entry</span>
          <button onClick={() => setMode('search')} className="text-xs text-emerald-400">
            Back to search
          </button>
        </div>
        <input
          placeholder="Food name"
          value={manualItem.name}
          onChange={e => setManualItem(i => ({ ...i, name: e.target.value }))}
          autoFocus
          className="w-full bg-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'calories', label: 'Calories', ring: 'focus:ring-orange-500' },
            { key: 'protein', label: 'Protein (g)', ring: 'focus:ring-blue-500' },
            { key: 'carbs', label: 'Carbs (g)', ring: 'focus:ring-yellow-500' },
            { key: 'fat', label: 'Fat (g)', ring: 'focus:ring-pink-500' },
          ].map(({ key, label, ring }) => (
            <div key={key}>
              <label className="text-xs text-slate-500 block mb-1">{label}</label>
              <input
                type="number"
                inputMode="decimal"
                value={manualItem[key]}
                onChange={e => setManualItem(i => ({ ...i, [key]: e.target.value }))}
                className={`w-full bg-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 ${ring}`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 bg-slate-700 rounded-lg text-slate-300 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (!manualItem.name.trim()) return
              saveCustomFood({
                name: manualItem.name,
                calories: manualItem.calories,
                protein: manualItem.protein,
                carbs: manualItem.carbs,
                fat: manualItem.fat,
                serving: '100g',
              })
              addRecentFood(manualItem)
              onSave(manualItem)
            }}
            disabled={!manualItem.name.trim()}
            className="flex-1 py-2 bg-emerald-600 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 border-t border-slate-700 pt-3 space-y-2">
      {showScanner && (
        <BarcodeScanner
          onResult={food => { setShowScanner(false); selectResult(food) }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {!selected && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search food (e.g. paneer, roti, chicken...)"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                onFocus={() => { if (query.length < 2) setShowRecent(true) }}
                onBlur={() => setTimeout(() => setShowRecent(false), 150)}
                autoFocus
                className="w-full bg-slate-700 rounded-lg pl-9 pr-9 py-2.5 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {loading && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
              )}
              {query && !loading && (
                <button
                  onClick={() => { setQuery(''); setResults([]); setShowRecent(true) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="flex-shrink-0 w-10 flex items-center justify-center bg-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
              title="Scan barcode"
            >
              <ScanLine size={18} />
            </button>
          </div>

          {showRecent && query.length < 2 && recentFoods.length > 0 && (
            <div className="rounded-lg overflow-hidden border border-slate-700 max-h-56 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Recent
              </div>
              {recentFoods.map((food, i) => (
                <button
                  key={i}
                  onMouseDown={() => selectResult(recentFoodToResult(food))}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700 active:bg-slate-600 border-b border-slate-700/50 last:border-0 text-left"
                >
                  <div>
                    <div className="text-sm text-white leading-snug">{food.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {food.calories} kcal · P {food.protein}g
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-500 flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}

          {results.length > 0 && query.length >= 2 && (
            <div className="rounded-lg overflow-hidden border border-slate-700 max-h-56 overflow-y-auto">
              {(() => {
                const firstWebIdx = results.findIndex(r => r.source === 'web')
                const hasLocal = firstWebIdx > 0
                return results.map((r, i) => (
                  <div key={i}>
                    {hasLocal && i === firstWebIdx && (
                      <div className="px-3 py-1 bg-slate-700/40 text-xs text-slate-500 text-center tracking-wider">
                        — web results —
                      </div>
                    )}
                    <button
                      onClick={() => selectResult(r)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700 active:bg-slate-600 border-b border-slate-700/50 last:border-0 text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {r.isCustom && (
                          <Bookmark size={12} className="text-emerald-400 flex-shrink-0" fill="currentColor" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm text-white leading-snug truncate">{r.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {r.serving} · {r.calories} kcal · P {r.protein}g
                            {r.sourceLabel === 'Local' && <span className="ml-1 text-emerald-500">Local</span>}
                            {r.sourceLabel === 'USDA' && <span className="ml-1 text-blue-500">· USDA</span>}
                            {r.isCustom && <span className="ml-1 text-emerald-400">· Saved</span>}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-500 flex-shrink-0 ml-2" />
                    </button>
                  </div>
                ))
              })()}
            </div>
          )}

          {query.length >= 2 && results.length === 0 && !loading && (
            <p className="text-xs text-slate-500 text-center py-2">No results found</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <button onClick={onCancel} className="text-sm text-slate-500">Cancel</button>
            <button onClick={() => setMode('manual')} className="text-sm text-slate-400 hover:text-emerald-400">
              Enter manually →
            </button>
          </div>
        </>
      )}

      {selected && (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-white text-sm">{selected.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">per 100g: {Math.round(selected.per100.calories)} kcal</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 p-1">
              <X size={15} />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={() => setUnit('servings')}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${unit === 'servings' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Servings
              </button>
              <button
                onClick={() => setUnit('g')}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${unit === 'g' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Grams
              </button>
            </div>
            {unit === 'servings' ? (
              <div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setServings(s => Math.max(0.25, Math.round((s - 0.25) * 4) / 4))}
                    className="w-9 h-9 rounded-full bg-slate-700 text-white font-bold hover:bg-slate-600 flex-shrink-0"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={servings}
                    onChange={e => setServings(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => setServings(s => Math.round((s + 0.25) * 4) / 4)}
                    className="w-9 h-9 rounded-full bg-slate-700 text-white font-bold hover:bg-slate-600 flex-shrink-0"
                  >
                    +
                  </button>
                </div>
                <div className="text-xs text-slate-500 mt-1 text-center">
                  {selected.unitLabel
                    ? `${selected.unitLabel} = ${selected.defaultServing}g`
                    : `1 serving = ${selected.defaultServing}g`
                  } · {Math.round(effectiveGrams)}g total
                </div>
              </div>
            ) : (
              <input
                type="text"
                inputMode="decimal"
                value={servingG}
                onChange={e => setServingG(e.target.value.replace(/[^0-9.]/g, ''))}
                onFocus={e => e.target.select()}
                placeholder="0"
                className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            )}
          </div>

          {nutrition && (
            <div className="grid grid-cols-4 gap-1 bg-slate-700/50 rounded-lg p-3">
              {[
                { label: 'Cal', value: nutrition.calories, color: 'text-orange-400' },
                { label: 'Protein', value: `${nutrition.protein}g`, color: 'text-blue-400' },
                { label: 'Carbs', value: `${nutrition.carbs}g`, color: 'text-yellow-400' },
                { label: 'Fat', value: `${nutrition.fat}g`, color: 'text-pink-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <div className={`text-sm font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-700 rounded-lg text-slate-300 text-sm">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-2.5 bg-emerald-600 rounded-lg text-white text-sm font-semibold hover:bg-emerald-500"
            >
              Add to log
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
