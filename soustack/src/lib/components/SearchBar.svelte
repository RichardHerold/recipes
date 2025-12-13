<script>
  import { searchQuery } from '../stores/ui.js';
</script>

<section class="search-section" id="search">
  <div class="search-bar">
    <span class="search-icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" role="img" focusable="false">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5" fill="none" />
        <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </span>
    <input
      type="search"
      name="recipe-search"
      placeholder="Search by name, ingredient, or technique"
      bind:value={$searchQuery}
      autocomplete="off"
    />
  </div>
</section>
