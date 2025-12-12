<script>
  import { searchQuery } from '../stores/ui.js';
</script>

<section class="search-section" id="search">
  <div class="search-bar">
    <span class="search-icon" aria-hidden="true">🔍</span>
    <input
      type="search"
      name="recipe-search"
      placeholder="Search by name, ingredient, or technique"
      bind:value={$searchQuery}
      autocomplete="off"
    />
  </div>
</section>
