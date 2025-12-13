import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base = mode === 'ghpages' ? '/soustack/' : '/';
  
  return {
    plugins: [
      svelte(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(/%VITE_BASE_URL%/g, base);
        }
      }
    ],
    base,
    build: {
      outDir: 'dist'
    }
  };
});
