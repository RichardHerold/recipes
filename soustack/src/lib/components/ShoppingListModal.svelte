<script>
  import { onMount, tick } from 'svelte';
  import { showShoppingModal } from '../stores/ui.js';
  import { buildShoppingList, formatShoppingNote } from '../utils/shopping.js';
  import { exportShoppingList } from '../utils/googleTasks.js';

  export let recipes = [];
  export let selectedNames = [];
  export let scaleState = {};

  let errorMessage = '';
  let isExporting = false;
  let modalRef;

  $: selectedRecipes = recipes.filter((recipe) => selectedNames.includes(recipe.name));
  $: shoppingData = buildShoppingList(selectedRecipes, scaleState);
  $: notes = formatShoppingNote(shoppingData.grouped, shoppingData.warnings);

  onMount(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handleKey);
    tick().then(() => modalRef?.focus());
    return () => window.removeEventListener('keydown', handleKey);
  });

  async function copyList() {
    if (!notes) return;
    try {
      await navigator.clipboard.writeText(notes);
      errorMessage = 'Copied to clipboard';
    } catch (err) {
      errorMessage = 'Copy failed';
    } finally {
      setTimeout(() => (errorMessage = ''), 2000);
    }
  }

  async function exportToGoogle() {
    try {
      isExporting = true;
      errorMessage = '';
      const title = selectedRecipes.length === 1
        ? `${selectedRecipes[0].name} Shopping List`
        : `Shopping List (${selectedRecipes.length} recipes)`;
      await exportShoppingList({
        title,
        items: shoppingData.entries.map((entry) => entry.display),
        notes
      });
      errorMessage = 'Sent to Google Tasks';
    } catch (err) {
      errorMessage = err?.message || 'Export failed';
    } finally {
      isExporting = false;
    }
  }

  function close() {
    showShoppingModal.set(false);
    errorMessage = '';
  }
</script>

{#if selectedRecipes.length}
  <div class="modal-backdrop">
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      bind:this={modalRef}
    >
      <header>
        <h3>Shopping List ({selectedRecipes.length} recipes)</h3>
        <button type="button" class="modal-close" on:click={close} aria-label="Close modal">×</button>
      </header>

      <div class="modal-body">
        {#each shoppingData.grouped as group}
          {#if group.items.length}
            <p class="subsection-label">{group.label}</p>
            <ul>
              {#each group.items as item}
                <li>{item.display}</li>
              {/each}
            </ul>
          {/if}
        {/each}
      </div>

      {#if errorMessage}
        <p class="modal-hint">{errorMessage}</p>
      {/if}

      <div class="modal-actions">
        <button type="button" on:click={copyList} disabled={!notes}>Copy</button>
        <button type="button" on:click={exportToGoogle} disabled={isExporting}>
          {#if isExporting}Exporting…{:else}Google Tasks{/if}
        </button>
      </div>
    </div>
  </div>
{:else}
  <div class="modal-backdrop">
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      bind:this={modalRef}
    >
      <header>
        <h3>No recipes selected</h3>
        <button type="button" class="modal-close" on:click={close}>×</button>
      </header>
      <p class="modal-hint">Select at least one recipe to build a shopping list.</p>
    </div>
  </div>
{/if}
