<script>
  import { activeFilters } from '../stores/ui.js';

  export let recipes = [];

  $: availableTags = Array.from(
    new Set(
      recipes
        .flatMap((recipe) => recipe.tags || [])
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  function toggleTag(tag) {
    if (!tag) return;
    activeFilters.update((current) => {
      const set = new Set(current);
      if (set.has(tag)) {
        set.delete(tag);
      } else {
        set.add(tag);
      }
      return Array.from(set);
    });
  }

  function clearAll() {
    activeFilters.set([]);
  }
</script>

{#if availableTags.length}
  <div class="category-filter">
    <p class="category-label">Filter by tag</p>
    <div class="category-buttons">
      {#each availableTags as tag}
        <button
          type="button"
          class="category-btn"
          class:active={$activeFilters.includes(tag)}
          on:click={() => toggleTag(tag)}
        >
          {tag}
        </button>
      {/each}
      {#if $activeFilters.length}
        <button type="button" class="category-btn" on:click={clearAll}>
          Clear
        </button>
      {/if}
    </div>
  </div>
{/if}
