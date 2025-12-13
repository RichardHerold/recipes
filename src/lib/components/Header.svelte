<script>
  import config, { getSiteDisplayName, getSiteTagline } from '../config/index.js';

  const title = getSiteDisplayName();
  const tagline = getSiteTagline();
  const logoUrl = config.site.logoUrl?.trim() || null;
</script>

<header>
  <div class="container site-header">
    {#if logoUrl}
      <img class="site-logo" src={logoUrl} alt={`${title} logo`} loading="lazy" />
    {/if}

    <div class="site-heading">
      <h1>{title}</h1>
      {#if tagline}
        <p class="lead">{tagline}</p>
      {/if}
    </div>
  </div>
</header>
