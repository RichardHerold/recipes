<script>
  import { scaleIngredient } from '../utils/scaling.js';

  export let ingredients = [];
  export let scaleFactor = 1;

  const isSubsection = (entry) => entry && typeof entry === 'object' && entry.subsection && Array.isArray(entry.items);
</script>

<ul class="ingredients-list">
  {#each ingredients as entry (entry.item || entry.subsection || entry)}
    {#if isSubsection(entry)}
      <li class="ingredient-subsection">
        <p class="subsection-label">{entry.subsection}</p>
        <svelte:self ingredients={entry.items} {scaleFactor} />
      </li>
    {:else}
      {@const meta = scaleIngredient(entry, scaleFactor)}
      {#if meta.display}
        <li class:flagged={Boolean(meta.warning)}>
          <span>{meta.display}</span>
          {#if meta.warning}
            <small class="ingredient-note">{meta.warning}</small>
          {/if}
        </li>
      {/if}
    {/if}
  {/each}
</ul>
