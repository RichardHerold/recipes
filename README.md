# My Recipe Collection 🍳

A beautiful, searchable recipe website hosted on GitHub Pages. Store and display your personal recipes with easy search and category filtering.

## Features

- 🔍 **Search Recipes** - Search by name, ingredients, or instructions
- 🏷️ **Category Filtering** - Filter recipes by category (Appetizer, Main Course, Dessert, etc.)
- ➕ **Easy Recipe Addition** - Use the admin interface to add new recipes
- 📸 **Recipe Photos** - Add images to make your recipes more appealing
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile
- 🎨 **Modern UI** - Clean, modern interface with smooth animations
- 📲 **Progressive Web App (PWA)** - Installable app with offline support

## Getting Started

### Setup for GitHub Pages

1. **Push this repository to GitHub**
   ```bash
   git add .
   git commit -m "Initial recipe website setup"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click on **Settings** → **Pages**
   - Under **Source**, select **Deploy from a branch**
   - Choose **main** branch and **/ (root)** folder
   - Click **Save**
   - Your site will be available at `https://yourusername.github.io/recipes/`

### Adding Recipes

1. **Using the Admin Interface**
   - Visit `admin.html` on your site (or `admin.html` locally)
   - Fill in the recipe form:
     - Recipe name (required)
     - Category (required)
     - Description (optional)
     - Recipe Image URL (optional) - See "Adding Images" section below
     - Prep time and cook time (optional)
     - Ingredients (add multiple, at least one required)
     - Instructions (add multiple, at least one required)
   - Click **Generate Recipe File**
   - Copy the JSON content or download the file
   - Save the file in the `recipes/` folder with a descriptive name (e.g., `chocolate-chip-cookies.json`)

2. **Update recipes-index.json**
   - After adding a new recipe file, update `recipes-index.json`
   - Add the filename to the `recipes` array:
     ```json
     {
       "recipes": [
         "sample-recipe.json",
         "your-new-recipe.json"
       ]
     }
     ```

3. **Commit and Push**
   ```bash
   git add recipes/your-new-recipe.json recipes-index.json
   git commit -m "Add new recipe: Your Recipe Name"
   git push origin main
   ```

### Manual Recipe Creation

You can also create recipe files manually. Each recipe should be a JSON file in the `recipes/` folder with this structure:

```json
{
  "name": "Recipe Name",
  "category": "Category Name",
  "description": "Optional description",
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "image": "images/recipe-image.jpg",
  "ingredients": [
    "Ingredient 1",
    "Ingredient 2"
  ],
  "instructions": [
    "Step 1",
    "Step 2"
  ],
  "dateAdded": "2024-01-15T10:00:00.000Z"
}
```

**Categories:** Appetizer, Main Course, Dessert, Side Dish, Breakfast, Lunch, Dinner, Snack, Beverage, Other

### Using Subsections in Recipes

You can organize ingredients and instructions into subsections with custom titles. This is useful for grouping related items (e.g., "Mise en Place", "Equipment", "For the Sauce", etc.).

#### Subsections in Ingredients

You can mix regular ingredients with subsections:

```json
{
  "ingredients": [
    "2 cups all-purpose flour",
    "1 cup sugar",
    {
      "subsection": "Equipment",
      "items": [
        "Mixing bowl",
        "Whisk",
        "Baking pan"
      ]
    },
    {
      "subsection": "Optional Toppings",
      "items": [
        "Chocolate chips",
        "Chopped nuts"
      ]
    }
  ]
}
```

#### Subsections in Instructions

You can mix regular instructions with subsections:

```json
{
  "instructions": [
    {
      "subsection": "Mise en Place",
      "items": [
        "Preheat oven to 350°F",
        "Prepare all ingredients",
        "Line baking sheet with parchment"
      ]
    },
    "Mix dry ingredients in a large bowl",
    "Add wet ingredients and stir until combined",
    {
      "subsection": "Baking",
      "items": [
        "Bake for 12 minutes",
        "Rotate pan halfway through",
        "Cool on wire rack"
      ]
    }
  ]
}
```

**Notes:**
- Subsections are optional - you can use all regular items, all subsections, or mix them
- Each subsection has its own numbered (instructions) or bulleted (ingredients) list
- Subsection titles are displayed in uppercase with custom styling
- This feature is backward compatible - existing recipes without subsections will continue to work

### Adding Images to Recipes

You can add photos to your recipes in two ways:

1. **Local Images (Recommended)**
   - Save your recipe images in the `images/` folder
   - Use descriptive filenames (e.g., `chocolate-chip-cookies.jpg`)
   - In the admin form, enter the image path: `images/your-image-name.jpg`
   - Commit both the recipe JSON and the image file to GitHub

2. **External URLs**
   - Use any publicly accessible image URL
   - Enter the full URL in the admin form (e.g., `https://example.com/image.jpg`)

**Image Tips:**
- Recommended image size: 800x600px or similar aspect ratio
- Supported formats: JPG, PNG, WebP, GIF
- Keep file sizes reasonable (< 2MB) for faster loading
- Images are displayed at the top of recipe cards

## Progressive Web App (PWA)

This recipe collection is a **Progressive Web App**, which means users can install it on their devices and use it offline!

### PWA Features

- 📥 **Installable** - Users can install the app on their home screen (desktop and mobile)
- 🔌 **Offline Support** - All recipes are cached and available offline after the first visit
- ⚡ **Fast Loading** - Assets are cached for instant subsequent loads
- 📱 **App-like Experience** - Runs in standalone mode when installed (no browser UI)

### Installing the App

**On Desktop (Chrome/Edge):**
- Look for the install icon (➕) in the address bar
- Click it to install the app
- The app will open in its own window

**On Mobile:**
- **iOS (Safari):** Tap the Share button → "Add to Home Screen"
- **Android (Chrome):** Tap the menu (⋮) → "Install app" or "Add to Home Screen"
- The app icon will appear on your home screen

### Offline Usage

After your first visit:
1. The app automatically caches all recipes and assets
2. You can use the app completely offline
3. Recipes load instantly from cache
4. When you're back online, the app updates automatically

### PWA Setup

The PWA is already configured! The following files handle PWA functionality:

- `manifest.json` - App metadata and configuration
- `service-worker.js` - Handles offline caching
- `icon-192.png` & `icon-512.png` - App icons (see below)

**Required Icons:**
- Generate icons using `icon-generator.html` (open in browser and download)
- Or create your own 192x192 and 512x512 PNG icons
- Save as `icon-192.png` and `icon-512.png` in the root directory

For detailed PWA setup instructions, see `PWA-SETUP.md`.

### Browser Support

PWAs work on:
- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS 11.3+, macOS)
- ✅ Firefox (Android & Desktop)
- ✅ Samsung Internet

**Note:** Service workers require HTTPS (or localhost for development). GitHub Pages automatically provides HTTPS.

## File Structure

```
recipes/
├── index.html              # Main recipe display page
├── admin.html              # Recipe addition interface
├── styles.css              # Styling
├── app.js                  # Main JavaScript for displaying recipes
├── admin.js                # JavaScript for recipe form
├── manifest.json           # PWA manifest file
├── service-worker.js       # PWA service worker for offline support
├── icon-192.png           # PWA icon (192x192)
├── icon-512.png           # PWA icon (512x512)
├── icon-generator.html    # Tool to generate PWA icons
├── recipes-index.json      # List of all recipe files
├── recipes/                # Recipe JSON files folder
│   └── sample-recipe.json  # Example recipe
├── images/                 # Recipe images folder
│   └── (your recipe images here)
└── README.md               # This file
```

## Local Development

To test locally before pushing to GitHub:

**Important:** Service workers require HTTP/HTTPS (not `file://`), so you must use a local server.

1. **Using Python** (if installed):
   ```bash
   python -m http.server 8000
   ```
   Then visit `http://localhost:8000`

2. **Using Node.js** (if installed):
   ```bash
   npx http-server
   ```
   Then visit the URL shown in the terminal

3. **Using VS Code Live Server**:
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

### Testing PWA Features Locally

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Check **Service Workers** section to verify registration
4. Test offline mode:
   - Go to **Network** tab
   - Enable "Offline" checkbox
   - Refresh the page - it should still work!

## Tips

- Use descriptive filenames for recipes (e.g., `chocolate-chip-cookies.json` instead of `recipe1.json`)
- Keep recipe names unique to avoid confusion
- Update `recipes-index.json` whenever you add or remove recipes
- The site automatically sorts recipes by date (newest first)

## License

This project is open source and available for personal use.
