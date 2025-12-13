import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')
});

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
