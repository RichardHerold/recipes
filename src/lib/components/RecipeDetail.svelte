<script>
  import IngredientList from './IngredientList.svelte';
  import InstructionList from './InstructionList.svelte';
  import MiseEnPlace from './MiseEnPlace.svelte';
  import { scalingStore } from '../stores/scaling.js';
  import { formatDuration, formatQuantity } from '../utils/formatting.js';
  import config from '../config/index.js';

  export let recipe;

  const scalingEnabled = config.features.enableScaling !== false;

  let view = 'cook';

  $: scaleState = scalingEnabled ? $scalingStore?.[recipe?.name] : null;
  $: scaleFactor = scalingEnabled ? scaleState?.scaleFactor ?? 1 : 1;
  $: baseServings = scaleState?.baseServings ?? recipe?.servings?.amount ?? null;
  $: currentServings = scaleState?.currentServings ?? baseServings;
  $: unit = scaleState?.unit || recipe?.servings?.unit || 'servings';
  $: note = recipe?.servings?.note || scaleState?.note || '';
  $: isServingUnit = !unit ? true : /serving|portion/i.test(unit);
  $: servingsLabel = isServingUnit ? 'Serves' : 'Makes';
  $: hasScaleWarnings = scalingEnabled && Array.isArray(recipe?.scaleWarnings) && recipe.scaleWarnings.length > 0 && scaleFactor !== 1;

  function setView(next) {
    view = next;
  }

  function adjustServings(delta) {
    if (!scalingEnabled || !recipe?.name) return;
    scalingStore.adjustServings(recipe.name, delta);
  }

  function setServingsTo(value) {
    if (!scalingEnabled || !recipe?.name) return;
    scalingStore.setServings(recipe.name, value);
  }

  function resetServings() {
    if (!scalingEnabled || !recipe?.name) return;
    scalingStore.reset(recipe.name);
  }

  function halfServings() {
    if (!scalingEnabled || !baseServings) return;
    setServingsTo(Math.max(0.25, baseServings / 2));
  }

  function doubleServings() {
    if (!scalingEnabled || !baseServings) return;
    setServingsTo(baseServings * 2);
  }

  function formatServingsValue(value) {
    if (typeof value !== 'number') {
      return baseServings ? formatQuantity(baseServings, null) : '—';
    }
    return formatQuantity(value, null);
  }
</script>

<div class="recipe-view-toggle">
  <button type="button" class="recipe-view-btn" class:active={view === 'cook'} on:click={() => setView('cook')}>
    Recipe
  </button>
  <button type="button" class="recipe-view-btn" class:active={view === 'mise'} on:click={() => setView('mise')}>
    Mise en Place
  </button>
</div>

<div class="recipe-view-panels">
  <section class="recipe-view-panel" class:active={view === 'cook'}>
    <div class="cook-view-grid">
      {#if scalingEnabled && baseServings}
        <div class="servings-section full-width-block prevent-card-toggle">
          <div class="servings-stepper-row">
            <span class="servings-label">{servingsLabel}</span>
            <div class="servings-stepper">
              <button
                type="button"
                class="servings-btn"
                on:click={() => adjustServings(-1)}
                aria-label="Decrease servings"
              >
                −
              </button>
              <span class="servings-value">{formatServingsValue(currentServings)}</span>
              <button
                type="button"
                class="servings-btn"
                on:click={() => adjustServings(1)}
                aria-label="Increase servings"
              >
                +
              </button>
            </div>
            <span class="servings-unit">{unit}</span>
            {#if note}
              <span class="servings-note">({note})</span>
            {/if}
          </div>
          <div class="servings-presets">
            <button type="button" class="servings-preset-btn" on:click={halfServings} disabled={!baseServings}>
              Half
            </button>
            <button
              type="button"
              class="servings-preset-btn"
              class:active={scaleFactor === 1}
              on:click={resetServings}
              disabled={scaleFactor === 1}
            >
              Original
            </button>
            <button type="button" class="servings-preset-btn" on:click={doubleServings} disabled={!baseServings}>
              Double
            </button>
          </div>
          <div class="servings-meta-row">
            {#if scaleFactor !== 1 && baseServings}
              <span class="servings-scaled-badge">
                Scaled from {formatServingsValue(baseServings)} {unit}
              </span>
            {/if}
            <button type="button" class="servings-reset-btn" on:click={resetServings} disabled={scaleFactor === 1}>
              Reset
            </button>
          </div>
        </div>
      {/if}

      {#if hasScaleWarnings}
        <div class="scale-warning-box full-width-block prevent-card-toggle">
          <div class="scale-warning-header">
            <span class="scale-warning-title">⚠️ Scaling Tips</span>
          </div>
          <ul class="scale-warning-list">
            {#each recipe.scaleWarnings as warning}
              <li>{warning}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if recipe.ingredients?.length}
        <section class="ingredients-section">
          <h3>Ingredients</h3>
          <IngredientList ingredients={recipe.ingredients} scaleFactor={scaleFactor} />
        </section>
      {/if}

      {#if recipe.instructions?.length}
        <section class="instructions-section">
          <h3>Instructions</h3>
          <InstructionList instructions={recipe.instructions} scaleFactor={scaleFactor} />
        </section>
      {/if}
    </div>

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
  </section>

  <section class="recipe-view-panel" class:active={view === 'mise'}>
    <MiseEnPlace {recipe} scaleFactor={scaleFactor} />
  </section>
</div>
