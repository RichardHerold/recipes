import { writable } from 'svelte/store';

export const recipes = writable([]);
export const loading = writable(true);
export const error = writable(null);
export const techniques = writable({});

const RECIPES_INDEX_PATH = `${import.meta.env.BASE_URL}recipes-index.json`;
const TECHNIQUES_PATH = `${import.meta.env.BASE_URL}data/techniques.json`;

export async function loadRecipes() {
  loading.set(true);
  error.set(null);

  try {
    const [indexData, techniqueData] = await Promise.all([
      fetch(RECIPES_INDEX_PATH).then(handleJsonResponse),
      fetch(TECHNIQUES_PATH).then(handleTechniquesResponse)
    ]);

    techniques.set(techniqueData || {});

    const recipeFiles = Array.isArray(indexData?.recipes)
      ? indexData.recipes
      : [];
    const filesToLoad = recipeFiles.length
      ? recipeFiles
      : ['sample-recipe.json'];

    const loadedRecipes = await Promise.all(
      filesToLoad.map(async (filename) => {
        try {
          const recipeResponse = await fetch(
            `${import.meta.env.BASE_URL}recipes/${filename}`
          );
          const recipe = await handleJsonResponse(recipeResponse);
          return normalizeRecipe(recipe, filename);
        } catch (recipeError) {
          console.error(`Failed to load recipe ${filename}`, recipeError);
          return null;
        }
      })
    );

    const filteredRecipes = loadedRecipes
      .filter(Boolean)
      .sort(sortByDateThenName);

    recipes.set(filteredRecipes);
  } catch (err) {
    console.error('Recipe loading failed', err);
    error.set('Failed to load recipes. Double-check recipes-index.json.');
    recipes.set([]);
  } finally {
    loading.set(false);
  }
}

function handleJsonResponse(response) {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

async function handleTechniquesResponse(response) {
  if (!response.ok) {
    return {};
  }
  try {
    return await response.json();
  } catch (err) {
    console.warn('Unable to parse techniques.json', err);
    return {};
  }
}

function normalizeRecipe(recipe, fallbackName = '') {
  if (!recipe) return null;
  const normalized = { ...recipe };
  const name = normalized.name || fallbackName.replace(/\.json$/i, '');
  normalized.name = name;
  normalized.slug = normalized.slug || slugify(name);
  normalized.tags = Array.isArray(normalized.tags)
    ? normalized.tags
    : normalized.category
    ? [normalized.category]
    : [];
  return normalized;
}

function sortByDateThenName(a, b) {
  const dateA = a?.dateAdded ? new Date(a.dateAdded).getTime() : 0;
  const dateB = b?.dateAdded ? new Date(b.dateAdded).getTime() : 0;
  if (dateA !== dateB) {
    return dateB - dateA;
  }
  return (a?.name || '').localeCompare(b?.name || '');
}

export function slugify(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}
