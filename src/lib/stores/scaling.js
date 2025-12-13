import { writable } from 'svelte/store';

const MIN_FACTOR = 0.25;
const MAX_FACTOR = 4;

function createScalingStore() {
  const { subscribe, update } = writable({});

  function initRecipe(recipe) {
    if (!recipe?.name) return;
    update((state) => {
      if (state[recipe.name]) {
        return state;
      }
      return {
        ...state,
        [recipe.name]: buildInitialState(recipe)
      };
    });
  }

  function setServings(name, servings) {
    if (!name) return;
    update((state) => {
      const entry = state[name];
      if (!entry) return state;
      const nextServings = clampServings(servings ?? entry.currentServings, entry);
      const nextState = {
        ...entry,
        currentServings: nextServings,
        scaleFactor: entry.baseServings
          ? clampFactor(nextServings / entry.baseServings)
          : 1
      };
      return { ...state, [name]: nextState };
    });
  }

  function adjustServings(name, delta) {
    if (!name) return;
    update((state) => {
      const entry = state[name];
      if (!entry) return state;
      const nextServings = clampServings(entry.currentServings + delta, entry);
      const nextState = {
        ...entry,
        currentServings: nextServings,
        scaleFactor: entry.baseServings
          ? clampFactor(nextServings / entry.baseServings)
          : 1
      };
      return { ...state, [name]: nextState };
    });
  }

  function setFactor(name, factor) {
    if (!name) return;
    update((state) => {
      const entry = state[name];
      if (!entry || !entry.baseServings) return state;
      const nextFactor = clampFactor(factor);
      const nextState = {
        ...entry,
        scaleFactor: nextFactor,
        currentServings: Math.max(0.25, Math.round(entry.baseServings * nextFactor * 100) / 100)
      };
      return { ...state, [name]: nextState };
    });
  }

  function reset(name) {
    if (!name) return;
    update((state) => {
      const entry = state[name];
      if (!entry) return state;
      return {
        ...state,
        [name]: {
          ...entry,
          currentServings: entry.baseServings || 1,
          scaleFactor: 1
        }
      };
    });
  }

  return {
    subscribe,
    initRecipe,
    setServings,
    adjustServings,
    setFactor,
    reset
  };
}

function buildInitialState(recipe) {
  const base = typeof recipe?.servings?.amount === 'number'
    ? recipe.servings.amount
    : null;
  const unit = recipe?.servings?.unit || 'servings';
  const note = recipe?.servings?.note || null;

  return {
    baseServings: base,
    unit,
    note,
    currentServings: base || 1,
    scaleFactor: 1
  };
}

function clampServings(value, entry) {
  const fallback = entry.baseServings || 1;
  const min = Math.max(0.25, fallback * MIN_FACTOR);
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(value, fallback * MAX_FACTOR));
}

function clampFactor(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 1;
  }
  return Math.max(MIN_FACTOR, Math.min(value, MAX_FACTOR));
}

export const scalingStore = createScalingStore();

export function getScaleFactor(state, name) {
  return state?.[name]?.scaleFactor ?? 1;
}

export function getServings(state, name) {
  const entry = state?.[name];
  if (!entry) return null;
  return {
    current: entry.currentServings,
    base: entry.baseServings,
    unit: entry.unit,
    note: entry.note
  };
}
