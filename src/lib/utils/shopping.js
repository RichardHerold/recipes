import { scaleIngredient } from './scaling.js';
import { flattenIngredients, normalizeUnicodeFractions } from './parsing.js';
import { formatQuantity } from './formatting.js';

const CATEGORY_GROUPS = [
  { key: 'produce', label: 'Produce' },
  { key: 'meat', label: 'Meat' },
  { key: 'dairy', label: 'Dairy' },
  { key: 'frozen', label: 'Frozen' },
  { key: 'bakery', label: 'Bakery/Baking' },
  { key: 'pantry', label: 'Pantry/Dry Goods' },
  { key: 'spices', label: 'Spices' },
  { key: 'beverages', label: 'Beverages' },
  { key: 'other', label: 'Other' }
];

const CATEGORY_SYNONYMS = {
  produce: 'produce',
  vegetables: 'produce',
  vegetable: 'produce',
  fruit: 'produce',
  fruits: 'produce',
  meat: 'meat',
  protein: 'meat',
  poultry: 'meat',
  seafood: 'meat',
  dairy: 'dairy',
  eggs: 'dairy',
  'dairy & eggs': 'dairy',
  'dairy and eggs': 'dairy',
  cheese: 'dairy',
  frozen: 'frozen',
  freezer: 'frozen',
  bakery: 'bakery',
  baking: 'bakery',
  'bakery/baking': 'bakery',
  pantry: 'pantry',
  'dry goods': 'pantry',
  spices: 'spices',
  seasonings: 'spices',
  herbs: 'spices',
  beverages: 'beverages',
  drinks: 'beverages',
  other: 'other',
  misc: 'other'
};

export function buildShoppingList(recipes = [], scaleLookup = {}) {
  const entries = collectEntries(recipes, scaleLookup);
  const combined = combineLikeEntries(entries);
  const grouped = groupByCategory(combined);
  const warnings = extractWarnings(entries);
  return { entries: combined, grouped, warnings };
}

function collectEntries(recipes, scaleLookup) {
  const entries = [];
  recipes.forEach((recipe) => {
    const factor = scaleLookup?.[recipe.name]?.scaleFactor ?? 1;
    const ingredients = flattenIngredients(recipe.ingredients || []);
    ingredients.forEach((ingredient) => {
      const scaled = scaleIngredient(ingredient, factor);
      if (!scaled.display) return;
      entries.push({
        recipe: recipe.name,
        display: scaled.display,
        parsedName: scaled.parsedName,
        unit: scaled.unit,
        quantity: scaled.scaledQuantity,
        category: normalizeCategory(ingredient?.aisle || ingredient?.category),
        rawCategory: ingredient?.aisle || ingredient?.category || null,
        warning: scaled.warning
      });
    });
  });
  return entries;
}

function combineLikeEntries(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    const key = entry.parsedName
      ? `${entry.parsedName.toLowerCase()}||${entry.unit || ''}`
      : `raw||${normalizeUnicodeFractions(entry.display).toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      if (typeof entry.quantity === 'number') {
        existing.quantity = (existing.quantity || 0) + entry.quantity;
      }
      existing.sources.add(entry.recipe);
      existing.count += 1;
      if (!existing.category && entry.category) {
        existing.category = entry.category;
      }
    } else {
      map.set(key, {
        key,
        display: entry.display,
        parsedName: entry.parsedName,
        unit: entry.unit,
        quantity: entry.quantity,
        category: entry.category,
        sources: new Set([entry.recipe]),
        count: 1
      });
    }
  });
  return Array.from(map.values()).map((entry) => {
    const display = entry.quantity && entry.unit
      ? `${formatQuantity(entry.quantity, entry.unit)} ${entry.parsedName || ''}`.trim() || entry.display
      : entry.display;
    return {
      ...entry,
      display,
      sources: Array.from(entry.sources)
    };
  });
}

function groupByCategory(entries) {
  const grouped = CATEGORY_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    items: []
  }));
  const fallback = grouped[grouped.length - 1];
  entries.forEach((entry) => {
    const target = grouped.find((group) => group.key === (entry.category || 'other')) || fallback;
    target.items.push({
      ...entry,
      display: entry.quantity && entry.unit
        ? `${formatQuantity(entry.quantity, entry.unit)} ${entry.parsedName || ''}`.trim()
        : entry.display
    });
  });
  grouped.forEach((group) => {
    group.items.sort((a, b) => (a.parsedName || a.display).localeCompare(b.parsedName || b.display));
  });
  return grouped;
}

function extractWarnings(entries) {
  const warnings = new Set();
  entries.forEach((entry) => {
    if (entry.warning) {
      warnings.add(entry.warning);
    }
  });
  return Array.from(warnings);
}

function normalizeCategory(value) {
  if (!value) return null;
  const cleaned = value
    .toString()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return CATEGORY_SYNONYMS[cleaned] || null;
}

export function formatShoppingNote(grouped, warnings) {
  const lines = [];
  grouped.forEach((group) => {
    if (!group.items.length) return;
    lines.push(`${group.label}:`);
    group.items.forEach((item) => {
      lines.push(`- ${item.display}`);
    });
    lines.push('');
  });
  if (warnings.length) {
    lines.push(`⚠️ ${warnings.join(', ')}`);
  }
  return lines.join('\n').trim();
}
