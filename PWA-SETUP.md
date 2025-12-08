# Progressive Web App (PWA) Setup Guide

This recipe collection has been configured as a Progressive Web App (PWA), which means users can install it on their devices and use it offline.

## What's Included

1. **manifest.json** - Defines the app metadata, icons, and display settings
2. **service-worker.js** - Handles offline functionality and caching
3. **Updated index.html** - Links the manifest and includes PWA meta tags
4. **Updated app.js** - Registers the service worker

## Required Icon Files

The PWA requires two icon files in the root directory:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

### Generating Icons

1. **Using the Icon Generator:**
   - Open `icon-generator.html` in a browser
   - Click "Generate Icons"
   - Download both icon files and save them to the root directory

2. **Using an Image Editor:**
   - Create a square image (at least 512x512)
   - Design a simple icon representing recipes (e.g., a cookbook, plate, or utensil)
   - Export as PNG at both 192x192 and 512x512 sizes
   - Save as `icon-192.png` and `icon-512.png` in the root directory

3. **Online Tools:**
   - Use tools like [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
   - Or [RealFaviconGenerator](https://realfavicongenerator.net/)

## Testing the PWA

1. **Local Testing:**
   - Serve the site using a local server (required for service workers)
   - Use `python -m http.server 8000` or `npx serve`
   - Open Chrome DevTools > Application > Service Workers to verify registration

2. **Installation:**
   - On desktop: Look for the install icon in the address bar
   - On mobile: Use the browser's "Add to Home Screen" option
   - The app will work offline after the first visit

3. **Offline Testing:**
   - Open DevTools > Network tab
   - Enable "Offline" mode
   - Refresh the page - it should still work!

## Features

- **Offline Support:** Recipes are cached and available offline
- **Installable:** Users can install the app on their devices
- **Fast Loading:** Assets are cached for faster subsequent loads
- **App-like Experience:** Runs in standalone mode when installed

## Service Worker Caching Strategy

- **Precache:** Core app files (HTML, CSS, JS, manifest) are cached on install
- **Runtime Cache:** Recipe JSON files are cached as they're loaded
- **Network First:** Tries network first, falls back to cache if offline

## Updating the Service Worker

When you update the app:
1. Update the `CACHE_NAME` version in `service-worker.js`
2. The old cache will be automatically cleaned up
3. Users will get the new version on their next visit

## Browser Support

PWAs work on:
- Chrome/Edge (Android & Desktop)
- Safari (iOS 11.3+, macOS)
- Firefox (Android & Desktop)
- Samsung Internet

## Notes

- Service workers require HTTPS (or localhost for development)
- GitHub Pages automatically provides HTTPS
- The app will work offline after the first successful visit




