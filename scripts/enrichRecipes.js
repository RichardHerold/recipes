#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RECIPES_DIR = path.join(__dirname, '..', 'recipes');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
const APPLY_CHANGES = process.argv.includes('--apply');
const TARGET_ARG = process.argv.find(arg => arg.endsWith('.json'));

async function main() {
  if (!API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. Provide an API key to run enrichment.');
    process.exit(1);
  }

  const recipeFiles = await collectRecipeFiles(TARGET_ARG);
  if (!recipeFiles.length) {
    console.error('No recipe files found to enrich.');
    process.exit(1);
  }

  console.log(`Processing ${recipeFiles.length} recipe${recipeFiles.length === 1 ? '' : 's'}${APPLY_CHANGES ? ' with apply' : ' (dry run)'}.`);

  for (const file of recipeFiles) {
    try {
      const absolutePath = path.join(RECIPES_DIR, file);
      const original = await fs.promises.readFile(absolutePath, 'utf8');
      const recipe = JSON.parse(original);
      const enrichment = await requestEnrichment(recipe);
      const updated = mergeEnrichment(recipe, enrichment);
      const reordered = reorderRecipeProperties(updated);

      if (APPLY_CHANGES) {
        await fs.promises.writeFile(absolutePath, JSON.stringify(reordered, null, 2) + '\n', 'utf8');
        console.log(`✔ Updated ${file}`);
      } else {
        console.log(`ℹ Would update ${file}`);
      }
    } catch (error) {
      console.error(`Failed to process ${file}:`, error.message);
    }
  }
}

async function collectRecipeFiles(targetFile) {
  if (targetFile) {
    return [targetFile];
  }
  const entries = await fs.promises.readdir(RECIPES_DIR);
  return entries.filter(entry => entry.endsWith('.json'));
}

async function requestEnrichment(recipe) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildPrompt(recipe)
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${body}`);
  }

  const payload = await response.json();
  const textBlock = Array.isArray(payload.content)
    ? payload.content.map(block => block.text || '').join('\n').trim()
    : '';

  if (!textBlock) {
    throw new Error('No content returned from Anthropic response.');
  }

  try {
    return JSON.parse(textBlock);
  } catch (error) {
    throw new Error('Failed to parse enrichment JSON: ' + error.message);
  }
}

function buildPrompt(recipe) {
  const base = {
    instructions: recipe.instructions,
    ingredients: recipe.ingredients,
    name: recipe.name,
    description: recipe.description || null
  };

  return [
    'You are an assistant that enriches structured recipe data for a Mise en Place cooking mode.',
    'Given the following recipe JSON, extract the following:',
    '- `tags`: array of descriptive tags (lowercase, hyphen-safe).',
    '- `equipment`: array of objects `{"name", "id", "label"}`. Parse ALL equipment mentioned in the instructions and ingredients. Include bowls, pans, skillets, mixers, measuring cups, baking sheets, tools, and any other vessels or equipment. Generate stable kebab-case ids like `bowl-dry`, `skillet-large`, `measuring-cup`. For each piece of equipment, provide a descriptive `label` explaining its purpose in the recipe.',
    '- `techniques`: array of verbs matching the technique library (e.g., saute, deglaze, temper).',
    '- `time`: object with numeric minutes `{ prep, activeCook, passive, total }`. Leave fields off when unknown.',
    '- `ingredients`: enrich each object with `aisle`, `prep`, `prepAction`, `prepTime` (minutes), and `destination` (equipment id). Maintain the original order and quantities.',
    '- Prefer destinations that match equipment ids you provide. Leave null when unclear.',
    '',
    'Equipment extraction guidelines:',
    '- Scan all instruction text carefully for equipment mentions (e.g., "in a bowl", "using a skillet", "with a whisk", "on a baking sheet")',
    '- Include all sizes and types (e.g., "large bowl", "small bowl", "12-inch skillet")',
    '- Extract equipment from ingredient subsections if they contain equipment lists',
    '- Create unique, descriptive IDs for each piece of equipment',
    '- Provide helpful labels that explain when/why each piece of equipment is used',
    '',
    'Respond ONLY with JSON using this shape:',
    '{',
    '  "tags": [],',
    '  "equipment": [{"name": "", "id": "", "label": ""}],',
    '  "techniques": [],',
    '  "time": {"prep": 0, "activeCook": 0, "passive": 0, "total": 0},',
    '  "ingredients": [{"index": 0, "aisle": "", "prep": "", "prepAction": "", "prepTime": 0, "destination": ""}]',
    '}',
    '',
    'Recipe JSON:',
    JSON.stringify(base, null, 2)
  ].join('\n');
}

function mergeEnrichment(recipe, enrichment) {
  const updated = { ...recipe };

  if (Array.isArray(enrichment.tags) && enrichment.tags.length) {
    updated.tags = uniqueStrings(enrichment.tags.concat(recipe.tags || []));
  }

  if (Array.isArray(enrichment.techniques) && enrichment.techniques.length) {
    updated.techniques = uniqueStrings(enrichment.techniques);
  }

  if (Array.isArray(enrichment.equipment) && enrichment.equipment.length) {
    updated.equipment = enrichment.equipment
      .map(entry => ({
        name: entry.name,
        id: entry.id || null,
        label: entry.label || null
      }));
  }

  if (enrichment.time && typeof enrichment.time === 'object') {
    updated.time = filterTime(enrichment.time);
  }

  if (Array.isArray(enrichment.ingredients) && Array.isArray(updated.ingredients)) {
    updated.ingredients = updated.ingredients.map((original, index) => {
      const overlay =
        enrichment.ingredients.find(entry => entry.index === index) ||
        enrichment.ingredients[index];
      if (!overlay) return original;
      if (typeof original === 'string') {
        return enrichPrimitiveIngredient(original, overlay);
      }
      return {
        ...original,
        aisle: overlay.aisle || original.aisle,
        prep: overlay.prep || original.prep,
        prepAction: overlay.prepAction || original.prepAction,
        prepTime: normalizeNumber(overlay.prepTime, original.prepTime),
        destination: overlay.destination || original.destination
      };
    });
  }

  return updated;
}

function enrichPrimitiveIngredient(text, overlay) {
  const payload = { item: text };
  if (overlay.aisle) payload.aisle = overlay.aisle;
  if (overlay.prep) payload.prep = overlay.prep;
  if (overlay.prepAction) payload.prepAction = overlay.prepAction;
  if (overlay.destination) payload.destination = overlay.destination;
  if (overlay.prepTime != null) payload.prepTime = overlay.prepTime;
  return payload;
}

function normalizeNumber(value, fallback) {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof fallback === 'number') {
    return fallback;
  }
  return undefined;
}

function filterTime(time) {
  const result = {};
  ['prep', 'activeCook', 'passive', 'total'].forEach(key => {
    if (typeof time[key] === 'number' && time[key] >= 0) {
      result[key] = Math.round(time[key]);
    }
  });
  return result;
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean).map(value => value.toString().trim())));
}

// Reorder recipe properties to ensure equipment comes before instructions
function reorderRecipeProperties(recipe) {
  // Define the desired property order
  const orderedRecipe = {};
  
  // Core fields (always present)
  if (recipe.name !== undefined) orderedRecipe.name = recipe.name;
  if (recipe.category !== undefined) orderedRecipe.category = recipe.category;
  if (recipe.description !== undefined) orderedRecipe.description = recipe.description;
  if (recipe.prepTime !== undefined) orderedRecipe.prepTime = recipe.prepTime;
  if (recipe.cookTime !== undefined) orderedRecipe.cookTime = recipe.cookTime;
  if (recipe.image !== undefined) orderedRecipe.image = recipe.image;
  if (recipe.ingredients !== undefined) orderedRecipe.ingredients = recipe.ingredients;
  
  // Equipment comes before instructions
  if (recipe.equipment !== undefined) orderedRecipe.equipment = recipe.equipment;
  if (recipe.instructions !== undefined) orderedRecipe.instructions = recipe.instructions;
  
  // Remaining fields
  if (recipe.dateAdded !== undefined) orderedRecipe.dateAdded = recipe.dateAdded;
  if (recipe.tags !== undefined) orderedRecipe.tags = recipe.tags;
  if (recipe.time !== undefined) orderedRecipe.time = recipe.time;
  if (recipe.techniques !== undefined) orderedRecipe.techniques = recipe.techniques;
  
  // Include any other properties that might exist
  for (const key in recipe) {
    if (!orderedRecipe.hasOwnProperty(key)) {
      orderedRecipe[key] = recipe[key];
    }
  }
  
  return orderedRecipe;
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
