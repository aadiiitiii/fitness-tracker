import { uuid, getCustomFoods } from '../../utils/storage'
import { INDIAN_FOODS, COMMON_FOODS, MEAL_TYPES } from './foodData'

export { MEAL_TYPES }

export function makeLog(date) {
  return {
    date,
    meals: MEAL_TYPES.map(name => ({ id: uuid(), name, items: [] })),
  }
}

export function makeItem(overrides = {}) {
  return { id: uuid(), name: '', calories: '', protein: '', carbs: '', fat: '', ...overrides }
}

export function mealCalories(meal) {
  return meal.items.reduce((s, i) => s + (Number(i.calories) || 0), 0)
}

export function sanitizeName(str) {
  return String(str).replace(/[^\x20-\x7E\u00A0-\u024F]/g, '').trim().slice(0, 200) || 'Unknown'
}

export function calcNutrition(food, grams) {
  const f = grams / 100
  return {
    calories: Math.round(food.per100.calories * f),
    protein: Math.round(food.per100.protein * f * 10) / 10,
    carbs: Math.round(food.per100.carbs * f * 10) / 10,
    fat: Math.round(food.per100.fat * f * 10) / 10,
  }
}

export function recentFoodToResult(food) {
  const cal = Number(food.calories) || 0
  const protein = Number(food.protein) || 0
  const carbs = Number(food.carbs) || 0
  const fat = Number(food.fat) || 0
  return {
    source: 'recent',
    sourceLabel: 'Recent',
    name: food.name,
    serving: '100g',
    calories: cal,
    protein,
    carbs,
    fat,
    per100: { calories: cal, protein, carbs, fat },
    defaultServing: 100,
  }
}

export function searchLocalFoods(query) {
  const q = query.toLowerCase()
  return [...INDIAN_FOODS, ...COMMON_FOODS].filter(f => f.name.toLowerCase().includes(q)).map(f => {
    const g = f.defaultServing
    return {
      source: 'local',
      sourceLabel: 'Indian',
      name: f.name,
      serving: `${g}g`,
      unitLabel: f.unitLabel || null,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      per100: {
        calories: (f.calories / g) * 100,
        protein: (f.protein / g) * 100,
        carbs: (f.carbs / g) * 100,
        fat: (f.fat / g) * 100,
      },
      defaultServing: g,
    }
  })
}

export function searchCustomFoods(query) {
  const customs = getCustomFoods()
  const q = query.toLowerCase()
  return customs.filter(f => f.name.toLowerCase().includes(q)).map(f => ({
    source: 'custom',
    sourceLabel: 'Custom',
    name: f.name,
    serving: f.serving || '100g',
    calories: Number(f.calories) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fat: Number(f.fat) || 0,
    per100: {
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
    },
    defaultServing: 100,
  }))
}

export async function searchOpenFoodFacts(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20&fields=product_name,serving_quantity,serving_size,nutriments&sort_by=unique_scans_n`
  const res = await fetch(url)
  const data = await res.json()
  return (data.products || [])
    .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'])
    .map(p => {
      const n = p.nutriments
      const g = p.serving_quantity || 100
      const factor = g / 100
      return {
        source: 'web',
        sourceLabel: 'OFF',
        name: sanitizeName(p.product_name),
        serving: `${g}g`,
        calories: Math.round((n['energy-kcal_100g'] || 0) * factor),
        protein: Math.round((n['proteins_100g'] || 0) * factor * 10) / 10,
        carbs: Math.round((n['carbohydrates_100g'] || 0) * factor * 10) / 10,
        fat: Math.round((n['fat_100g'] || 0) * factor * 10) / 10,
        per100: {
          calories: n['energy-kcal_100g'] || 0,
          protein: n['proteins_100g'] || 0,
          carbs: n['carbohydrates_100g'] || 0,
          fat: n['fat_100g'] || 0,
        },
        defaultServing: g,
      }
    })
}

export async function searchUSDA(query) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=15&dataType=Survey%20(FNDDS),SR%20Legacy,Foundation&api_key=DEMO_KEY`
  const res = await fetch(url)
  const data = await res.json()
  return (data.foods || [])
    .filter(f => f.description && f.foodNutrients?.length)
    .map(f => {
      function getNutrient(name) {
        const n = f.foodNutrients.find(n => n.nutrientName === name)
        return n?.value || 0
      }
      const cal = getNutrient('Energy')
      const protein = getNutrient('Protein')
      const carbs = getNutrient('Carbohydrate, by difference')
      const fat = getNutrient('Total lipid (fat)')
      if (!cal) return null
      const g = f.servingSize || 100
      const factor = g / 100
      return {
        source: 'web',
        sourceLabel: 'USDA',
        name: sanitizeName(f.description.replace(/,\s*raw$/i, '').replace(/,\s*NFS$/i, '')),
        serving: `${g}g`,
        calories: Math.round(cal * factor),
        protein: Math.round(protein * factor * 10) / 10,
        carbs: Math.round(carbs * factor * 10) / 10,
        fat: Math.round(fat * factor * 10) / 10,
        per100: { calories: cal, protein, carbs, fat },
        defaultServing: g,
      }
    })
    .filter(Boolean)
}

export async function lookupBarcode(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
  const data = await res.json()
  if (data.status !== 1 || !data.product) return null
  const p = data.product
  const n = p.nutriments || {}
  if (!n['energy-kcal_100g']) return null
  const g = p.serving_quantity || 100
  const factor = g / 100
  return {
    source: 'web',
    sourceLabel: 'Scanned',
    name: sanitizeName(p.product_name || p.abbreviated_product_name || 'Unknown product'),
    serving: `${g}g`,
    unitLabel: null,
    calories: Math.round((n['energy-kcal_100g'] || 0) * factor),
    protein: Math.round((n['proteins_100g'] || 0) * factor * 10) / 10,
    carbs: Math.round((n['carbohydrates_100g'] || 0) * factor * 10) / 10,
    fat: Math.round((n['fat_100g'] || 0) * factor * 10) / 10,
    per100: {
      calories: n['energy-kcal_100g'] || 0,
      protein: n['proteins_100g'] || 0,
      carbs: n['carbohydrates_100g'] || 0,
      fat: n['fat_100g'] || 0,
    },
    defaultServing: g,
  }
}

export const BARCODE_SUPPORTED = typeof window !== 'undefined' && 'BarcodeDetector' in window
