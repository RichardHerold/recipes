import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { applyThemePreferences, getSiteDisplayName } from './lib/config/index.js';

const target = typeof document !== 'undefined' ? document.getElementById('app') : null;
const app = target ? mount(App, { target }) : null;

if (typeof document !== 'undefined') {
  applyThemePreferences(document);
  document.title = getSiteDisplayName();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}service-worker.js`)
      .catch((error) => {
        console.warn('Service worker registration failed', error);
      });
  });
}

export default app;
