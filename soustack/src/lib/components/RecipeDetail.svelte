<script>
  import ScalingControls from './ScalingControls.svelte';
  import IngredientList from './IngredientList.svelte';
  import InstructionList from './InstructionList.svelte';
  import MiseEnPlace from './MiseEnPlace.svelte';
  import { scalingStore } from '../stores/scaling.js';
  import { formatDuration } from '../utils/formatting.js';

  export let recipe;

  let view = 'recipe';
  let currentServings = recipe?.servings?.amount || 1;

  $: scaleState = $scalingStore?.[recipe?.name];
  $: scaleFactor = scaleState?.scaleFactor ?? 1;
  $: baseServings = scaleState?.baseServings ?? recipe?.servings?.amount;
  $: unit = scaleState?.unit || recipe?.servings?.unit || 'servings';
  $: note = recipe?.servings?.note || scaleState?.note;

  $: if (scaleState && typeof scaleState.currentServings === 'number' && Math.abs(scaleState.currentServings - currentServings) > 0.01) {
    currentServings = scaleState.currentServings;
  }

  $: if (recipe?.name && scaleState && Math.abs(currentServings - scaleState.currentServings) > 0.01) {
    scalingStore.setServings(recipe.name, currentServings);
  }

  function switchView(next) {
    view = next;
  }
</script>

{#if recipe.servings}
  <ScalingControls bind:currentServings original={baseServings} unit={unit} />
  {#if note}
    <p class="servings-note">{note}</p>
  {/if}
{/if}

<nav class="view-toggle">
  <button type="button" class:active={view === 'recipe'} on:click={() => switchView('recipe')}>
    Recipe
  </button>
  <button type="button" class:active={view === 'mise'} on:click={() => switchView('mise')}>
    Mise en Place
  </button>
</nav>

{#if view === 'recipe'}
  <div class="recipe-sections">
    <section>
      <h3>Ingredients</h3>
      <IngredientList ingredients={recipe.ingredients} scaleFactor={scaleFactor} />
    </section>
    <section>
      <h3>Instructions</h3>
      <InstructionList instructions={recipe.instructions} scaleFactor={scaleFactor} />
    </section>
  </div>
{:else}
  <MiseEnPlace {recipe} scaleFactor={scaleFactor} />
{/if}

{#if recipe.time}
  <div class="time-summary">
    {#if recipe.time.prep}
      <span>Prep {formatDuration(recipe.time.prep)}</span>
    {/if}
    {#if recipe.time.activeCook}
      <span>Active {formatDuration(recipe.time.activeCook)}</span>
    {/if}
    {#if recipe.time.total}
      <span>Total {formatDuration(recipe.time.total)}</span>
    {/if}
  </div>
{/if}
