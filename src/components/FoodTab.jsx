import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Search, Loader2, X, ChevronRight, Settings2, Droplets, Bookmark, ScanLine, Pencil } from 'lucide-react'
import {
  getFoodForDate,
  saveFoodLog,
  getTargets,
  saveTargets,
  getWaterForDate,
  saveWaterLog,
  getCustomFoods,
  saveCustomFood,
  getRecentFoods,
  addRecentFood,
  uuid,
} from '../utils/storage'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

// Common Indian foods — calories/protein/carbs/fat are per defaultServing grams
// unitLabel: human-readable name for 1 serving (shown instead of "1 serving = Xg")
const INDIAN_FOODS = [
  { name: 'Roti / Chapati',           defaultServing: 40,  unitLabel: '1 roti',              calories: 120, protein: 3,    carbs: 18,   fat: 4    },
  { name: 'Paratha (plain)',           defaultServing: 80,  unitLabel: '1 paratha',           calories: 260, protein: 5,    carbs: 32,   fat: 12   },
  { name: 'Paratha (aloo)',            defaultServing: 100, unitLabel: '1 paratha',           calories: 310, protein: 6,    carbs: 42,   fat: 13   },
  { name: 'Naan',                      defaultServing: 90,  unitLabel: '1 naan',              calories: 270, protein: 8,    carbs: 45,   fat: 6    },
  { name: 'Basmati Rice (cooked)',     defaultServing: 180, calories: 240, protein: 5,    carbs: 52,   fat: 0.5  },
  { name: 'Dal (yellow / moong)',      defaultServing: 240, unitLabel: '1 bowl',              calories: 170, protein: 11,   carbs: 28,   fat: 2    },
  { name: 'Dal Makhani',               defaultServing: 240, unitLabel: '1 bowl',              calories: 230, protein: 11,   carbs: 28,   fat: 8    },
  { name: 'Chana Masala',              defaultServing: 240, unitLabel: '1 bowl',              calories: 270, protein: 14,   carbs: 40,   fat: 7    },
  { name: 'Rajma (kidney beans curry)',defaultServing: 240, unitLabel: '1 bowl',              calories: 250, protein: 13,   carbs: 38,   fat: 5    },
  { name: 'Paneer (raw)',              defaultServing: 100, calories: 265, protein: 18,   carbs: 3,    fat: 20   },
  { name: 'Paneer Butter Masala',      defaultServing: 240, unitLabel: '1 bowl',              calories: 350, protein: 15,   carbs: 12,   fat: 28   },
  { name: 'Palak Paneer',              defaultServing: 240, unitLabel: '1 bowl',              calories: 280, protein: 14,   carbs: 10,   fat: 21   },
  { name: 'Chicken Curry',             defaultServing: 240, unitLabel: '1 bowl',              calories: 300, protein: 28,   carbs: 8,    fat: 18   },
  { name: 'Chicken Tikka Masala',      defaultServing: 240, unitLabel: '1 bowl',              calories: 320, protein: 30,   carbs: 12,   fat: 18   },
  { name: 'Butter Chicken',            defaultServing: 240, unitLabel: '1 bowl',              calories: 340, protein: 28,   carbs: 14,   fat: 20   },
  { name: 'Mutton Curry',              defaultServing: 240, unitLabel: '1 bowl',              calories: 380, protein: 32,   carbs: 6,    fat: 26   },
  { name: 'Fish Curry',                defaultServing: 240, unitLabel: '1 bowl',              calories: 220, protein: 24,   carbs: 8,    fat: 10   },
  { name: 'Samosa (baked)',            defaultServing: 60,  unitLabel: '1 samosa',            calories: 130, protein: 3,    carbs: 18,   fat: 6    },
  { name: 'Samosa (fried)',            defaultServing: 60,  unitLabel: '1 samosa',            calories: 175, protein: 3,    carbs: 20,   fat: 9    },
  { name: 'Idli',                      defaultServing: 80,  unitLabel: '2 idlis',             calories: 130, protein: 4,    carbs: 26,   fat: 1    },
  { name: 'Dosa (plain)',              defaultServing: 80,  unitLabel: '1 dosa',              calories: 170, protein: 4,    carbs: 30,   fat: 4    },
  { name: 'Masala Dosa',              defaultServing: 150, unitLabel: '1 dosa',              calories: 300, protein: 7,    carbs: 50,   fat: 9    },
  { name: 'Poha',                      defaultServing: 160, unitLabel: '1 plate',             calories: 250, protein: 4,    carbs: 45,   fat: 6    },
  { name: 'Upma',                      defaultServing: 200, unitLabel: '1 plate',             calories: 220, protein: 5,    carbs: 38,   fat: 5    },
  { name: 'Biryani (chicken)',         defaultServing: 250, unitLabel: '1 plate',             calories: 400, protein: 20,   carbs: 55,   fat: 12   },
  { name: 'Biryani (veg)',             defaultServing: 250, unitLabel: '1 plate',             calories: 310, protein: 8,    carbs: 58,   fat: 7    },
  { name: 'Aloo Gobi',                 defaultServing: 200, unitLabel: '1 bowl',              calories: 180, protein: 4,    carbs: 28,   fat: 7    },
  { name: 'Bhindi Masala',             defaultServing: 200, unitLabel: '1 bowl',              calories: 160, protein: 4,    carbs: 18,   fat: 9    },
  { name: 'Chole Bhature',             defaultServing: 400, unitLabel: '1 plate',             calories: 620, protein: 18,   carbs: 88,   fat: 22   },
  { name: 'Pav Bhaji',                 defaultServing: 350, unitLabel: '1 plate',             calories: 500, protein: 12,   carbs: 72,   fat: 18   },
  { name: 'Lassi (sweet)',             defaultServing: 250, unitLabel: '1 glass',             calories: 190, protein: 6,    carbs: 28,   fat: 6    },
  { name: 'Lassi (salted)',            defaultServing: 250, unitLabel: '1 glass',             calories: 120, protein: 6,    carbs: 12,   fat: 5    },
  { name: 'Chai (with milk & sugar)', defaultServing: 150, unitLabel: '1 cup',               calories: 60,  protein: 2,    carbs: 8,    fat: 2    },
  { name: 'Raita',                     defaultServing: 120, unitLabel: '1 bowl',              calories: 70,  protein: 3,    carbs: 6,    fat: 3    },
  { name: 'Khichdi',                   defaultServing: 220, unitLabel: '1 bowl',              calories: 280, protein: 10,   carbs: 50,   fat: 4    },
  { name: 'Egg (boiled)',              defaultServing: 50,  unitLabel: '1 egg',               calories: 78,  protein: 6,    carbs: 0.6,  fat: 5    },
  { name: 'Egg Bhurji',               defaultServing: 120, unitLabel: '2 eggs',              calories: 180, protein: 13,   carbs: 4,    fat: 13   },
  { name: 'Dahi (curd / yogurt)',      defaultServing: 240, unitLabel: '1 bowl',              calories: 150, protein: 8,    carbs: 12,   fat: 8    },
  { name: 'Halwa (atta)',              defaultServing: 100, unitLabel: '1 serving',           calories: 350, protein: 5,    carbs: 48,   fat: 16   },
  { name: 'Kheer',                     defaultServing: 200, unitLabel: '1 bowl',              calories: 280, protein: 7,    carbs: 44,   fat: 9    },
  { name: 'Gulab Jamun',              defaultServing: 80,  unitLabel: '2 pieces',            calories: 290, protein: 4,    carbs: 48,   fat: 10   },
  { name: 'Banana',                    defaultServing: 120, unitLabel: '1 banana (medium)',   calories: 105, protein: 1,    carbs: 27,   fat: 0.3  },
  { name: 'Apple',                     defaultServing: 180, unitLabel: '1 apple (medium)',    calories: 95,  protein: 0.5,  carbs: 25,   fat: 0.3  },
  { name: 'Mango',                     defaultServing: 165, unitLabel: '1 cup sliced',        calories: 107, protein: 1,    carbs: 28,   fat: 0.4  },
  { name: 'Whey Protein (scoop)',                       defaultServing: 30,  unitLabel: '1 scoop', calories: 120, protein: 24,   carbs: 3,    fat: 2    },
  { name: 'ON Gold Standard Whey',                      defaultServing: 30,  unitLabel: '1 scoop', calories: 120, protein: 24,   carbs: 3,    fat: 1    },
  { name: 'ON Gold Standard Whey (Double Rich Choc)',   defaultServing: 31,  unitLabel: '1 scoop', calories: 120, protein: 24,   carbs: 4,    fat: 1.5  },
]

// Common whole foods — values per defaultServing grams (same structure as INDIAN_FOODS)
const COMMON_FOODS = [
  // --- Vegetables ---
  { name: 'Broccoli',                  defaultServing: 100, calories: 34,  protein: 2.8,  carbs: 6.6,  fat: 0.4 },
  { name: 'Spinach',                   defaultServing: 100, calories: 23,  protein: 2.9,  carbs: 3.6,  fat: 0.4 },
  { name: 'Cauliflower',               defaultServing: 100, calories: 25,  protein: 1.9,  carbs: 5.0,  fat: 0.3 },
  { name: 'Carrot',                    defaultServing: 100, calories: 41,  protein: 0.9,  carbs: 9.6,  fat: 0.2 },
  { name: 'Tomato',                    defaultServing: 100, calories: 18,  protein: 0.9,  carbs: 3.9,  fat: 0.2 },
  { name: 'Onion',                     defaultServing: 100, calories: 40,  protein: 1.1,  carbs: 9.3,  fat: 0.1 },
  { name: 'Potato (boiled)',           defaultServing: 100, calories: 87,  protein: 1.9,  carbs: 20.0, fat: 0.1 },
  { name: 'Sweet Potato (baked)',      defaultServing: 100, calories: 90,  protein: 2.0,  carbs: 21.0, fat: 0.1 },
  { name: 'Cucumber',                  defaultServing: 100, calories: 16,  protein: 0.7,  carbs: 3.6,  fat: 0.1 },
  { name: 'Bell Pepper',               defaultServing: 100, calories: 31,  protein: 1.0,  carbs: 7.0,  fat: 0.3 },
  { name: 'Cabbage',                   defaultServing: 100, calories: 25,  protein: 1.3,  carbs: 5.8,  fat: 0.1 },
  { name: 'Green Peas',                defaultServing: 100, calories: 81,  protein: 5.4,  carbs: 14.5, fat: 0.4 },
  { name: 'Sweet Corn',                defaultServing: 100, calories: 96,  protein: 3.4,  carbs: 21.0, fat: 1.5 },
  { name: 'Mushroom',                  defaultServing: 100, calories: 22,  protein: 3.1,  carbs: 3.3,  fat: 0.3 },
  { name: 'Zucchini',                  defaultServing: 100, calories: 17,  protein: 1.2,  carbs: 3.1,  fat: 0.3 },
  { name: 'Green Beans',               defaultServing: 100, calories: 31,  protein: 1.8,  carbs: 7.0,  fat: 0.1 },
  { name: 'Kale',                      defaultServing: 100, calories: 49,  protein: 4.3,  carbs: 8.8,  fat: 0.9 },
  { name: 'Beetroot',                  defaultServing: 100, calories: 43,  protein: 1.6,  carbs: 10.0, fat: 0.2 },
  { name: 'Pumpkin',                   defaultServing: 100, calories: 26,  protein: 1.0,  carbs: 6.5,  fat: 0.1 },

  // --- Fruits ---
  { name: 'Orange',                    defaultServing: 130, unitLabel: '1 orange (medium)', calories: 61,  protein: 1.2,  carbs: 15.4, fat: 0.2 },
  { name: 'Grapes',                    defaultServing: 100, calories: 69,  protein: 0.7,  carbs: 18.0, fat: 0.2 },
  { name: 'Watermelon',               defaultServing: 100, calories: 30,  protein: 0.6,  carbs: 7.6,  fat: 0.2 },
  { name: 'Strawberry',               defaultServing: 100, calories: 32,  protein: 0.7,  carbs: 7.7,  fat: 0.3 },
  { name: 'Kiwi',                      defaultServing: 70,  unitLabel: '1 kiwi',           calories: 43,  protein: 0.8,  carbs: 10.1, fat: 0.4 },
  { name: 'Pineapple',                 defaultServing: 100, calories: 50,  protein: 0.5,  carbs: 13.0, fat: 0.1 },
  { name: 'Papaya',                    defaultServing: 100, calories: 43,  protein: 0.5,  carbs: 11.0, fat: 0.3 },
  { name: 'Pomegranate',              defaultServing: 100, calories: 83,  protein: 1.7,  carbs: 19.0, fat: 1.2 },
  { name: 'Guava',                     defaultServing: 100, unitLabel: '1 guava (medium)', calories: 68,  protein: 2.6,  carbs: 14.0, fat: 1.0 },
  { name: 'Pear',                      defaultServing: 180, unitLabel: '1 pear (medium)', calories: 101, protein: 0.7,  carbs: 27.1, fat: 0.2 },
  { name: 'Peach',                     defaultServing: 150, unitLabel: '1 peach',         calories: 59,  protein: 1.4,  carbs: 14.3, fat: 0.4 },
  { name: 'Blueberries',              defaultServing: 100, calories: 57,  protein: 0.7,  carbs: 14.5, fat: 0.3 },
  { name: 'Avocado',                   defaultServing: 100, calories: 160, protein: 2.0,  carbs: 9.0,  fat: 15.0 },

  // --- Proteins (meat / fish) ---
  { name: 'Chicken Breast (cooked)',   defaultServing: 100, calories: 165, protein: 31.0, carbs: 0.0,  fat: 3.6 },
  { name: 'Chicken Breast (raw)',      defaultServing: 100, calories: 120, protein: 22.0, carbs: 0.0,  fat: 2.6 },
  { name: 'Chicken Thigh (cooked)',    defaultServing: 100, calories: 209, protein: 26.0, carbs: 0.0,  fat: 11.0 },
  { name: 'Salmon',                    defaultServing: 100, calories: 208, protein: 20.0, carbs: 0.0,  fat: 13.0 },
  { name: 'Tuna (canned in water)',    defaultServing: 100, calories: 116, protein: 25.5, carbs: 0.0,  fat: 1.0 },
  { name: 'Shrimp (cooked)',           defaultServing: 100, calories: 99,  protein: 24.0, carbs: 0.2,  fat: 0.3 },
  { name: 'Ground Beef (lean)',        defaultServing: 100, calories: 215, protein: 26.0, carbs: 0.0,  fat: 12.0 },

  // --- Eggs & Dairy ---
  { name: 'Egg (whole)',               defaultServing: 50,  unitLabel: '1 egg',           calories: 78,  protein: 6.3,  carbs: 0.6,  fat: 5.3 },
  { name: 'Egg White',                 defaultServing: 33,  unitLabel: '1 egg white',     calories: 17,  protein: 3.6,  carbs: 0.2,  fat: 0.1 },
  { name: 'Greek Yogurt (plain)',      defaultServing: 200, unitLabel: '1 cup',           calories: 130, protein: 22.0, carbs: 9.0,  fat: 0.7 },
  { name: 'Cottage Cheese',            defaultServing: 100, calories: 98,  protein: 11.0, carbs: 3.4,  fat: 4.3 },
  { name: 'Cheddar Cheese',            defaultServing: 100, calories: 402, protein: 25.0, carbs: 1.3,  fat: 33.0 },
  { name: 'Mozzarella',               defaultServing: 100, calories: 280, protein: 28.0, carbs: 3.1,  fat: 17.0 },
  { name: 'Milk (whole)',              defaultServing: 240, unitLabel: '1 cup',           calories: 149, protein: 8.0,  carbs: 11.4, fat: 8.0 },
  { name: 'Milk (skim)',               defaultServing: 240, unitLabel: '1 cup',           calories: 83,  protein: 8.3,  carbs: 12.2, fat: 0.2 },

  // --- Grains & Carbs ---
  { name: 'Oats (dry)',                defaultServing: 40,  unitLabel: '½ cup dry',       calories: 155, protein: 5.4,  carbs: 27.9, fat: 2.7 },
  { name: 'Oatmeal (cooked)',          defaultServing: 240, unitLabel: '1 bowl',          calories: 166, protein: 5.9,  carbs: 28.1, fat: 3.6 },
  { name: 'White Rice (cooked)',       defaultServing: 180, unitLabel: '1 cup',           calories: 234, protein: 4.3,  carbs: 51.8, fat: 0.4 },
  { name: 'Brown Rice (cooked)',       defaultServing: 180, unitLabel: '1 cup',           calories: 218, protein: 4.5,  carbs: 45.8, fat: 1.6 },
  { name: 'Quinoa (cooked)',           defaultServing: 180, unitLabel: '1 cup',           calories: 222, protein: 8.1,  carbs: 39.4, fat: 3.5 },
  { name: 'Pasta (cooked)',            defaultServing: 140, unitLabel: '1 cup',           calories: 220, protein: 8.1,  carbs: 43.2, fat: 1.3 },
  { name: 'Whole Wheat Bread',         defaultServing: 30,  unitLabel: '1 slice',         calories: 69,  protein: 3.6,  carbs: 12.9, fat: 1.1 },
  { name: 'White Bread',               defaultServing: 30,  unitLabel: '1 slice',         calories: 80,  protein: 2.7,  carbs: 15.0, fat: 1.0 },

  // --- Legumes ---
  { name: 'Lentils (cooked)',          defaultServing: 200, unitLabel: '1 cup',           calories: 230, protein: 18.0, carbs: 39.9, fat: 0.8 },
  { name: 'Chickpeas (cooked)',        defaultServing: 164, unitLabel: '1 cup',           calories: 269, protein: 14.5, carbs: 45.0, fat: 4.2 },
  { name: 'Black Beans (cooked)',      defaultServing: 172, unitLabel: '1 cup',           calories: 227, protein: 15.2, carbs: 40.8, fat: 0.9 },
  { name: 'Kidney Beans (cooked)',     defaultServing: 177, unitLabel: '1 cup',           calories: 225, protein: 15.3, carbs: 40.4, fat: 0.9 },
  { name: 'Tofu',                      defaultServing: 100, calories: 76,  protein: 8.1,  carbs: 1.9,  fat: 4.8 },

  // --- Nuts & Fats ---
  { name: 'Almonds',                   defaultServing: 28,  unitLabel: '~23 almonds',     calories: 164, protein: 6.0,  carbs: 6.1,  fat: 14.2 },
  { name: 'Walnuts',                   defaultServing: 28,  unitLabel: '~14 halves',      calories: 185, protein: 4.3,  carbs: 3.9,  fat: 18.5 },
  { name: 'Cashews',                   defaultServing: 28,  unitLabel: '~18 cashews',     calories: 157, protein: 5.2,  carbs: 8.6,  fat: 12.4 },
  { name: 'Peanut Butter',             defaultServing: 32,  unitLabel: '2 tbsp',          calories: 191, protein: 7.1,  carbs: 7.1,  fat: 16.4 },
  { name: 'Olive Oil',                 defaultServing: 14,  unitLabel: '1 tbsp',          calories: 119, protein: 0.0,  carbs: 0.0,  fat: 14.0 },
  { name: 'Butter',                    defaultServing: 14,  unitLabel: '1 tbsp',          calories: 100, protein: 0.1,  carbs: 0.0,  fat: 11.5 },
  { name: 'Coconut Oil',               defaultServing: 14,  unitLabel: '1 tbsp',          calories: 121, protein: 0.0,  carbs: 0.0,  fat: 13.5 },

  // --- American Breakfast ---
  { name: 'Pancake',                   defaultServing: 70,  unitLabel: '1 pancake',       calories: 175, protein: 4.0,  carbs: 27.0, fat: 5.0  },
  { name: 'Waffle',                    defaultServing: 75,  unitLabel: '1 waffle',        calories: 185, protein: 5.0,  carbs: 25.0, fat: 8.0  },
  { name: 'Bacon (cooked)',            defaultServing: 16,  unitLabel: '2 strips',        calories: 87,  protein: 6.0,  carbs: 0.1,  fat: 7.0  },
  { name: 'Sausage Link',              defaultServing: 56,  unitLabel: '2 links',         calories: 170, protein: 8.0,  carbs: 1.0,  fat: 15.0 },
  { name: 'Hash Browns',               defaultServing: 100, calories: 265, protein: 2.0,  carbs: 34.0, fat: 14.0 },
  { name: 'French Toast',              defaultServing: 65,  unitLabel: '1 slice',         calories: 151, protein: 5.0,  carbs: 18.0, fat: 7.0  },
  { name: 'Granola',                   defaultServing: 60,  unitLabel: '½ cup',           calories: 283, protein: 6.0,  carbs: 34.0, fat: 13.0 },
  { name: 'Corn Flakes',               defaultServing: 28,  unitLabel: '1 cup',           calories: 101, protein: 2.0,  carbs: 24.0, fat: 0.2  },
  { name: 'Cheerios',                  defaultServing: 28,  unitLabel: '1 cup',           calories: 100, protein: 3.0,  carbs: 20.0, fat: 2.0  },
  { name: 'Granola Bar',               defaultServing: 47,  unitLabel: '1 bar',           calories: 193, protein: 4.0,  carbs: 29.0, fat: 8.0  },

  // --- Breads & Bakery ---
  { name: 'Bagel',                     defaultServing: 98,  unitLabel: '1 bagel',         calories: 270, protein: 10.0, carbs: 53.0, fat: 1.5  },
  { name: 'English Muffin',            defaultServing: 57,  unitLabel: '1 muffin',        calories: 134, protein: 5.0,  carbs: 26.0, fat: 1.0  },
  { name: 'Croissant',                 defaultServing: 57,  unitLabel: '1 croissant',     calories: 231, protein: 5.0,  carbs: 26.0, fat: 12.0 },
  { name: 'Flour Tortilla',            defaultServing: 45,  unitLabel: '1 medium',        calories: 146, protein: 4.0,  carbs: 25.0, fat: 3.5  },
  { name: 'Corn Tortilla',             defaultServing: 26,  unitLabel: '1 tortilla',      calories: 57,  protein: 1.5,  carbs: 12.0, fat: 0.7  },
  { name: 'Pita Bread',                defaultServing: 60,  unitLabel: '1 pita',          calories: 165, protein: 5.0,  carbs: 33.0, fat: 0.7  },
  { name: 'Blueberry Muffin',          defaultServing: 100, unitLabel: '1 muffin',        calories: 377, protein: 5.0,  carbs: 55.0, fat: 16.0 },
  { name: 'Dinner Roll',               defaultServing: 35,  unitLabel: '1 roll',          calories: 100, protein: 3.0,  carbs: 18.0, fat: 2.0  },

  // --- Proteins (Western) ---
  { name: 'Turkey Breast (cooked)',    defaultServing: 100, calories: 135, protein: 30.0, carbs: 0.0,  fat: 1.0  },
  { name: 'Ham (cooked)',              defaultServing: 100, calories: 145, protein: 20.0, carbs: 1.5,  fat: 7.0  },
  { name: 'Beef Steak (grilled)',      defaultServing: 100, calories: 217, protein: 26.0, carbs: 0.0,  fat: 12.0 },
  { name: 'Pork Chop (cooked)',        defaultServing: 100, calories: 231, protein: 25.0, carbs: 0.0,  fat: 14.0 },
  { name: 'Hot Dog',                   defaultServing: 57,  unitLabel: '1 frank',         calories: 185, protein: 7.0,  carbs: 2.0,  fat: 16.0 },
  { name: 'Beef Jerky',                defaultServing: 28,  unitLabel: '1 oz',            calories: 116, protein: 9.5,  carbs: 3.0,  fat: 7.0  },

  // --- Common Meals ---
  { name: 'Cheeseburger (homemade)',   defaultServing: 150, unitLabel: '1 burger',        calories: 400, protein: 25.0, carbs: 28.0, fat: 21.0 },
  { name: 'Pizza (cheese, 1 slice)',   defaultServing: 107, unitLabel: '1 slice',         calories: 285, protein: 12.0, carbs: 36.0, fat: 10.0 },
  { name: 'Mac and Cheese',            defaultServing: 240, unitLabel: '1 cup',           calories: 390, protein: 14.0, carbs: 48.0, fat: 17.0 },
  { name: 'Chicken Nuggets',           defaultServing: 100, unitLabel: '~6 pieces',       calories: 297, protein: 15.0, carbs: 18.0, fat: 18.0 },
  { name: 'French Fries',              defaultServing: 117, unitLabel: 'medium serving',  calories: 378, protein: 4.0,  carbs: 48.0, fat: 19.0 },
  { name: 'Grilled Cheese Sandwich',   defaultServing: 120, unitLabel: '1 sandwich',      calories: 380, protein: 15.0, carbs: 30.0, fat: 23.0 },
  { name: 'Caesar Salad',              defaultServing: 150, unitLabel: '1 side salad',    calories: 285, protein: 6.0,  carbs: 12.0, fat: 24.0 },
  { name: 'Chicken Sandwich',          defaultServing: 200, unitLabel: '1 sandwich',      calories: 480, protein: 35.0, carbs: 42.0, fat: 19.0 },
  { name: 'Burrito (bean & cheese)',   defaultServing: 220, unitLabel: '1 burrito',       calories: 490, protein: 18.0, carbs: 66.0, fat: 17.0 },
  { name: 'Taco',                      defaultServing: 100, unitLabel: '1 taco',          calories: 226, protein: 12.0, carbs: 20.0, fat: 10.0 },

  // --- Snacks ---
  { name: 'Potato Chips',              defaultServing: 28,  unitLabel: '1 oz',            calories: 152, protein: 2.0,  carbs: 15.0, fat: 10.0 },
  { name: 'Tortilla Chips',            defaultServing: 28,  unitLabel: '1 oz',            calories: 142, protein: 2.0,  carbs: 19.0, fat: 7.0  },
  { name: 'Pretzels',                  defaultServing: 28,  unitLabel: '1 oz',            calories: 108, protein: 3.0,  carbs: 23.0, fat: 1.0  },
  { name: 'Popcorn (air popped)',      defaultServing: 30,  unitLabel: '~3 cups',         calories: 110, protein: 3.5,  carbs: 22.0, fat: 1.3  },
  { name: 'Oreo Cookies',              defaultServing: 34,  unitLabel: '3 cookies',       calories: 160, protein: 1.0,  carbs: 25.0, fat: 7.0  },
  { name: 'Chocolate Bar',             defaultServing: 40,  unitLabel: '1 bar (~40g)',    calories: 214, protein: 3.0,  carbs: 24.0, fat: 12.0 },
  { name: 'Rice Cakes',                defaultServing: 18,  unitLabel: '2 cakes',         calories: 70,  protein: 1.5,  carbs: 15.0, fat: 0.5  },
  { name: 'Protein Bar',               defaultServing: 60,  unitLabel: '1 bar',           calories: 200, protein: 20.0, carbs: 22.0, fat: 7.0  },

  // --- More Dairy ---
  { name: 'Cream Cheese',              defaultServing: 29,  unitLabel: '2 tbsp',          calories: 101, protein: 1.8,  carbs: 1.2,  fat: 10.0 },
  { name: 'Sour Cream',                defaultServing: 30,  unitLabel: '2 tbsp',          calories: 60,  protein: 0.9,  carbs: 1.2,  fat: 5.8  },
  { name: 'Heavy Cream',               defaultServing: 15,  unitLabel: '1 tbsp',          calories: 51,  protein: 0.3,  carbs: 0.4,  fat: 5.5  },
  { name: 'Ice Cream (vanilla)',        defaultServing: 66,  unitLabel: '½ cup',           calories: 145, protein: 2.5,  carbs: 17.0, fat: 8.0  },
  { name: 'American Cheese',           defaultServing: 28,  unitLabel: '1 slice',         calories: 94,  protein: 5.0,  carbs: 1.0,  fat: 7.6  },
  { name: 'Swiss Cheese',              defaultServing: 28,  unitLabel: '1 slice',         calories: 106, protein: 8.0,  carbs: 1.5,  fat: 7.9  },

  // --- Beverages ---
  { name: 'Orange Juice',              defaultServing: 240, unitLabel: '1 cup',           calories: 112, protein: 1.7,  carbs: 26.0, fat: 0.5  },
  { name: 'Apple Juice',               defaultServing: 240, unitLabel: '1 cup',           calories: 114, protein: 0.2,  carbs: 28.0, fat: 0.3  },
  { name: 'Coffee (black)',            defaultServing: 240, unitLabel: '1 cup',           calories: 2,   protein: 0.3,  carbs: 0.0,  fat: 0.0  },
  { name: 'Latte (whole milk)',        defaultServing: 355, unitLabel: '12 oz',           calories: 204, protein: 12.0, carbs: 18.0, fat: 9.0  },
  { name: 'Cola / Soda',               defaultServing: 355, unitLabel: '12 oz can',       calories: 140, protein: 0.0,  carbs: 39.0, fat: 0.0  },
  { name: 'Sports Drink (Gatorade)',   defaultServing: 355, unitLabel: '12 oz',           calories: 80,  protein: 0.0,  carbs: 22.0, fat: 0.0  },
  { name: 'Whole Milk',                defaultServing: 240, unitLabel: '1 cup',           calories: 149, protein: 8.0,  carbs: 11.4, fat: 8.0  },
  { name: 'Almond Milk (unsweetened)', defaultServing: 240, unitLabel: '1 cup',           calories: 30,  protein: 1.0,  carbs: 1.0,  fat: 2.5  },
  { name: 'Protein Shake',             defaultServing: 300, unitLabel: '1 shake',         calories: 160, protein: 25.0, carbs: 8.0,  fat: 3.0  },

  // --- Condiments & Sauces ---
  { name: 'Ketchup',                   defaultServing: 17,  unitLabel: '1 tbsp',          calories: 20,  protein: 0.3,  carbs: 5.0,  fat: 0.0  },
  { name: 'Mayonnaise',                defaultServing: 14,  unitLabel: '1 tbsp',          calories: 94,  protein: 0.1,  carbs: 0.1,  fat: 10.0 },
  { name: 'Ranch Dressing',            defaultServing: 30,  unitLabel: '2 tbsp',          calories: 145, protein: 0.4,  carbs: 1.5,  fat: 15.0 },
  { name: 'Salsa',                     defaultServing: 30,  unitLabel: '2 tbsp',          calories: 10,  protein: 0.4,  carbs: 2.0,  fat: 0.1  },
  { name: 'Hummus',                    defaultServing: 30,  unitLabel: '2 tbsp',          calories: 70,  protein: 2.0,  carbs: 6.0,  fat: 4.5  },
  { name: 'Guacamole',                 defaultServing: 30,  unitLabel: '2 tbsp',          calories: 50,  protein: 0.7,  carbs: 2.5,  fat: 4.5  },
  { name: 'BBQ Sauce',                 defaultServing: 30,  unitLabel: '2 tbsp',          calories: 60,  protein: 0.3,  carbs: 14.0, fat: 0.3  },
  { name: 'Hot Sauce',                 defaultServing: 5,   unitLabel: '1 tsp',           calories: 0,   protein: 0.0,  carbs: 0.1,  fat: 0.0  },

  // ── Chinese ──────────────────────────────────────────────────────────────
  { name: 'Fried Rice (plain)',         defaultServing: 200, unitLabel: '1 cup',           calories: 290, protein: 6.0,  carbs: 45.0, fat: 9.0  },
  { name: 'Chicken Fried Rice',         defaultServing: 200, unitLabel: '1 cup',           calories: 340, protein: 14.0, carbs: 45.0, fat: 11.0 },
  { name: 'Egg Fried Rice',             defaultServing: 200, unitLabel: '1 cup',           calories: 310, protein: 8.0,  carbs: 45.0, fat: 11.0 },
  { name: 'Chow Mein',                  defaultServing: 200, unitLabel: '1 cup',           calories: 290, protein: 11.0, carbs: 40.0, fat: 9.0  },
  { name: 'Lo Mein',                    defaultServing: 200, unitLabel: '1 cup',           calories: 310, protein: 12.0, carbs: 44.0, fat: 9.0  },
  { name: 'Pork Dumpling / Gyoza',      defaultServing: 60,  unitLabel: '3 pieces',        calories: 150, protein: 8.0,  carbs: 16.0, fat: 6.0  },
  { name: 'Steamed Dim Sum (Har Gow)', defaultServing: 75,  unitLabel: '3 pieces',        calories: 115, protein: 7.0,  carbs: 15.0, fat: 3.0  },
  { name: 'Spring Roll (fried)',        defaultServing: 65,  unitLabel: '1 roll',          calories: 163, protein: 4.0,  carbs: 17.0, fat: 9.0  },
  { name: 'Wonton Soup',                defaultServing: 240, unitLabel: '1 bowl',          calories: 100, protein: 7.0,  carbs: 12.0, fat: 2.0  },
  { name: 'Sweet & Sour Chicken',       defaultServing: 200, unitLabel: '1 cup',           calories: 370, protein: 25.0, carbs: 38.0, fat: 12.0 },
  { name: 'Kung Pao Chicken',           defaultServing: 200, unitLabel: '1 cup',           calories: 350, protein: 28.0, carbs: 18.0, fat: 18.0 },
  { name: 'Mapo Tofu',                  defaultServing: 200, unitLabel: '1 cup',           calories: 220, protein: 12.0, carbs: 10.0, fat: 14.0 },
  { name: 'Peking Duck',                defaultServing: 100, calories: 337, protein: 19.0, carbs: 0.0,  fat: 29.0 },

  // ── Japanese ─────────────────────────────────────────────────────────────
  { name: 'Sushi Roll / Maki',          defaultServing: 150, unitLabel: '6 pieces',        calories: 300, protein: 13.0, carbs: 47.0, fat: 6.0  },
  { name: 'Sashimi',                    defaultServing: 100, unitLabel: '6 slices',        calories: 130, protein: 22.0, carbs: 0.0,  fat: 4.0  },
  { name: 'Ramen',                      defaultServing: 500, unitLabel: '1 bowl',          calories: 450, protein: 22.0, carbs: 60.0, fat: 12.0 },
  { name: 'Miso Soup',                  defaultServing: 240, unitLabel: '1 bowl',          calories: 40,  protein: 3.0,  carbs: 5.0,  fat: 1.0  },
  { name: 'Edamame',                    defaultServing: 155, unitLabel: '1 cup',           calories: 188, protein: 17.0, carbs: 14.0, fat: 8.0  },
  { name: 'Teriyaki Chicken',           defaultServing: 100, calories: 200, protein: 24.0, carbs: 8.0,  fat: 8.0  },
  { name: 'Tonkatsu',                   defaultServing: 100, calories: 288, protein: 20.0, carbs: 13.0, fat: 18.0 },
  { name: 'Onigiri',                    defaultServing: 100, unitLabel: '1 rice ball',     calories: 185, protein: 4.0,  carbs: 38.0, fat: 1.0  },
  { name: 'Udon Noodle Soup',           defaultServing: 300, unitLabel: '1 bowl',          calories: 280, protein: 10.0, carbs: 56.0, fat: 2.0  },
  { name: 'Tempura Shrimp',             defaultServing: 90,  unitLabel: '3 pieces',        calories: 216, protein: 11.0, carbs: 18.0, fat: 11.0 },

  // ── Italian ──────────────────────────────────────────────────────────────
  { name: 'Spaghetti Bolognese',        defaultServing: 350, unitLabel: '1 bowl',          calories: 490, protein: 26.0, carbs: 56.0, fat: 16.0 },
  { name: 'Penne Arrabbiata',           defaultServing: 250, unitLabel: '1 bowl',          calories: 350, protein: 12.0, carbs: 60.0, fat: 8.0  },
  { name: 'Pasta Carbonara',            defaultServing: 250, unitLabel: '1 bowl',          calories: 490, protein: 22.0, carbs: 50.0, fat: 22.0 },
  { name: 'Pesto Pasta',                defaultServing: 250, unitLabel: '1 bowl',          calories: 420, protein: 14.0, carbs: 52.0, fat: 18.0 },
  { name: 'Lasagna',                    defaultServing: 250, unitLabel: '1 piece',         calories: 430, protein: 22.0, carbs: 42.0, fat: 18.0 },
  { name: 'Risotto',                    defaultServing: 220, unitLabel: '1 cup',           calories: 310, protein: 8.0,  carbs: 52.0, fat: 8.0  },
  { name: 'Gnocchi',                    defaultServing: 200, unitLabel: '1 cup',           calories: 250, protein: 6.0,  carbs: 50.0, fat: 3.0  },
  { name: 'Minestrone Soup',            defaultServing: 240, unitLabel: '1 bowl',          calories: 80,  protein: 4.0,  carbs: 14.0, fat: 2.0  },
  { name: 'Bruschetta',                 defaultServing: 80,  unitLabel: '2 pieces',        calories: 150, protein: 4.0,  carbs: 22.0, fat: 5.0  },
  { name: 'Tiramisu',                   defaultServing: 100, unitLabel: '1 slice',         calories: 283, protein: 5.0,  carbs: 27.0, fat: 17.0 },

  // ── Mexican ──────────────────────────────────────────────────────────────
  { name: 'Burrito Bowl',               defaultServing: 400, unitLabel: '1 bowl',          calories: 520, protein: 25.0, carbs: 72.0, fat: 14.0 },
  { name: 'Quesadilla',                 defaultServing: 150, unitLabel: '1 large',         calories: 430, protein: 18.0, carbs: 43.0, fat: 21.0 },
  { name: 'Enchilada',                  defaultServing: 180, unitLabel: '1 piece',         calories: 320, protein: 16.0, carbs: 38.0, fat: 12.0 },
  { name: 'Nachos',                     defaultServing: 150, unitLabel: '1 serving',       calories: 480, protein: 14.0, carbs: 52.0, fat: 25.0 },
  { name: 'Tamale',                     defaultServing: 100, unitLabel: '1 tamale',        calories: 220, protein: 6.0,  carbs: 28.0, fat: 10.0 },
  { name: 'Refried Beans',              defaultServing: 120, unitLabel: '½ cup',           calories: 180, protein: 9.0,  carbs: 28.0, fat: 4.0  },
  { name: 'Pico de Gallo',              defaultServing: 30,  unitLabel: '2 tbsp',          calories: 10,  protein: 0.4,  carbs: 2.0,  fat: 0.1  },
  { name: 'Fajita Chicken',             defaultServing: 200, unitLabel: '1 serving',       calories: 350, protein: 30.0, carbs: 22.0, fat: 15.0 },
  { name: 'Churros',                    defaultServing: 50,  unitLabel: '1 churro',        calories: 145, protein: 2.0,  carbs: 22.0, fat: 6.0  },

  // ── Mediterranean ────────────────────────────────────────────────────────
  { name: 'Falafel',                    defaultServing: 90,  unitLabel: '3 pieces',        calories: 195, protein: 8.0,  carbs: 22.0, fat: 9.0  },
  { name: 'Shawarma (chicken wrap)',    defaultServing: 300, unitLabel: '1 wrap',          calories: 500, protein: 28.0, carbs: 52.0, fat: 18.0 },
  { name: 'Tabbouleh',                  defaultServing: 150, unitLabel: '1 cup',           calories: 120, protein: 4.0,  carbs: 15.0, fat: 6.0  },
  { name: 'Greek Salad',                defaultServing: 200, unitLabel: '1 bowl',          calories: 170, protein: 5.0,  carbs: 10.0, fat: 13.0 },
  { name: 'Tzatziki',                   defaultServing: 30,  unitLabel: '2 tbsp',          calories: 25,  protein: 2.0,  carbs: 2.0,  fat: 1.0  },
  { name: 'Shakshuka',                  defaultServing: 250, unitLabel: '1 serving',       calories: 220, protein: 13.0, carbs: 14.0, fat: 12.0 },
  { name: 'Lentil Soup',                defaultServing: 240, unitLabel: '1 bowl',          calories: 130, protein: 9.0,  carbs: 22.0, fat: 2.0  },
  { name: 'Dolma / Stuffed Vine Leaves',defaultServing: 90,  unitLabel: '3 pieces',        calories: 170, protein: 4.0,  carbs: 22.0, fat: 8.0  },
  { name: 'Chicken Kebab',              defaultServing: 100, calories: 185, protein: 22.0, carbs: 3.0,  fat: 10.0 },
  { name: 'Baklava',                    defaultServing: 60,  unitLabel: '1 piece',         calories: 245, protein: 3.0,  carbs: 29.0, fat: 14.0 },

  // ── South Indian ─────────────────────────────────────────────────────────
  { name: 'Sambar',                     defaultServing: 240, unitLabel: '1 bowl',          calories: 120, protein: 6.0,  carbs: 18.0, fat: 3.0  },
  { name: 'Rasam',                      defaultServing: 240, unitLabel: '1 bowl',          calories: 60,  protein: 3.0,  carbs: 9.0,  fat: 2.0  },
  { name: 'Uttapam',                    defaultServing: 120, unitLabel: '1 piece',         calories: 200, protein: 6.0,  carbs: 35.0, fat: 5.0  },
  { name: 'Curd Rice',                  defaultServing: 200, unitLabel: '1 bowl',          calories: 220, protein: 7.0,  carbs: 38.0, fat: 5.0  },
  { name: 'Pongal',                     defaultServing: 200, unitLabel: '1 bowl',          calories: 250, protein: 7.0,  carbs: 42.0, fat: 7.0  },
  { name: 'Medu Vada',                  defaultServing: 60,  unitLabel: '1 vada',          calories: 150, protein: 5.0,  carbs: 18.0, fat: 7.0  },
  { name: 'Appam',                      defaultServing: 60,  unitLabel: '1 appam',         calories: 120, protein: 3.0,  carbs: 22.0, fat: 2.0  },
  { name: 'Avial',                      defaultServing: 200, unitLabel: '1 bowl',          calories: 180, protein: 4.0,  carbs: 16.0, fat: 12.0 },
  { name: 'Coconut Chutney',            defaultServing: 30,  unitLabel: '2 tbsp',          calories: 60,  protein: 1.0,  carbs: 3.0,  fat: 5.0  },

  // ── Gujarati ─────────────────────────────────────────────────────────────
  { name: 'Dhokla',                     defaultServing: 80,  unitLabel: '2 pieces',        calories: 140, protein: 6.0,  carbs: 22.0, fat: 3.0  },
  { name: 'Thepla',                     defaultServing: 50,  unitLabel: '1 thepla',        calories: 130, protein: 3.0,  carbs: 19.0, fat: 5.0  },
  { name: 'Khaman',                     defaultServing: 80,  unitLabel: '2 pieces',        calories: 150, protein: 6.0,  carbs: 24.0, fat: 4.0  },
  { name: 'Khandvi',                    defaultServing: 60,  unitLabel: '3 pieces',        calories: 120, protein: 5.0,  carbs: 18.0, fat: 3.0  },
  { name: 'Handvo',                     defaultServing: 100, unitLabel: '1 slice',         calories: 200, protein: 7.0,  carbs: 30.0, fat: 7.0  },
  { name: 'Dal Dhokli',                 defaultServing: 250, unitLabel: '1 bowl',          calories: 290, protein: 10.0, carbs: 48.0, fat: 7.0  },
  { name: 'Undhiyu',                    defaultServing: 200, unitLabel: '1 bowl',          calories: 280, protein: 8.0,  carbs: 32.0, fat: 14.0 },

  // ── Punjabi Snacks ───────────────────────────────────────────────────────
  { name: 'Aloo Tikki',                 defaultServing: 80,  unitLabel: '1 piece',         calories: 165, protein: 4.0,  carbs: 25.0, fat: 6.0  },
  { name: 'Bhatura',                    defaultServing: 100, unitLabel: '1 bhatura',       calories: 295, protein: 7.0,  carbs: 40.0, fat: 13.0 },
  { name: 'Punjabi Kadhi',              defaultServing: 240, unitLabel: '1 bowl',          calories: 200, protein: 7.0,  carbs: 20.0, fat: 10.0 },
  { name: 'Makki Ki Roti',              defaultServing: 60,  unitLabel: '1 roti',          calories: 165, protein: 3.0,  carbs: 30.0, fat: 4.0  },
  { name: 'Sarson Ka Saag',             defaultServing: 200, unitLabel: '1 bowl',          calories: 180, protein: 6.0,  carbs: 16.0, fat: 11.0 },
  { name: 'Amritsari Kulcha',           defaultServing: 100, unitLabel: '1 kulcha',        calories: 270, protein: 7.0,  carbs: 42.0, fat: 9.0  },
  { name: 'Mathri',                     defaultServing: 40,  unitLabel: '2 pieces',        calories: 175, protein: 3.0,  carbs: 21.0, fat: 9.0  },
  { name: 'Pinni',                      defaultServing: 50,  unitLabel: '1 piece',         calories: 220, protein: 5.0,  carbs: 26.0, fat: 12.0 },

  // ── Fitness — Protein Sources ────────────────────────────────────────────
  { name: 'Casein Protein',             defaultServing: 30,  unitLabel: '1 scoop',         calories: 110, protein: 24.0, carbs: 3.0,  fat: 1.0  },
  { name: 'Plant-based Protein',        defaultServing: 30,  unitLabel: '1 scoop',         calories: 120, protein: 21.0, carbs: 5.0,  fat: 2.0  },
  { name: 'Pea Protein',                defaultServing: 30,  unitLabel: '1 scoop',         calories: 110, protein: 21.0, carbs: 2.0,  fat: 2.0  },
  { name: 'Egg White Protein',          defaultServing: 30,  unitLabel: '1 scoop',         calories: 105, protein: 25.0, carbs: 1.0,  fat: 0.5  },
  { name: 'Collagen Peptides',          defaultServing: 10,  unitLabel: '1 scoop',         calories: 35,  protein: 9.0,  carbs: 0.0,  fat: 0.0  },
  { name: 'Mass Gainer',                defaultServing: 100, unitLabel: '1 scoop',         calories: 380, protein: 30.0, carbs: 60.0, fat: 5.0  },
  { name: 'Tempeh',                     defaultServing: 100, calories: 193, protein: 19.0, carbs: 9.0,  fat: 11.0 },
  { name: 'Seitan',                     defaultServing: 100, calories: 370, protein: 75.0, carbs: 14.0, fat: 2.0  },
  { name: 'Smoked Salmon',              defaultServing: 100, calories: 117, protein: 18.0, carbs: 0.0,  fat: 5.0  },
  { name: 'Sardines (canned)',          defaultServing: 100, calories: 208, protein: 25.0, carbs: 0.0,  fat: 11.0 },
  { name: 'String Cheese',              defaultServing: 28,  unitLabel: '1 stick',         calories: 80,  protein: 7.0,  carbs: 1.0,  fat: 5.0  },

  // ── Fitness — Performance & Supplements ──────────────────────────────────
  { name: 'Creatine',                   defaultServing: 5,   unitLabel: '1 tsp',           calories: 0,   protein: 0.0,  carbs: 0.0,  fat: 0.0  },
  { name: 'BCAA Powder',                defaultServing: 7,   unitLabel: '1 scoop',         calories: 20,  protein: 5.0,  carbs: 0.0,  fat: 0.0  },
  { name: 'Pre-workout',                defaultServing: 10,  unitLabel: '1 scoop',         calories: 20,  protein: 0.0,  carbs: 4.0,  fat: 0.0  },
  { name: 'Energy Gel',                 defaultServing: 32,  unitLabel: '1 packet',        calories: 100, protein: 0.0,  carbs: 25.0, fat: 0.0  },
  { name: 'Dates',                      defaultServing: 24,  unitLabel: '3 dates',         calories: 67,  protein: 0.4,  carbs: 18.0, fat: 0.1  },
  { name: 'Clif Bar',                   defaultServing: 68,  unitLabel: '1 bar',           calories: 250, protein: 9.0,  carbs: 45.0, fat: 5.0  },
]

function makeLog(date) {
  return {
    date,
    meals: MEAL_TYPES.map(name => ({ id: uuid(), name, items: [] })),
  }
}

function makeItem(overrides = {}) {
  return { id: uuid(), name: '', calories: '', protein: '', carbs: '', fat: '', ...overrides }
}

function mealCalories(meal) {
  return meal.items.reduce((s, i) => s + (Number(i.calories) || 0), 0)
}

function MacroBadge({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${color}`}>{Math.round(value)}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

// Search Open Food Facts API
async function searchOpenFoodFacts(query) {
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

// Search USDA FoodData Central (free, high-quality global food data)
async function searchUSDA(query) {
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

function searchIndianFoods(query) {
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

function sanitizeName(str) {
  return String(str).replace(/[^\x20-\x7E\u00A0-\u024F]/g, '').trim().slice(0, 200) || 'Unknown'
}

// Barcode lookup via Open Food Facts
async function lookupBarcode(barcode) {
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

const BARCODE_SUPPORTED = typeof window !== 'undefined' && 'BarcodeDetector' in window

function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const frameRef = useRef(null)
  const detectorRef = useRef(null)
  const [error, setError] = useState(null)
  const [looking, setLooking] = useState(false)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    if (!BARCODE_SUPPORTED) return
    detectorRef.current = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
    })
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        scanFrame()
      }
    } catch {
      setError('Camera access denied.')
    }
  }

  function stopCamera() {
    cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  async function scanFrame() {
    if (!videoRef.current || !detectorRef.current) return
    try {
      const codes = await detectorRef.current.detect(videoRef.current)
      if (codes.length > 0) {
        stopCamera()
        handleCode(codes[0].rawValue)
        return
      }
    } catch {}
    frameRef.current = requestAnimationFrame(scanFrame)
  }

  async function handleCode(code) {
    const clean = code.trim()
    if (!/^\d{8,14}$/.test(clean)) {
      setError('Invalid barcode — must be 8–14 digits.')
      return
    }
    setLooking(true)
    try {
      const food = await lookupBarcode(clean)
      if (food) { onResult(food); return }
      setError(`No food found for barcode ${clean}.`)
    } catch {
      setError('Lookup failed. Try again.')
    }
    setLooking(false)
  }

  async function handleManual(e) {
    e.preventDefault()
    if (manualCode.trim()) handleCode(manualCode.trim())
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900">
        <span className="text-white font-semibold text-sm">Scan barcode</span>
        <button onClick={() => { stopCamera(); onClose() }} className="text-slate-400 p-1">
          <X size={20} />
        </button>
      </div>

      {looking ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 size={32} className="animate-spin text-emerald-400" />
          <p className="text-sm text-slate-400">Looking up barcode…</p>
        </div>
      ) : BARCODE_SUPPORTED && !error ? (
        <div className="relative flex-1 overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {/* Viewfinder overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-72 h-36">
              <div className="absolute inset-0 border-2 border-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              {[['top-0 left-0','border-t-2 border-l-2 rounded-tl-lg'],
                ['top-0 right-0','border-t-2 border-r-2 rounded-tr-lg'],
                ['bottom-0 left-0','border-b-2 border-l-2 rounded-bl-lg'],
                ['bottom-0 right-0','border-b-2 border-r-2 rounded-br-lg']
              ].map(([pos, cls]) => (
                <div key={pos} className={`absolute w-6 h-6 border-emerald-400 ${pos} ${cls}`} />
              ))}
            </div>
          </div>
          <p className="absolute bottom-10 w-full text-center text-white/70 text-sm">
            Point camera at barcode
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {!BARCODE_SUPPORTED && (
            <p className="text-slate-400 text-sm text-center">
              Barcode scanning isn't supported on this browser. Enter the barcode number manually:
            </p>
          )}
          <form onSubmit={handleManual} className="w-full flex gap-2">
            <input
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="e.g. 5000112637922"
              inputMode="numeric"
              autoFocus
              className="flex-1 bg-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button type="submit" className="px-4 py-2.5 bg-emerald-600 rounded-lg text-white text-sm font-semibold">
              Look up
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function searchCustomFoods(query) {
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

function calcNutrition(food, grams) {
  const f = grams / 100
  return {
    calories: Math.round(food.per100.calories * f),
    protein: Math.round(food.per100.protein * f * 10) / 10,
    carbs: Math.round(food.per100.carbs * f * 10) / 10,
    fat: Math.round(food.per100.fat * f * 10) / 10,
  }
}

function recentFoodToResult(food) {
  // Convert a stored food item (from a log) back to a search result shape
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

function AddFoodForm({ onSave, onCancel }) {
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

  // Strip punctuation for fuzzy dedup key
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
      const local = searchIndianFoods(query)
      const custom = searchCustomFoods(query).map(f => ({ ...f, isCustom: true }))

      // Build local results: custom first → Indian/local, deduped
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
        // Priority: USDA first (higher quality), then OFF
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
        // Total cap: 25 results; local results take priority
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
              // Save to custom foods as well
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

          {/* Recent foods dropdown (shown when focused with empty/short query) */}
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
                            {r.sourceLabel === 'Indian' && <span className="ml-1 text-emerald-500">Indian</span>}
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

function WaterTracker({ date }) {
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

export default function FoodTab({ date }) {
  const [log, setLog] = useState(() => getFoodForDate(date) || makeLog(date))
  const [addingTo, setAddingTo] = useState(null)
  const [targets, setTargets] = useState(() => getTargets())
  const [showTargetForm, setShowTargetForm] = useState(false)
  const [draftTargets, setDraftTargets] = useState(() => getTargets())
  const [editingItem, setEditingItem] = useState(null) // { mealName, itemId, draft: {calories,protein,carbs,fat} }

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

  // Check if "copy yesterday" should show
  const today = new Date().toISOString().split('T')[0]
  const todayHasFood = date === today && log.meals.some(m => m.items.length > 0)
  const yesterdayStr = (() => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
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

        {/* Progress bars */}
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

      {/* Water tracker */}
      <WaterTracker date={date} />

      {/* Meals */}
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
