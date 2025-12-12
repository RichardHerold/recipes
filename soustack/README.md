# Soustack Recipes

A migrated version of the recipe collection now built with **Svelte + Vite**. The app keeps the original JSON recipe format, adds component-based UI, client-side state stores, ingredient scaling, mise-en-place mode, Google Tasks shopping-list export, and continues to work as a static Progressive Web App deployable to both Vercel and GitHub Pages.

## Project Structure

```
soustack/
├── public/
│   ├── recipes/              # All recipe JSON files (copied from the legacy project)
│   ├── recipes-index.json    # Lists recipe filenames to load
│   ├── data/techniques.json  # Technique glossary used in Mise en Place mode
│   ├── images/               # Recipe images & docs
│   ├── manifest.json         # PWA manifest
│   ├── service-worker.js     # Offline caching & runtime recipe cache
│   └── icon-192.png, icon-512.png
├── src/
│   ├── App.svelte            # Main layout + filtering + shopping list actions
│   ├── app.css               # Global styles migrated from the vanilla app
│   ├── main.js               # Mounts Svelte app + registers service worker
│   └── lib/
│       ├── components/       # Header, cards, scaling controls, shopping modal, etc.
│       ├── stores/           # recipes, UI, scaling state
│       └── utils/            # scaling math, formatting, parsing, shopping + Google Tasks helpers
└── vite.config.js            # Adds `base` handling for GitHub Pages mode
```

## Getting Started

```bash
npm install
npm run dev        # starts Vite on http://localhost:5173
```

The dev server hot-reloads Svelte components, fetches JSON from `public/`, and runs entirely client-side.

## Building & Deploying

| Command | Description |
| --- | --- |
| `npm run build` | Standard Vite build (base `/`) for Vercel or any static host |
| `npm run build:ghpages` | Builds with `--mode ghpages`, setting `base` to `/soustack/` |
| `npm run deploy:ghpages` | Builds with the GitHub Pages base and publishes `dist/` via `gh-pages` |
| `npm run preview` | Serves the production build locally |
| `npm run preview:ghpages` | Builds+serves with the `/soustack/` base so you can spot-check Pages locally |

### Vercel

Use the default build command (`npm run build`) and set the output directory to `dist/`. Vercel will serve the app at the root path.

### GitHub Pages

1. Run `npm run deploy:ghpages` locally (requires `gh-pages` to have push access).
2. Ensure the Pages project is configured to serve from the `gh-pages` branch.
3. The custom `base` in `vite.config.js` automatically rewrites absolute asset URLs to `/soustack/...` during the `build:ghpages` command, so routing works under the repository subpath.

## Google Tasks Integration

The shopping list modal can push combined ingredients directly to Google Tasks. Configure the OAuth client ID by editing the inline script in `index.html`:

```html
<script>
  window.GOOGLE_TASKS_CLIENT_ID = "123456789-your-client-id.apps.googleusercontent.com";
</script>
```

The client ID is safe to commit. The export button loads the Google Identity script on demand, requests the `tasks` scope, creates a dedicated task list, and populates the merged ingredient lines as tasks.

## Data & PWA Notes

- Recipes remain editable JSON files in `public/recipes/`. Update `public/recipes-index.json` whenever files are added or removed.
- Any images referenced inside the recipe JSON should live under `public/images/` (paths are relative to the site root).
- `public/service-worker.js` precaches the shell (`index.html`, manifest, data files) and runtime caches recipe JSON for offline browsing. The worker automatically respects the base path so it works on both deployments.
- The manifest plus icons keep the site installable. Update the placeholder icons in `public/` if you have branded artwork.

## Testing Checklist

- `npm run dev` – verify filtering, scaling, and modal interactions locally.
- `npm run build && npm run preview` – smoke-test the production bundle.
- `npm run build:ghpages` – confirm the GitHub Pages build compiles.
- `npm run preview:ghpages` – simulate the `/soustack/` base locally (runs `build:ghpages` under the hood).

Feel free to iterate on the Svelte components or add new ones—state is centralized in the stores under `src/lib/stores`, so UI composition stays straightforward.
