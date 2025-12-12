<script>
  import { techniques } from '../stores/recipes.js';
  import { flattenIngredients } from '../utils/parsing.js';
  import { scaleIngredient } from '../utils/scaling.js';

  export let recipe;
  export let scaleFactor = 1;

  $: miseIngredients = flattenIngredients(recipe?.ingredients || []).filter(
    (item) => item?.prepAction || item?.prep || item?.destination
  );

  $: groupedPrep = groupByAction(miseIngredients);
  $: techniqueDetails = (recipe?.techniques || []).map((name) => ({
    name,
    detail: $techniques?.[name]
  }));

  function groupByAction(items) {
    const map = new Map();
    items.forEach((item) => {
      const key = item.prepAction || 'General Prep';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    });
    return Array.from(map.entries()).map(([label, list]) => ({ label, list }));
  }
</script>

<div class="mise-en-place">
  {#if groupedPrep.length}
    <section>
      <h3>Prep Queue</h3>
      {#each groupedPrep as group}
        <div class="mise-group">
          <p class="subsection-label">{group.label}</p>
          <ul>
            {#each group.list as item}
              {@const meta = scaleIngredient(item, scaleFactor)}
              <li>
                <span>{meta.display}</span>
                {#if item.prep}
                  <small>{item.prep}</small>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </section>
  {/if}

  {#if recipe?.equipment?.length}
    <section>
      <h3>Equipment</h3>
      <ul class="equipment-list">
        {#each recipe.equipment as tool}
          <li>{tool.label || tool.name}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if techniqueDetails.length}
    <section>
      <h3>Techniques</h3>
      <ul class="technique-list">
        {#each techniqueDetails as technique}
          <li>
            <strong>{technique.detail?.label || technique.name}</strong>
            {#if technique.detail?.definition}
              <p>{technique.detail.definition}</p>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
