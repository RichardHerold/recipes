#!/usr/bin/env node

/**
 * Migration script for LIN-25
 *  - Renames ingredient `category` fields to `aisle`
 *  - Converts recipe-level `category` strings into flexible `tags` arrays
 *  - Deduplicates tags (case-insensitive) while preserving original casing
 */

const fs = require('fs').promises;
const path = require('path');

const RECIPES_DIR = path.join(__dirname, '..', 'recipes');

function isIngredientSubsection(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    entry.subsection &&
    Array.isArray(entry.items)
  );
}

function normalizeTags(recipe) {
  const collected = [];

  if (Array.isArray(recipe.tags)) {
    collected.push(
      ...recipe.tags
        .filter(tag => typeof tag === 'string')
        .map(tag => tag.trim().toLowerCase())
    );
  }

  if (typeof recipe.category === 'string' && recipe.category.trim()) {
    collected.push(recipe.category.trim().toLowerCase());
  }

  const deduped = [];
  const seen = new Set();

  collected.forEach(tag => {
    if (!tag) return;
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(tag);
  });

  return deduped;
}

function migrateIngredientEntry(entry) {
  if (!entry) return entry;

  if (typeof entry === 'string') {
    return entry;
  }

  if (isIngredientSubsection(entry)) {
    return {
      ...entry,
      items: entry.items.map(migrateIngredientEntry)
    };
  }

  if (typeof entry === 'object') {
    const migrated = { ...entry };
    if (
      Object.prototype.hasOwnProperty.call(migrated, 'category') &&
      !Object.prototype.hasOwnProperty.call(migrated, 'aisle')
    ) {
      migrated.aisle = migrated.category;
    }
    delete migrated.category;
    return migrated;
  }

  return entry;
}

async function migrateRecipe(filename) {
  const fullPath = path.join(RECIPES_DIR, filename);
  const original = await fs.readFile(fullPath, 'utf8');
  const recipe = JSON.parse(original);
  let changed = false;

  // Ingredients
  if (Array.isArray(recipe.ingredients)) {
    const updatedIngredients = recipe.ingredients.map(migrateIngredientEntry);
    if (JSON.stringify(updatedIngredients) !== JSON.stringify(recipe.ingredients)) {
      recipe.ingredients = updatedIngredients;
      changed = true;
    }
  }

  // Tags
  const tags = normalizeTags(recipe);
  const hadArray = Array.isArray(recipe.tags);
  const existingTags = hadArray ? recipe.tags : [];
  const tagsDiffer = JSON.stringify(tags) !== JSON.stringify(existingTags);
  if (tagsDiffer || !hadArray) {
    recipe.tags = tags;
    changed = true;
  } else {
    recipe.tags = existingTags;
  }

  if (Object.prototype.hasOwnProperty.call(recipe, 'category')) {
    delete recipe.category;
    changed = true;
  }

  if (!changed) {
    return false;
  }

  const updated = JSON.stringify(recipe, null, 2) + '\n';
  await fs.writeFile(fullPath, updated, 'utf8');
  return true;
}

async function run() {
  const files = await fs.readdir(RECIPES_DIR);
  let updatedCount = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const changed = await migrateRecipe(file);
      if (changed) {
        updatedCount += 1;
        console.log(`Updated ${file}`);
      }
    } catch (err) {
      console.error(`Error migrating ${file}:`, err.message);
    }
  }

  console.log(`\nMigration complete. Updated ${updatedCount} recipe files.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
