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
}

// Targets — daily calorie + macro goals
const DEFAULT_TARGETS = { calories: 2000, protein: 150, carbs: 200, fat: 65 }

export function getTargets() {
  return loadObj(KEYS.TARGETS, DEFAULT_TARGETS)
}

export function saveTargets(targets) {
  persist(KEYS.TARGETS, targets)
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
