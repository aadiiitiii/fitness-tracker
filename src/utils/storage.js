import { supabase } from '../lib/supabase'

// Safe UUID — crypto.randomUUID() requires HTTPS; fall back to Math.random on HTTP
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const KEYS = {
  WORKOUTS: 'ft_workouts',
  FOOD: 'ft_food',
  RATINGS: 'ft_ratings',
  TARGETS: 'ft_targets',
  WEIGHT: 'ft_weight',
  WATER: 'ft_water',
  CUSTOM_FOODS: 'ft_custom_foods',
  RECENT_FOODS: 'ft_recent_foods',
}

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function loadObj(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultVal
    return JSON.parse(raw)
  } catch {
    return defaultVal
  }
}

function persist(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// Workouts — one document per day, containing multiple exercises
export function getWorkouts() {
  return load(KEYS.WORKOUTS)
}

export function getWorkoutForDate(date) {
  return load(KEYS.WORKOUTS).find(w => w.date === date) || null
}

export function saveWorkout(workout) {
  const all = load(KEYS.WORKOUTS)
  const idx = all.findIndex(w => w.date === workout.date)
  if (idx >= 0) all[idx] = workout
  else all.push(workout)
  persist(KEYS.WORKOUTS, all)
  syncWorkoutToSupabase(workout)
}

// Food — one document per day with meal buckets
export function getFoodLogs() {
  return load(KEYS.FOOD)
}

export function getFoodForDate(date) {
  return load(KEYS.FOOD).find(f => f.date === date) || null
}

export function saveFoodLog(log) {
  const all = load(KEYS.FOOD)
  const idx = all.findIndex(f => f.date === log.date)
  if (idx >= 0) all[idx] = log
  else all.push(log)
  persist(KEYS.FOOD, all)
  syncFoodToSupabase(log)
}

// Daily ratings
export function getRatings() {
  return load(KEYS.RATINGS)
}

export function getRatingForDate(date) {
  return load(KEYS.RATINGS).find(r => r.date === date) || null
}

export function saveRating(rating) {
  const all = load(KEYS.RATINGS)
  const idx = all.findIndex(r => r.date === rating.date)
  if (idx >= 0) all[idx] = rating
  else all.push(rating)
  persist(KEYS.RATINGS, all)
  syncRatingToSupabase(rating)
}

// Targets — daily calorie + macro goals
const DEFAULT_TARGETS = { calories: 2000, protein: 150, carbs: 200, fat: 65 }

export function getTargets() {
  return loadObj(KEYS.TARGETS, DEFAULT_TARGETS)
}

export function saveTargets(targets) {
  persist(KEYS.TARGETS, targets)
  syncTargetsToSupabase(targets)
}

// Weight log — [{date, kg}]
export function getWeightLog() {
  return load(KEYS.WEIGHT)
}

export function getWeightForDate(date) {
  return load(KEYS.WEIGHT).find(w => w.date === date) || null
}

export function saveWeightEntry({ date, kg }) {
  const all = load(KEYS.WEIGHT)
  const idx = all.findIndex(w => w.date === date)
  if (idx >= 0) all[idx] = { date, kg }
  else all.push({ date, kg })
  persist(KEYS.WEIGHT, all)
  syncWeightToSupabase({ date, kg })
}

// Water log — one entry per day {date, glasses}
export function getWaterForDate(date) {
  const all = load(KEYS.WATER)
  return all.find(w => w.date === date) || { date, glasses: 0 }
}

export function saveWaterLog({ date, glasses }) {
  const all = load(KEYS.WATER)
  const idx = all.findIndex(w => w.date === date)
  if (idx >= 0) all[idx] = { date, glasses }
  else all.push({ date, glasses })
  persist(KEYS.WATER, all)
  syncWaterToSupabase({ date, glasses })
}

// Custom foods
export function getCustomFoods() {
  return load(KEYS.CUSTOM_FOODS)
}

export function saveCustomFood(food) {
  const all = load(KEYS.CUSTOM_FOODS)
  const exists = all.some(f => f.name.toLowerCase() === food.name.toLowerCase())
  if (!exists) {
    all.push(food)
    persist(KEYS.CUSTOM_FOODS, all)
    syncCustomFoodToSupabase(food)
  }
}

export function deleteCustomFood(name) {
  const all = load(KEYS.CUSTOM_FOODS).filter(f => f.name.toLowerCase() !== name.toLowerCase())
  persist(KEYS.CUSTOM_FOODS, all)
}

// Recent foods — max 10, most recent first, deduped by name
export function getRecentFoods() {
  return load(KEYS.RECENT_FOODS)
}

export function addRecentFood(food) {
  const all = load(KEYS.RECENT_FOODS)
  const filtered = all.filter(f => f.name.toLowerCase() !== food.name.toLowerCase())
  const updated = [food, ...filtered].slice(0, 10)
  persist(KEYS.RECENT_FOODS, updated)
  syncRecentFoodsToSupabase(updated)
}

// Export all data as a single object
export function exportAllData() {
  return {
    workouts: getWorkouts(),
    food: getFoodLogs(),
    ratings: getRatings(),
    targets: getTargets(),
    weight: getWeightLog(),
    water: load(KEYS.WATER),
    customFoods: getCustomFoods(),
    recentFoods: getRecentFoods(),
  }
}

// ── Supabase sync helpers (fire-and-forget, internal) ────────────────────

// Dispatch a custom event so App.jsx can show a sync error banner
function emitSyncError() {
  window.dispatchEvent(new CustomEvent('supabase-sync-error'))
}

// Uses getSession() — reads cached token, no network call
async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id || null
}

async function syncWorkoutToSupabase(workout) {
  const uid = await getUserId(); if (!uid) return
  const { error } = await supabase.from('workouts').upsert({ user_id: uid, date: workout.date, exercises: workout.exercises }, { onConflict: 'user_id,date' })
  if (error) emitSyncError()
}

async function syncFoodToSupabase(log) {
  const uid = await getUserId(); if (!uid) return
  const { error } = await supabase.from('food_logs').upsert({ user_id: uid, date: log.date, meals: log.meals }, { onConflict: 'user_id,date' })
  if (error) emitSyncError()
}

async function syncRatingToSupabase(rating) {
  const uid = await getUserId(); if (!uid) return
  const { date, workout, nutrition, energy, sleep, notes } = rating
  const { error } = await supabase.from('ratings').upsert({ user_id: uid, date, workout, nutrition, energy, sleep, notes }, { onConflict: 'user_id,date' })
  if (error) emitSyncError()
}

async function syncWeightToSupabase(entry) {
  const uid = await getUserId(); if (!uid) return
  const { error } = await supabase.from('weight_log').upsert({ user_id: uid, date: entry.date, kg: entry.kg }, { onConflict: 'user_id,date' })
  if (error) emitSyncError()
}

async function syncWaterToSupabase(entry) {
  const uid = await getUserId(); if (!uid) return
  const { error } = await supabase.from('water_log').upsert({ user_id: uid, date: entry.date, glasses: entry.glasses }, { onConflict: 'user_id,date' })
  if (error) emitSyncError()
}

async function syncTargetsToSupabase(t) {
  const uid = await getUserId(); if (!uid) return
  const { error } = await supabase.from('targets').upsert({ user_id: uid, ...t }, { onConflict: 'user_id' })
  if (error) emitSyncError()
}

async function syncCustomFoodToSupabase(food) {
  const uid = await getUserId(); if (!uid) return
  const { error } = await supabase.from('custom_foods').upsert({ user_id: uid, ...food }, { onConflict: 'user_id,name' })
  if (error) emitSyncError()
}

async function syncRecentFoodsToSupabase(foods) {
  const uid = await getUserId(); if (!uid) return
  const { error } = await supabase.from('recent_foods').upsert({ user_id: uid, foods }, { onConflict: 'user_id' })
  if (error) emitSyncError()
}

// Upload all local localStorage data to Supabase (first-login migration).
// Each item is tried independently so one bad row doesn't block the rest.
async function pushLocalToSupabase(uid) {
  const safe = async (promise) => { try { await promise } catch {} }

  const localWorkouts = load(KEYS.WORKOUTS)
  const localFood = load(KEYS.FOOD)
  const localRatings = load(KEYS.RATINGS)
  const localWeight = load(KEYS.WEIGHT)
  const localWater = load(KEYS.WATER)
  const localTargets = loadObj(KEYS.TARGETS, null)
  const localCustomFoods = load(KEYS.CUSTOM_FOODS)
  const localRecentFoods = load(KEYS.RECENT_FOODS)

  await Promise.all([
    ...localWorkouts.map(w => safe(supabase.from('workouts').upsert({ user_id: uid, date: w.date, exercises: w.exercises }, { onConflict: 'user_id,date' }))),
    ...localFood.map(f => safe(supabase.from('food_logs').upsert({ user_id: uid, date: f.date, meals: f.meals }, { onConflict: 'user_id,date' }))),
    ...localRatings.map(r => safe(supabase.from('ratings').upsert({ user_id: uid, date: r.date, workout: r.workout, nutrition: r.nutrition, energy: r.energy, sleep: r.sleep, notes: r.notes }, { onConflict: 'user_id,date' }))),
    ...localWeight.map(w => safe(supabase.from('weight_log').upsert({ user_id: uid, date: w.date, kg: w.kg }, { onConflict: 'user_id,date' }))),
    ...localWater.map(w => safe(supabase.from('water_log').upsert({ user_id: uid, date: w.date, glasses: w.glasses }, { onConflict: 'user_id,date' }))),
    localTargets ? safe(supabase.from('targets').upsert({ user_id: uid, ...localTargets }, { onConflict: 'user_id' })) : Promise.resolve(),
    ...localCustomFoods.map(f => safe(supabase.from('custom_foods').upsert({ user_id: uid, ...f }, { onConflict: 'user_id,name' }))),
    localRecentFoods.length ? safe(supabase.from('recent_foods').upsert({ user_id: uid, foods: localRecentFoods }, { onConflict: 'user_id' })) : Promise.resolve(),
  ])
}

// Pull all data from Supabase into localStorage (called after login).
// If Supabase is empty (first login), uploads local data instead.
export async function pullFromSupabase() {
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id; if (!uid) return

  const [workouts, foodLogs, ratingsData, weightData, waterData, targetsData, customFoodsData, recentData] = await Promise.all([
    supabase.from('workouts').select('date,exercises').eq('user_id', uid),
    supabase.from('food_logs').select('date,meals').eq('user_id', uid),
    supabase.from('ratings').select('date,workout,nutrition,energy,sleep,notes').eq('user_id', uid),
    supabase.from('weight_log').select('date,kg').eq('user_id', uid),
    supabase.from('water_log').select('date,glasses').eq('user_id', uid),
    supabase.from('targets').select('calories,protein,carbs,fat').eq('user_id', uid).maybeSingle(),
    supabase.from('custom_foods').select('name,calories,protein,carbs,fat,serving').eq('user_id', uid),
    supabase.from('recent_foods').select('foods').eq('user_id', uid).maybeSingle(),
  ])

  const supabaseIsEmpty = !workouts.data?.length && !foodLogs.data?.length && !ratingsData.data?.length
  const localHasData = load(KEYS.WORKOUTS).length > 0 || load(KEYS.FOOD).length > 0

  if (supabaseIsEmpty && localHasData) {
    // First login — push existing local data up to Supabase
    await pushLocalToSupabase(uid)
    return
  }

  // Otherwise pull Supabase data into localStorage
  if (workouts.data?.length) persist(KEYS.WORKOUTS, workouts.data)
  if (foodLogs.data?.length) persist(KEYS.FOOD, foodLogs.data)
  if (ratingsData.data?.length) persist(KEYS.RATINGS, ratingsData.data)
  if (weightData.data?.length) persist(KEYS.WEIGHT, weightData.data)
  if (waterData.data?.length) persist(KEYS.WATER, waterData.data)
  if (targetsData.data) persist(KEYS.TARGETS, targetsData.data)
  if (customFoodsData.data?.length) persist(KEYS.CUSTOM_FOODS, customFoodsData.data)
  if (recentData.data?.foods?.length) persist(KEYS.RECENT_FOODS, recentData.data.foods)
}

// Clear all local data (called on logout)
export function clearLocalData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
