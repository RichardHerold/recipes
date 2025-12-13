<script>
  import { getAttributionUrl, shouldShowAttribution } from '../config/index.js';

  const showAttribution = shouldShowAttribution();
  const repoUrl = getAttributionUrl();
</script>

{#if showAttribution}
  <footer>
    <div class="container">
      <p>
        Made with
        <a href={repoUrl} target="_blank" rel="noreferrer">Soustack</a>
      </p>
    </div>
  </footer>
{/if}
