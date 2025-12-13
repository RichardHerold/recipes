<script>
  import { techniques } from '../stores/recipes.js';
  import { flattenIngredients } from '../utils/parsing.js';
  import { scaleIngredient } from '../utils/scaling.js';
  import { formatDuration } from '../utils/formatting.js';

  export let recipe;
  export let scaleFactor = 1;

  const DEFAULT_ACTION_LABEL = 'General Prep';

  $: miseIngredients = flattenIngredients(recipe?.ingredients || []).filter(
    (item) => item?.prepAction || item?.prep || item?.destination || item?.item
  );

  $: groupedPrep = groupByAction(miseIngredients);
  $: techniqueDetails = (recipe?.techniques || []).map((name) => ({
    name,
    detail: $techniques?.[name] || null
  }));
  $: prepCount = miseIngredients.length;

  function groupByAction(items) {
    const map = new Map();
    items.forEach((item) => {
      const key = item.prepAction || DEFAULT_ACTION_LABEL;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    });
    return Array.from(map.entries()).map(([label, list]) => ({
      label,
      items: list
    }));
  }

  function formatPrepMeta(item) {
    const parts = [];
    if (item.prep) {
      parts.push(item.prep);
    }
    if (item.destination) {
      parts.push(`To: ${item.destination}`);
    }
    return parts.join(' • ');
  }
</script>

<div class="mise-view">
  <header class="mise-header">
    <div>
      <p class="mise-total-time">{prepCount} prep {prepCount === 1 ? 'task' : 'tasks'}</p>
      {#if recipe?.time?.prep}
        <p class="mise-remaining-time">Prep time {formatDuration(recipe.time.prep)}</p>
      {/if}
    </div>
  </header>

  {#if groupedPrep.length}
    <section class="mise-section">
      <h4>Mise Checklist</h4>
      {#each groupedPrep as group}
        <div class="mise-group">
          <div class="mise-group-header">
            <div>
              <p class="mise-group-title">{group.label}</p>
              <p class="mise-group-subtitle">Prep before you start</p>
            </div>
            <span class="mise-group-count">{group.items.length} item{group.items.length === 1 ? '' : 's'}</span>
          </div>
          <ul class="mise-checklist">
            {#each group.items as item}
              {@const meta = scaleIngredient(item, scaleFactor)}
              <li>
                <label class="mise-check-row">
                  <input type="checkbox" class="mise-check" />
                  <span class="mise-check-label">{meta.display || item.item}</span>
                  {#if formatPrepMeta(item)}
                    <span class="mise-check-meta">{formatPrepMeta(item)}</span>
                  {/if}
                </label>
                {#if item.prepTime}
                  <span class="mise-check-subtext">~ {item.prepTime} min</span>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </section>
  {:else}
    <p class="empty-state">Add prep metadata to ingredients to unlock mise en place view.</p>
  {/if}

  {#if recipe?.equipment?.length}
    <section class="mise-section mise-equipment">
      <h4>Equipment</h4>
      <ul class="mise-checklist">
        {#each recipe.equipment as tool, index}
          <li>
            <label class="mise-check-row">
              <input type="checkbox" class="mise-check" />
              <span class="mise-check-label">{tool.name || tool.label || `Tool ${index + 1}`}</span>
              {#if tool.label}
                <span class="mise-check-subtext">{tool.label}</span>
              {/if}
            </label>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if techniqueDetails.length}
    <section class="mise-section mise-techniques">
      <h4>Techniques</h4>
      <ul class="mise-checklist">
        {#each techniqueDetails as technique}
          <li>
            <label class="mise-check-row">
              <input type="checkbox" class="mise-check" />
              <span class="mise-check-label">{technique.detail?.label || technique.name}</span>
            </label>
            {#if technique.detail?.definition}
              <p class="mise-check-subtext">{technique.detail.definition}</p>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
