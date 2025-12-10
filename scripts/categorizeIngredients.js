#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RECIPES_DIR = path.join(__dirname, '..', 'recipes');
const DEFAULT_AISLE = 'Other';

const AISLE_RULES = [
  {
    name: 'Produce',
    keywords: [
      'apple', 'arugula', 'asparagus', 'avocado', 'basil', 'bean sprout',
      'bell pepper', 'berries', 'berry', 'broccoli', 'broccolini', 'brussels',
      'cabbage', 'carrot', 'cauliflower', 'celery', 'chard', 'chili',
      'cilantro', 'citrus', 'collard', 'cucumber', 'dill', 'fennel', 'garlic',
      'ginger', 'grape', 'green bean', 'green onion', 'herb', 'jalapeño', 'jalapeno',
      'kale', 'leek', 'lemon', 'lime', 'lettuce', 'mango', 'mint', 'mushroom',
      'okra', 'onion', 'orange', 'parsley', 'pea', 'pepper', 'potato',
      'radish', 'scallion', 'shallot', 'spinach', 'spring onion', 'squash',
      'sweet potato', 'tomatillo', 'tomato', 'turnip', 'zucchini'
    ]
  },
  {
    name: 'Meat & Poultry',
    keywords: [
      'bacon', 'beef', 'chicken', 'chorizo', 'duck', 'ground beef', 'ground pork',
      'ham', 'lamb', 'pork', 'prosciutto', 'rib', 'sausage', 'short rib',
      'steak', 'tenderloin', 'turkey', 'veal', 'wings'
    ]
  },
  {
    name: 'Seafood',
    keywords: [
      'anchov', 'clam', 'cod', 'crab', 'fish', 'lobster', 'mussel', 'oyster',
      'prawn', 'salmon', 'scallop', 'shrimp', 'sole', 'tuna'
    ]
  },
  {
    name: 'Dairy & Eggs',
    keywords: [
      'butter', 'buttermilk', 'cheese', 'cream', 'creme', 'custard', 'egg',
      'half-and-half', 'mascarpone', 'milk', 'parmigiano', 'parmesan', 'ricotta',
      'sour cream', 'whipped cream', 'yogurt'
    ]
  },
  {
    name: 'Bakery',
    keywords: [
      'baguette', 'bread', 'brioche', 'buns', 'crostini', 'dough', 'pita',
      'pizza crust', 'roll', 'tortilla', 'wrap'
    ]
  },
  {
    name: 'Pantry & Dry Goods',
    keywords: [
      'barley', 'beans', 'breadcrumbs', 'broth', 'bulgur', 'canned', 'couscous',
      'farro', 'flax', 'grain', 'lentil', 'noodle', 'oats', 'pasta', 'quinoa',
      'rice', 'stock', 'water', 'yeast'
    ]
  },
  {
    name: 'Baking & Spices',
    keywords: [
      'all-purpose flour', 'almond flour', 'baking powder', 'baking soda',
      'brown sugar', 'cocoa', 'coconut sugar', 'cornmeal', 'cornstarch',
      'cumin', 'curry', 'flour', 'gingerbread', 'herbes de provence',
      'molasses', 'nutmeg', 'paprika', 'peppercorn', 'salt', 'sugar', 'vanilla'
    ]
  },
  {
    name: 'Canned & Jarred',
    keywords: [
      'capers', 'jarred', 'olives', 'pickled', 'sun-dried', 'tomato paste',
      'tomato sauce'
    ]
  },
  {
    name: 'Frozen Foods',
    keywords: ['frozen']
  },
  {
    name: 'Condiments & Sauces',
    keywords: [
      'aioli', 'bbq', 'barbecue', 'dressing', 'fish sauce', 'gochujang',
      'harissa', 'hoisin', 'ketchup', 'mayonnaise', 'miso', 'mustard',
      'oyster sauce', 'relish', 'salsa', 'sauce', 'soy sauce', 'sriracha',
      'tahini', 'vinegar', 'worcestershire'
    ]
  },
  {
    name: 'International & Specialty',
    keywords: [
      'adzuki', 'curry paste', 'dashi', 'garam masala', 'kombu', 'mirin',
      'nori', 'sambal', 'shaoxing', 'tamari', 'tofu', 'yuzu'
    ]
  },
  {
    name: 'Beverages',
    keywords: [
      'beer', 'bourbon', 'brandy', 'champagne', 'coffee', 'cognac', 'liqueur',
      'rum', 'tequila', 'vodka', 'whiskey', 'wine'
    ]
  },
  {
    name: 'Deli & Prepared Foods',
    keywords: [
      'kimchi', 'pastry shell', 'pierogi', 'polenta', 'sauerkraut'
    ]
  },
  {
    name: 'Household & Misc',
    keywords: [
      'butcher\'s twine', 'cheesecloth', 'foil', 'parchment', 'ramakin',
      'ramekin', 'skewer', 'toothpick', 'twine'
    ]
  }
];

function isIngredientSubsection(entry) {
  return entry && typeof entry === 'object' && entry.subsection && Array.isArray(entry.items);
}

function detectAisle(text) {
  if (!text || typeof text !== 'string') {
    return DEFAULT_AISLE;
  }

  const normalized = text.toLowerCase();
  for (const rule of AISLE_RULES) {
    if (rule.keywords.some(keyword => normalized.includes(keyword))) {
      return rule.name;
    }
  }

  return DEFAULT_AISLE;
}

function normalizeIngredientEntry(entry) {
  if (!entry) return entry;

  if (typeof entry === 'string') {
    const item = entry.trim();
    if (!item) return null;
    return {
      item,
      aisle: detectAisle(item)
    };
  }

  if (isIngredientSubsection(entry)) {
    return {
      ...entry,
      items: entry.items
        .map(normalizeIngredientEntry)
        .filter(Boolean)
    };
  }

  if (typeof entry === 'object') {
    const item = (entry.item || '').trim();
    if (!item) {
      return entry;
    }
    const aisle = entry.aisle && entry.aisle.trim()
      ? entry.aisle.trim()
      : detectAisle(item);
    return {
      ...entry,
      item,
      aisle
    };
  }

  return entry;
}

async function processRecipeFile(filename) {
  const filePath = path.join(RECIPES_DIR, filename);
  const original = await fs.promises.readFile(filePath, 'utf8');
  const recipe = JSON.parse(original);

  if (!Array.isArray(recipe.ingredients)) {
    return false;
  }

  const updatedIngredients = recipe.ingredients
    .map(normalizeIngredientEntry)
    .filter(Boolean);

  recipe.ingredients = updatedIngredients;
  const updated = JSON.stringify(recipe, null, 2) + '\n';

  if (updated !== original) {
    await fs.promises.writeFile(filePath, updated, 'utf8');
    console.log(`Updated ${filename}`);
    return true;
  }

  return false;
}

async function main() {
  const files = await fs.promises.readdir(RECIPES_DIR);
  let updatedCount = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const changed = await processRecipeFile(file);
    if (changed) {
      updatedCount += 1;
    }
  }

  console.log(`\nFinished. Updated ${updatedCount} recipe files.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
