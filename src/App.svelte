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

  let focusedSlug = '';

  onMount(() => {
    loadRecipes();
    if (typeof window === 'undefined') {
      return;
    }
    focusedSlug = window.location.hash.replace('#', '') || '';
    const handleHashChange = () => {
      focusedSlug = window.location.hash.replace('#', '') || '';
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  });

  $: filteredRecipes = filterRecipes($recipes, $searchQuery, $activeFilters);
  $: hasSelection = $selectionCount > 0;
  $: selectionLabel = formatSelectionLabel($selectionCount);

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
    if (!$shoppingListMode) {
      shoppingListMode.set(true);
      showShoppingModal.set(false);
      collapseExpandedRecipes();
      return;
    }
    if (hasSelection) {
      showShoppingModal.set(true);
    }
  }

  function handleClearSelection() {
    clearSelections();
    shoppingListMode.set(false);
    showShoppingModal.set(false);
    collapseExpandedRecipes();
  }

  function collapseExpandedRecipes() {
    updateShareUrl('');
  }

  function updateShareUrl(slug) {
    if (typeof window === 'undefined') {
      focusedSlug = slug || '';
      return;
    }
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    if (slug) {
      window.history.replaceState({}, '', `${baseUrl}#${slug}`);
    } else {
      window.history.replaceState({}, '', baseUrl);
    }
    focusedSlug = slug || '';
  }

  function handleCardToggle(recipe, event) {
    const { expanded } = event.detail;
    if (expanded) {
      updateShareUrl(recipe.slug);
    } else if (focusedSlug === recipe.slug) {
      updateShareUrl('');
    }
  }

  function recipeKey(recipe, index) {
    const base = recipe?.slug || recipe?.name || 'recipe';
    return `${base}-${index}`;
  }

  function formatSelectionLabel(count) {
    const unit = count === 1 ? 'recipe' : 'recipes';
    return `${count} ${unit} selected`;
  }
</script>

<Header />

<main class="container">
  <SearchBar />
  <FilterTags recipes={$recipes} />

  <section class="export-controls">
    <div class="export-controls-row">
      <div>
        <p class="selection-count">{selectionLabel}</p>
        <p class="export-hint">Select recipes to build a shopping list</p>
      </div>
      <div class="export-buttons">
        <button
          type="button"
          class="export-btn export-btn-secondary"
          class:export-btn-primary={$shoppingListMode}
          data-selection-mode={$shoppingListMode}
          on:click={handleShoppingAction}
          disabled={$shoppingListMode && !hasSelection}
        >
          {$shoppingListMode ? 'Create Shopping List' : 'Make Shopping List'}
        </button>
        {#if $shoppingListMode}
          <button
            type="button"
            class="export-btn export-btn-secondary"
            on:click={handleClearSelection}
          >
            Clear Selection
          </button>
        {/if}
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
        <RecipeCard
          {recipe}
          focusedSlug={focusedSlug}
          on:toggle={(event) => handleCardToggle(recipe, event)}
        />
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
