<script>
  export let currentServings = 1;
  export let original = 1;
  export let unit = 'servings';

  const MIN_SERVINGS = 0.25;

  function commit(value) {
    const sanitized = Math.max(MIN_SERVINGS, Math.round(value * 100) / 100);
    currentServings = sanitized;
  }

  function increment() {
    commit(currentServings + 1);
  }

  function decrement() {
    if (currentServings <= MIN_SERVINGS) return;
    commit(currentServings - 1);
  }

  function reset() {
    commit(original || 1);
  }

  function half() {
    commit(Math.max(MIN_SERVINGS, (original || 1) / 2));
  }

  function double() {
    commit((original || 1) * 2);
  }

  $: isScaled = original ? currentServings !== original : currentServings !== 1;
  $: displayUnit = currentServings === 1 && unit === 'servings' ? 'serving' : unit;
</script>

<div class="scaling-controls">
  <div class="main-control">
    <button type="button" on:click={decrement} disabled={currentServings <= MIN_SERVINGS}>−</button>
    <span class="servings-display">
      {currentServings} {displayUnit}
    </span>
    <button type="button" on:click={increment}>+</button>
  </div>

  <div class="presets">
    <button type="button" on:click={half}>Half</button>
    <button type="button" class:active={!isScaled} on:click={reset}>Original</button>
    <button type="button" on:click={double}>Double</button>
  </div>

  {#if isScaled && original}
    <p class="scale-note">Scaled from {original}</p>
  {/if}
</div>
