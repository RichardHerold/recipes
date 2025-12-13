<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import RecipeDetail from './RecipeDetail.svelte';
  import { scalingStore } from '../stores/scaling.js';
  import {
    selectedRecipes,
    shoppingListMode,
    toggleRecipeSelection
  } from '../stores/ui.js';
  import { formatDuration } from '../utils/formatting.js';

  export let recipe;
  export let focusedSlug = '';

  const dispatch = createEventDispatcher();

  let expanded = false;
  let shareFeedback = '';
  let feedbackTimeout;

  onMount(() => {
    scalingStore.initRecipe(recipe);
    if (focusedSlug && recipe.slug === focusedSlug) {
      expanded = true;
    }
  });

  $: isSelected = $selectedRecipes.includes(recipe.name);
  $: if (focusedSlug && focusedSlug !== recipe.slug && expanded) {
    expanded = false;
  }
  $: if (focusedSlug && recipe.slug === focusedSlug && !expanded && !$shoppingListMode) {
    expanded = true;
  }
  $: if (!focusedSlug && expanded && !$shoppingListMode) {
    expanded = false;
  }
  $: if ($shoppingListMode && expanded) {
    expanded = false;
    dispatch('toggle', { expanded });
  }

  $: prepLabel = getTimeLabel(recipe, 'prep', 'prepTime');
  $: cookLabel = getTimeLabel(recipe, 'activeCook', 'cookTime');
  $: tagLabel = recipe.category || (Array.isArray(recipe.tags) && recipe.tags[0]) || 'Uncategorized';

  function toggleCard() {
    if ($shoppingListMode) {
      toggleRecipeSelection(recipe.name);
      return;
    }
    expanded = !expanded;
    dispatch('toggle', { expanded });
  }

  function handleKeyToggle(event) {
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCard();
    }
  }

  async function shareRecipe(event) {
    event.stopPropagation();
    const url = buildShareUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.name, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showShareFeedback();
      } else {
        window.prompt('Copy this link', url); // eslint-disable-line no-alert
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  }

  function buildShareUrl() {
    if (typeof window === 'undefined') {
      return `#${recipe.slug}`;
    }
    return `${window.location.origin}${window.location.pathname}#${recipe.slug}`;
  }

  function showShareFeedback() {
    shareFeedback = 'Link copied';
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
      shareFeedback = '';
    }, 2000);
  }

  function getTimeLabel(recipe, structuredKey, fallbackKey) {
    if (recipe?.time?.[structuredKey]) {
      return formatDuration(recipe.time[structuredKey]);
    }
    if (recipe?.[fallbackKey]) {
      return recipe[fallbackKey];
    }
    return null;
  }
</script>

<article
  class="recipe-card"
  class:expanded={expanded}
  class:selected={isSelected}
  data-recipe-name={recipe.name}
  data-recipe-slug={recipe.slug}
>
  <div class="recipe-card-inner">
    {#if recipe.image}
      <div class="recipe-image-container" role="button" tabindex="0" aria-expanded={expanded} on:click={toggleCard} on:keydown={handleKeyToggle}>
        <img class="recipe-image" src={recipe.image} alt={recipe.name} loading="lazy" />
      </div>
    {/if}

    <div class="recipe-header" role="button" tabindex="0" aria-expanded={expanded} on:click={toggleCard} on:keydown={handleKeyToggle}>
      <div class="recipe-header-main">
        <h2 class="recipe-title">{recipe.name}</h2>
        {#if recipe.description}
          <p class="recipe-description">{recipe.description}</p>
        {/if}
        <div class="recipe-meta">
          {#if prepLabel}
            <span>Prep: {prepLabel}</span>
          {/if}
          {#if cookLabel}
            <span>Cook: {cookLabel}</span>
          {/if}
        </div>
      </div>
      <div class="recipe-header-controls">
        <div class="recipe-actions">
          <button type="button" class="recipe-action-btn" on:click|stopPropagation={shareRecipe}>
            Share
          </button>
        </div>
        {#if shareFeedback}
          <span class="export-hint">{shareFeedback}</span>
        {/if}
      </div>
    </div>

    <div class="recipe-details prevent-card-toggle">
      {#if expanded}
        <RecipeDetail {recipe} />
      {/if}
    </div>

    <span class="recipe-category">{tagLabel}</span>
  </div>
</article>
