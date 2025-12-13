import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { applyThemePreferences, getPageTitle } from './lib/config/index.js';

const target = typeof document !== 'undefined' ? document.getElementById('app') : null;
const app = target ? mount(App, { target }) : null;

if (typeof document !== 'undefined') {
  applyThemePreferences(document);
  document.title = getPageTitle();
}

if ('serviceWorker' in navigator) {
  // Unregister old service workers from /recipes/ path (one-time cleanup)
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      if (registration.scope.includes('/recipes/')) {
        // Unregister old service workers from /recipes/ path
        console.log('Unregistering old service worker from /recipes/ path');
        registration.unregister();
      }
    });
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}service-worker.js`)
      .then((registration) => {
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('New service worker available. Reload to update.');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('Service worker registration failed', error);
      });
  });
}

export default app;
