import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [svelte()],
  base: mode === 'ghpages' ? '/recipes/' : '/',
  build: {
    outDir: 'dist'
  }
}));
