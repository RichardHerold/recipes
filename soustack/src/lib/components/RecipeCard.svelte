<script>
  import { onMount } from 'svelte';
  import RecipeDetail from './RecipeDetail.svelte';
  import { scalingStore } from '../stores/scaling.js';
  import {
    selectedRecipes,
    shoppingListMode,
    toggleRecipeSelection
  } from '../stores/ui.js';

  export let recipe;

  let expanded = false;

  onMount(() => {
    scalingStore.initRecipe(recipe);
  });

  $: isSelected = $selectedRecipes.includes(recipe.name);

  function toggleCard() {
    if ($shoppingListMode) {
      toggleRecipeSelection(recipe.name);
      return;
    }
    expanded = !expanded;
  }

  function handleSelect(event) {
    event.stopPropagation();
    toggleRecipeSelection(recipe.name);
  }

  function handleKeyToggle(event) {
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCard();
    }
  }
</script>

<article
  class="recipe-card"
  class:expanded={expanded}
  class:selected={isSelected}
  data-recipe-name={recipe.slug}
>
  <div
    class="recipe-card-inner"
    on:click={toggleCard}
    on:keydown={handleKeyToggle}
    tabindex="0"
    role="button"
    aria-expanded={expanded}
  >
    {#if recipe.image}
      <div class="recipe-image-container">
        <img class="recipe-image" src={recipe.image} alt={recipe.name} loading="lazy" />
      </div>
    {/if}

    <div class="recipe-header">
      <div class="recipe-header-main">
        <h2>{recipe.name}</h2>
        {#if recipe.description}
          <p class="recipe-description">{recipe.description}</p>
        {/if}
        <div class="recipe-meta">
          {#if recipe.servings?.amount}
            <span>Serves {recipe.servings.amount} {recipe.servings.unit || 'servings'}</span>
          {/if}
          {#if recipe.time?.total}
            <span>{recipe.time.total} min total</span>
          {/if}
        </div>
      </div>
      <div class="recipe-header-controls">
        {#if recipe.tags?.length}
          <div class="recipe-tags">
            {#each recipe.tags as tag}
              <span class="recipe-tag">{tag}</span>
            {/each}
          </div>
        {/if}
        <button
          type="button"
          class="recipe-select"
          class:selected={isSelected}
          aria-pressed={isSelected}
          on:click={handleSelect}
        >
          {#if isSelected}Selected{:else}Select{/if}
        </button>
      </div>
    </div>

    {#if expanded}
      <div class="recipe-content">
        <RecipeDetail {recipe} />
      </div>
    {/if}
  </div>
</article>
