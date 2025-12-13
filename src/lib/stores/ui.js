import { derived, writable } from 'svelte/store';

export const searchQuery = writable('');
export const activeFilters = writable([]);
export const selectedRecipes = writable([]);
export const shoppingListMode = writable(false);
export const showShoppingModal = writable(false);
export const viewMode = writable('grid');

export const selectionCount = derived(selectedRecipes, ($selected) => $selected.length);

export function toggleRecipeSelection(name) {
  if (!name) return;
  selectedRecipes.update((current) => {
    const set = new Set(current);
    if (set.has(name)) {
      set.delete(name);
    } else {
      set.add(name);
    }
    return Array.from(set);
  });
}

export function clearSelections() {
  selectedRecipes.set([]);
}

export function setFilters(filters) {
  activeFilters.set(filters);
}
