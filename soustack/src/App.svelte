<script>
  import { onMount } from 'svelte';
  import Header from './lib/components/Header.svelte';
  import SearchBar from './lib/components/SearchBar.svelte';
  import FilterTags from './lib/components/FilterTags.svelte';
  import RecipeCard from './lib/components/RecipeCard.svelte';
  import ShoppingListModal from './lib/components/ShoppingListModal.svelte';
  import { recipes, loading, error, loadRecipes } from './lib/stores/recipes.js';
  import {
    searchQuery,
    activeFilters,
    selectedRecipes,
    shoppingListMode,
    showShoppingModal,
    selectionCount,
    clearSelections
  } from './lib/stores/ui.js';
  import { scalingStore } from './lib/stores/scaling.js';

  onMount(() => {
    loadRecipes();
  });

  $: filteredRecipes = filterRecipes($recipes, $searchQuery, $activeFilters);
  $: hasSelection = $selectionCount > 0;

  function filterRecipes(list, query, filters) {
    if (!Array.isArray(list)) return [];
    const trimmedQuery = query.trim().toLowerCase();
    const active = filters.map((f) => f.toLowerCase());

    return list.filter((recipe) => {
      const matchesQuery = !trimmedQuery || matchesSearch(recipe, trimmedQuery);
      const matchesFilters = !active.length || recipe.tags?.some?.((tag) => active.includes(tag.toLowerCase()));
      return matchesQuery && matchesFilters;
    });
  }

  function matchesSearch(recipe, query) {
    const haystack = [recipe.name, recipe.description, ...(recipe.tags || [])]
      .concat((recipe.ingredients || []).map((item) => (typeof item === 'string' ? item : item.item)))
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  }

  function handleShoppingAction() {
    if (hasSelection) {
      showShoppingModal.set(true);
    } else {
      shoppingListMode.set(true);
    }
  }

  function toggleSelectionMode() {
    shoppingListMode.update((value) => !value);
    if (!$shoppingListMode) {
      clearSelections();
    }
  }

  function recipeKey(recipe, index) {
    const base = recipe?.slug || recipe?.name || 'recipe';
    return `${base}-${index}`;
  }
</script>

<Header />

<main class="container">
  <SearchBar />
  <FilterTags recipes={$recipes} />

  <section class="export-controls">
    <div class="export-controls-row">
      <div>
        <p class="selection-count">{$selectionCount} selected</p>
        <p class="export-hint">Select recipes to build a shopping list</p>
      </div>
      <div class="export-buttons">
        <button
          type="button"
          class="export-btn export-btn-primary"
          on:click={handleShoppingAction}
        >
          {$shoppingListMode && !hasSelection ? 'Select recipes' : 'Make Shopping List'}
        </button>
        <button
          type="button"
          class="export-btn export-btn-secondary"
          class:active={$shoppingListMode}
          on:click={toggleSelectionMode}
        >
          {$shoppingListMode ? 'Done Selecting' : 'Select Recipes'}
        </button>
        <button
          type="button"
          class="export-btn export-btn-link"
          disabled={!hasSelection}
          on:click={clearSelections}
        >
          Clear
        </button>
      </div>
    </div>
  </section>

  {#if $loading}
    <p>Loading recipes…</p>
  {:else if $error}
    <p class="error">{$error}</p>
  {:else if !filteredRecipes.length}
    <p id="noResults">No recipes match that search.</p>
  {:else}
    <div class="recipes-grid" id="recipesGrid">
      {#each filteredRecipes as recipe, index (recipeKey(recipe, index))}
        <RecipeCard {recipe} />
      {/each}
    </div>
  {/if}
</main>

{#if $showShoppingModal}
  <ShoppingListModal
    recipes={$recipes}
    selectedNames={$selectedRecipes}
    scaleState={$scalingStore}
  />
{/if}
