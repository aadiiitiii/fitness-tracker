import { useState, useEffect } from 'react'
import { Plus, Trash2, Settings2, Pencil } from 'lucide-react'

function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
import { getFoodForDate, saveFoodLog, getTargets, saveTargets, uuid } from '../utils/storage'
import { makeLog, mealCalories } from './food/foodApi'
import AddFoodForm from './food/AddFoodForm'
import WaterTracker from './food/WaterTracker'

function MacroBadge({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${color}`}>{Math.round(value)}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

export default function FoodTab({ date }) {
  const [log, setLog] = useState(() => getFoodForDate(date) || makeLog(date))
  const [addingTo, setAddingTo] = useState(null)
  const [targets, setTargets] = useState(() => getTargets())
  const [showTargetForm, setShowTargetForm] = useState(false)
  const [draftTargets, setDraftTargets] = useState(() => getTargets())
  const [editingItem, setEditingItem] = useState(null) // { mealName, itemId, draft }

  useEffect(() => {
    setLog(getFoodForDate(date) || makeLog(date))
    setAddingTo(null)
  }, [date])

  const totals = log.meals.reduce(
    (acc, meal) => {
      meal.items.forEach(i => {
        acc.calories += Number(i.calories) || 0
        acc.protein += Number(i.protein) || 0
        acc.carbs += Number(i.carbs) || 0
        acc.fat += Number(i.fat) || 0
      })
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const today = localDateStr(new Date())
  const todayHasFood = date === today && log.meals.some(m => m.items.length > 0)
  const yesterdayStr = (() => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return localDateStr(d)
  })()
  const yesterdayLog = getFoodForDate(yesterdayStr)
  const showCopyYesterday = date === today && !todayHasFood && yesterdayLog && yesterdayLog.meals.some(m => m.items.length > 0)

  function handleCopyYesterday() {
    const copied = {
      ...log,
      meals: yesterdayLog.meals.map(m => ({
        ...m,
        items: m.items.map(item => ({ ...item, id: uuid() })),
      })),
    }
    setLog(copied)
    saveFoodLog(copied)
  }

  function handleAddItem(mealName, item) {
    const updated = {
      ...log,
      meals: log.meals.map(m =>
        m.name === mealName ? { ...m, items: [...m.items, item] } : m
      ),
    }
    setLog(updated)
    saveFoodLog(updated)
    setAddingTo(null)
  }

  function handleDeleteItem(mealName, itemId) {
    const updated = {
      ...log,
      meals: log.meals.map(m =>
        m.name === mealName ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m
      ),
    }
    setLog(updated)
    saveFoodLog(updated)
  }

  function handleSaveEdit() {
    if (!editingItem) return
    const { mealName, itemId, draft } = editingItem
    const updated = {
      ...log,
      meals: log.meals.map(m =>
        m.name === mealName
          ? { ...m, items: m.items.map(i => i.id === itemId ? { ...i, ...draft } : i) }
          : m
      ),
    }
    setLog(updated)
    saveFoodLog(updated)
    setEditingItem(null)
  }

  function handleSaveTargets() {
    saveTargets(draftTargets)
    setTargets(draftTargets)
    setShowTargetForm(false)
  }

  return (
    <div className="p-4 space-y-3 pb-6">
      {/* Daily Totals Card */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Totals</p>
          <div className="flex items-center gap-2">
            {showCopyYesterday && (
              <button
                onClick={handleCopyYesterday}
                className="text-xs text-slate-400 hover:text-emerald-400 border border-slate-600 hover:border-emerald-700 rounded-full px-2 py-0.5 transition-colors"
              >
                Copy yesterday
              </button>
            )}
            <button
              onClick={() => { setDraftTargets(targets); setShowTargetForm(v => !v) }}
              className={`p-1 rounded-lg transition-colors ${showTargetForm ? 'text-emerald-400 bg-emerald-900/40' : 'text-slate-500 hover:text-slate-300'}`}
              title="Set daily targets"
            >
              <Settings2 size={15} />
            </button>
          </div>
        </div>

        {showTargetForm && (
          <div className="mb-3 p-3 bg-slate-700/50 rounded-lg space-y-2">
            <p className="text-xs text-slate-400 font-medium">Daily Targets</p>
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
                    value={draftTargets[key]}
                    onChange={e => setDraftTargets(t => ({ ...t, [key]: Number(e.target.value) || 0 }))}
                    className={`w-full bg-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 ${ring}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowTargetForm(false)}
                className="flex-1 py-1.5 bg-slate-700 rounded-lg text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTargets}
                className="flex-1 py-1.5 bg-emerald-600 rounded-lg text-white text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">{Math.round(totals.calories)}</div>
            <div className="text-xs text-slate-500 mt-0.5">kcal</div>
          </div>
          <div className="w-px bg-slate-700" />
          <MacroBadge label="Protein (g)" value={totals.protein} color="text-blue-400" />
          <div className="w-px bg-slate-700" />
          <MacroBadge label="Carbs (g)" value={totals.carbs} color="text-yellow-400" />
          <div className="w-px bg-slate-700" />
          <MacroBadge label="Fat (g)" value={totals.fat} color="text-pink-400" />
        </div>

        <div className="mt-3 space-y-2">
          {[
            { key: 'calories', label: 'Calories', value: totals.calories, target: targets.calories, barColor: 'bg-orange-400', textColor: 'text-orange-400' },
            { key: 'protein', label: 'Protein', value: totals.protein, target: targets.protein, barColor: 'bg-blue-400', textColor: 'text-blue-400' },
            { key: 'carbs', label: 'Carbs', value: totals.carbs, target: targets.carbs, barColor: 'bg-yellow-400', textColor: 'text-yellow-400' },
            { key: 'fat', label: 'Fat', value: totals.fat, target: targets.fat, barColor: 'bg-pink-400', textColor: 'text-pink-400' },
          ].map(({ key, label, value, target, barColor, textColor }) => {
            const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{label}</span>
                  <span className={textColor}>{Math.round(value)} / {target}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <WaterTracker date={date} />

      {log.meals.map(meal => (
        <div key={meal.name} className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-white">{meal.name}</h3>
            <span className="text-xs text-slate-400 font-medium">{mealCalories(meal)} kcal</span>
          </div>

          {meal.items.map(item => {
            const isEditing = editingItem?.mealName === meal.name && editingItem?.itemId === item.id
            return (
              <div key={item.id} className="border-t border-slate-700/70">
                {isEditing ? (
                  <div className="py-2 space-y-2">
                    <div className="text-xs text-slate-400 font-medium">{item.name}</div>
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
                            value={editingItem.draft[key]}
                            onChange={e => setEditingItem(ei => ({ ...ei, draft: { ...ei.draft, [key]: e.target.value } }))}
                            className={`w-full bg-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 ${ring}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingItem(null)} className="flex-1 py-1.5 bg-slate-700 rounded-lg text-slate-300 text-xs">Cancel</button>
                      <button onClick={handleSaveEdit} className="flex-1 py-1.5 bg-emerald-600 rounded-lg text-white text-xs font-semibold">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between py-2">
                    <div>
                      <div className="text-sm text-white">
                        {item.name}
                        {item.grams ? <span className="text-xs text-slate-400 ml-1">· {item.grams}g</span> : null}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {item.calories} kcal
                        {item.protein ? ` · P ${item.protein}g` : ''}
                        {item.carbs ? ` · C ${item.carbs}g` : ''}
                        {item.fat ? ` · F ${item.fat}g` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => setEditingItem({
                          mealName: meal.name,
                          itemId: item.id,
                          draft: { calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat },
                        })}
                        className="text-slate-500 hover:text-emerald-400 p-1"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(meal.name, item.id)}
                        className="text-slate-500 hover:text-red-400 p-1 -mr-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {addingTo === meal.name ? (
            <AddFoodForm
              onSave={item => handleAddItem(meal.name, item)}
              onCancel={() => setAddingTo(null)}
            />
          ) : (
            <button
              onClick={() => setAddingTo(meal.name)}
              className="mt-2 text-sm text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <Plus size={14} /> Add food
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
