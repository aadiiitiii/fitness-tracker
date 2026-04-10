import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock supabase — storage functions fire-and-forget to Supabase; tests run offline
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          data: [],
        }),
      }),
    }),
  },
}))

import {
  uuid,
  getWorkoutForDate,
  saveWorkout,
  getFoodForDate,
  saveFoodLog,
  getRatingForDate,
  saveRating,
  getTargets,
  saveTargets,
  getWeightForDate,
  saveWeightEntry,
  getWaterForDate,
  saveWaterLog,
  getCustomFoods,
  saveCustomFood,
  getRecentFoods,
  addRecentFood,
  clearLocalData,
  exportAllData,
} from './storage'

beforeEach(() => {
  localStorage.clear()
})

// ── uuid ─────────────────────────────────────────────────────────────────────

describe('uuid', () => {
  it('returns a non-empty string', () => {
    expect(typeof uuid()).toBe('string')
    expect(uuid().length).toBeGreaterThan(0)
  })

  it('returns unique values', () => {
    expect(uuid()).not.toBe(uuid())
  })
})

// ── workouts ─────────────────────────────────────────────────────────────────

describe('workouts', () => {
  it('returns null for a date with no workout', () => {
    expect(getWorkoutForDate('2024-01-01')).toBeNull()
  })

  it('saves and retrieves a workout by date', () => {
    const workout = { date: '2024-01-01', exercises: [{ name: 'Squat', sets: [] }] }
    saveWorkout(workout)
    expect(getWorkoutForDate('2024-01-01')).toEqual(workout)
  })

  it('updates an existing workout for the same date', () => {
    const v1 = { date: '2024-01-01', exercises: [{ name: 'Squat', sets: [] }] }
    const v2 = { date: '2024-01-01', exercises: [{ name: 'Deadlift', sets: [] }] }
    saveWorkout(v1)
    saveWorkout(v2)
    expect(getWorkoutForDate('2024-01-01')).toEqual(v2)
  })

  it('keeps workouts for different dates separate', () => {
    const a = { date: '2024-01-01', exercises: [] }
    const b = { date: '2024-01-02', exercises: [{ name: 'Press', sets: [] }] }
    saveWorkout(a)
    saveWorkout(b)
    expect(getWorkoutForDate('2024-01-01')).toEqual(a)
    expect(getWorkoutForDate('2024-01-02')).toEqual(b)
  })
})

// ── food logs ─────────────────────────────────────────────────────────────────

describe('food logs', () => {
  it('returns null for a date with no log', () => {
    expect(getFoodForDate('2024-01-01')).toBeNull()
  })

  it('saves and retrieves a food log by date', () => {
    const log = { date: '2024-01-01', meals: [{ name: 'Breakfast', items: [] }] }
    saveFoodLog(log)
    expect(getFoodForDate('2024-01-01')).toEqual(log)
  })

  it('upserts food log for the same date', () => {
    const v1 = { date: '2024-01-01', meals: [] }
    const v2 = { date: '2024-01-01', meals: [{ name: 'Lunch', items: [{ name: 'Rice' }] }] }
    saveFoodLog(v1)
    saveFoodLog(v2)
    expect(getFoodForDate('2024-01-01')).toEqual(v2)
  })
})

// ── ratings ──────────────────────────────────────────────────────────────────

describe('ratings', () => {
  it('returns null for a date with no rating', () => {
    expect(getRatingForDate('2024-01-01')).toBeNull()
  })

  it('saves and retrieves a rating', () => {
    const rating = { date: '2024-01-01', workout: 8, nutrition: 7, energy: 6, sleep: 9, notes: 'good day' }
    saveRating(rating)
    expect(getRatingForDate('2024-01-01')).toEqual(rating)
  })

  it('upserts rating for the same date', () => {
    saveRating({ date: '2024-01-01', workout: 5, nutrition: 5, energy: 5, sleep: 5, notes: '' })
    const updated = { date: '2024-01-01', workout: 9, nutrition: 9, energy: 9, sleep: 9, notes: 'great' }
    saveRating(updated)
    expect(getRatingForDate('2024-01-01')).toEqual(updated)
  })
})

// ── targets ──────────────────────────────────────────────────────────────────

describe('targets', () => {
  it('returns default targets when none are saved', () => {
    const t = getTargets()
    expect(t.calories).toBe(2000)
    expect(t.protein).toBe(150)
    expect(t.carbs).toBe(200)
    expect(t.fat).toBe(65)
  })

  it('saves and retrieves custom targets', () => {
    const custom = { calories: 1800, protein: 130, carbs: 180, fat: 60 }
    saveTargets(custom)
    expect(getTargets()).toEqual(custom)
  })
})

// ── weight ───────────────────────────────────────────────────────────────────

describe('weight log', () => {
  it('returns null for a date with no entry', () => {
    expect(getWeightForDate('2024-01-01')).toBeNull()
  })

  it('saves and retrieves a weight entry', () => {
    saveWeightEntry({ date: '2024-01-01', kg: 70.5 })
    expect(getWeightForDate('2024-01-01')).toEqual({ date: '2024-01-01', kg: 70.5 })
  })

  it('upserts weight for the same date', () => {
    saveWeightEntry({ date: '2024-01-01', kg: 70 })
    saveWeightEntry({ date: '2024-01-01', kg: 71 })
    expect(getWeightForDate('2024-01-01')).toEqual({ date: '2024-01-01', kg: 71 })
  })
})

// ── water ────────────────────────────────────────────────────────────────────

describe('water log', () => {
  it('returns 0 glasses for a date with no entry', () => {
    expect(getWaterForDate('2024-01-01')).toEqual({ date: '2024-01-01', glasses: 0 })
  })

  it('saves and retrieves water intake', () => {
    saveWaterLog({ date: '2024-01-01', glasses: 6 })
    expect(getWaterForDate('2024-01-01')).toEqual({ date: '2024-01-01', glasses: 6 })
  })

  it('upserts water for the same date', () => {
    saveWaterLog({ date: '2024-01-01', glasses: 4 })
    saveWaterLog({ date: '2024-01-01', glasses: 8 })
    expect(getWaterForDate('2024-01-01')).toEqual({ date: '2024-01-01', glasses: 8 })
  })
})

// ── custom foods ─────────────────────────────────────────────────────────────

describe('custom foods', () => {
  it('starts empty', () => {
    expect(getCustomFoods()).toEqual([])
  })

  it('saves a custom food', () => {
    const food = { name: 'My Shake', calories: 300, protein: 30, carbs: 20, fat: 5, serving: '300ml' }
    saveCustomFood(food)
    expect(getCustomFoods()).toContainEqual(food)
  })

  it('does not duplicate foods with the same name (case-insensitive)', () => {
    const food = { name: 'My Shake', calories: 300, protein: 30, carbs: 20, fat: 5 }
    saveCustomFood(food)
    saveCustomFood({ ...food, name: 'my shake' })
    expect(getCustomFoods()).toHaveLength(1)
  })
})

// ── recent foods ──────────────────────────────────────────────────────────────

describe('recent foods', () => {
  it('starts empty', () => {
    expect(getRecentFoods()).toEqual([])
  })

  it('adds a food to recents', () => {
    const food = { name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 }
    addRecentFood(food)
    expect(getRecentFoods()[0]).toMatchObject({ name: 'Banana' })
  })

  it('deduplicates by name — keeps newest first', () => {
    addRecentFood({ name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 })
    addRecentFood({ name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0 })
    addRecentFood({ name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 })
    const recents = getRecentFoods()
    expect(recents[0].name).toBe('Banana')
    expect(recents.filter(f => f.name === 'Banana')).toHaveLength(1)
  })

  it('caps list at 10 items', () => {
    for (let i = 0; i < 15; i++) {
      addRecentFood({ name: `Food ${i}`, calories: i * 10, protein: 0, carbs: 0, fat: 0 })
    }
    expect(getRecentFoods()).toHaveLength(10)
  })
})

// ── clearLocalData ────────────────────────────────────────────────────────────

describe('clearLocalData', () => {
  it('removes all fitness tracker keys from localStorage', () => {
    saveWorkout({ date: '2024-01-01', exercises: [] })
    saveFoodLog({ date: '2024-01-01', meals: [] })
    saveRating({ date: '2024-01-01', workout: 5, nutrition: 5, energy: 5, sleep: 5, notes: '' })
    clearLocalData()
    expect(getWorkoutForDate('2024-01-01')).toBeNull()
    expect(getFoodForDate('2024-01-01')).toBeNull()
    expect(getRatingForDate('2024-01-01')).toBeNull()
  })
})

// ── exportAllData ─────────────────────────────────────────────────────────────

describe('exportAllData', () => {
  it('returns an object with all expected keys', () => {
    const data = exportAllData()
    expect(data).toHaveProperty('workouts')
    expect(data).toHaveProperty('food')
    expect(data).toHaveProperty('ratings')
    expect(data).toHaveProperty('targets')
    expect(data).toHaveProperty('weight')
    expect(data).toHaveProperty('water')
    expect(data).toHaveProperty('customFoods')
    expect(data).toHaveProperty('recentFoods')
  })

  it('includes saved data in the export', () => {
    const workout = { date: '2024-01-01', exercises: [] }
    saveWorkout(workout)
    const data = exportAllData()
    expect(data.workouts).toContainEqual(workout)
  })
})
