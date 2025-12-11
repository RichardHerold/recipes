# My Recipe Collection 🍳

A beautiful, searchable recipe website hosted on GitHub Pages. Store and display your personal recipes with easy search and category filtering.

## Features

- 🔍 **Search Recipes** - Search by name, ingredients, or instructions
- 🏷️ **Category Filtering** - Filter recipes by category (Appetizer, Main Course, Dessert, etc.)
- ➕ **Easy Recipe Addition** - Use the admin interface to add new recipes
- 🛒 **Grocery-Friendly Metadata** - Tag each ingredient with the grocery aisle it belongs to (hidden from the UI but useful for shopping lists)
- ✅ **Export to Google Tasks** - Authenticate with Google and send selected recipes plus an aisle-organized shopping list straight to Google Tasks
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

## Creating Shopping Lists with Google Tasks

The recipe collection can create organized shopping lists in Google Tasks, combining ingredients from multiple recipes and grouping them by grocery aisle.

### Setting Up Google Tasks API

#### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click **New Project**
4. Enter a project name (e.g., "Recipe Shopping Lists")
5. Click **Create**
6. Wait for the project to be created, then select it from the dropdown

#### Step 2: Enable Google Tasks API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Tasks API"
3. Click on **Google Tasks API**
4. Click **Enable**
5. Wait for the API to be enabled (this may take a minute)

#### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **OAuth client ID**
4. If prompted, configure the OAuth consent screen first:

   - Choose **External** (unless you have a Google Workspace account)
   - Fill in the required fields:
     - App name: "Recipe Collection" (or your choice)
     - User support email: Your email
     - Developer contact: Your email
   - Click **Save and Continue**
   - On the Scopes page, click **Save and Continue**
   - On the Test users page, add your email address, then click **Save and Continue**
   - Review and click **Back to Dashboard**

5. Back in Credentials, click **+ CREATE CREDENTIALS** → **OAuth client ID**
6. Select **Web application** as the application type
7. Give it a name (e.g., "Recipe Collection Web Client")
8. Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
   - `https://yourusername.github.io` (replace with your GitHub Pages URL)
   - `http://localhost:8000` (for local development)
   - `http://localhost:8080` (if using a different local port)
9. Under **Authorized redirect URIs**, you can leave this empty (not needed for this implementation)
10. Click **Create**
11. **Copy the Client ID** - it will look like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`

#### Step 4: Configure the Client ID in Your App

1. Open `index.html` in your project
2. Find the `<script src="app.js"></script>` tag near the end of the file
3. Add the Client ID configuration **before** the app.js script tag:

```html
<script>
  window.GOOGLE_TASKS_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
</script>
<script src="app.js"></script>
```

Replace `YOUR_CLIENT_ID.apps.googleusercontent.com` with the actual Client ID you copied.

**Important Notes:**

- The Client ID is safe to expose publicly (it's designed for client-side use)
- You can commit this to your repository - it's not a secret
- Make sure to use your actual GitHub Pages domain in the authorized origins

#### Step 5: Deploy and Test

1. Commit and push your changes:

   ```bash
   git add index.html
   git commit -m "Configure Google Tasks API"
   git push origin main
   ```

2. Wait for GitHub Pages to update (usually takes 1-2 minutes)

3. Visit your site and try creating a shopping list:
   - Click **Make Shopping List**
   - Click on recipes to select them (they'll be highlighted)
   - Click **Create Shopping List** when ready
   - You'll be prompted to sign in with Google and authorize access
   - The shopping list will appear in your Google Tasks default list

### Using the Shopping List Feature

1. **Enter Selection Mode**

   - Click the **Make Shopping List** button
   - All recipes will be collapsed for easier selection
   - The button text changes to **Create Shopping List**

2. **Select Recipes**

   - Click on recipe cards to select them (they'll be highlighted)
   - Click again to deselect
   - The selection count updates automatically

3. **Create the Shopping List**

   - Once you've selected recipes, the **Create Shopping List** button turns black
   - Click it to create the shopping list
   - You'll be prompted to sign in with Google if not already signed in
   - The shopping list is created in your Google Tasks default list

4. **Single Recipe Shopping List**
   - Expand any recipe card
   - Click the **Make Shopping List** button on the card
   - This creates a task with just that recipe's ingredients and instructions

### Shopping List Organization

When multiple recipes are selected, ingredients are:

- **Combined** - Duplicate ingredients are merged with quantities added together
- **Categorized** - Grouped by grocery aisle:
  - Produce
  - Meat
  - Dairy
  - Frozen
  - Bakery/Baking
  - Pantry/Dry Goods
  - Spices
  - Beverages
  - Other
- **Formatted** - Quantities and units are properly formatted (e.g., "2 cups flour" + "1 cup flour" = "3 cups flour")

### Troubleshooting

**"Google Tasks client ID is not configured"**

- Make sure you've added the `window.GOOGLE_TASKS_CLIENT_ID` script in `index.html`
- Verify the Client ID is correct (no extra spaces or quotes)
- Check that the script is placed before `app.js` loads

**"Authorization was not granted"**

- You may have clicked "Cancel" on the Google sign-in popup
- Try again and make sure to click "Allow" when prompted

**"Google Tasks request failed"**

- Check that the Google Tasks API is enabled in your Google Cloud project
- Verify your authorized JavaScript origins include your GitHub Pages URL
- Make sure you're signed in to the correct Google account

**Token expired errors**

- The app automatically refreshes tokens, but if issues persist:
  - Clear your browser cache
  - Sign out and sign back in to Google
  - Check that cookies are enabled in your browser

**Shopping list not appearing in Google Tasks**

- Check your Google Tasks default list (usually "My Tasks")
- Make sure you authorized the app to access Google Tasks
- Try creating a shopping list again

### Adding Recipes

1. **Using the Admin Interface**

   - Visit `admin.html` on your site (or `admin.html` locally)
   - Fill in the recipe form:
     - Recipe name (required)
     - Category (required)
     - Description (optional)
     - Recipe Image URL (optional) - See "Adding Images" section below
     - Prep time and cook time (optional)
     - Ingredients (add multiple, at least one required) with an optional grocery section for each ingredient
     - Instructions (add multiple, at least one required)
   - Click **Generate Recipe File**
   - Copy the JSON content or download the file
   - Save the file in the `recipes/` folder with a descriptive name (e.g., `chocolate-chip-cookies.json`)
   - The form now includes dedicated inputs for prep actions, destination equipment ids, tags, techniques, and a full time breakdown to power Mise en Place mode

2. **Update recipes-index.json**

   - After adding a new recipe file, update `recipes-index.json`
   - Add the filename to the `recipes` array:
     ```json
     {
       "recipes": ["sample-recipe.json", "your-new-recipe.json"]
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
    {
      "item": "Ingredient 1",
      "aisle": "Produce"
    },
    {
      "item": "Ingredient 2"
    }
  ],
  "instructions": ["Step 1", "Step 2"],
  "dateAdded": "2024-01-15T10:00:00.000Z"
}
```

**Categories:** Appetizer, Main Course, Dessert, Side Dish, Breakfast, Lunch, Dinner, Snack, Beverage, Other

## Recipe Schema

The recipe schema supports both simple recipes and enhanced formats with metadata for advanced features. All new fields are optional, ensuring full backward compatibility.

> 📖 **For complete schema documentation**, see **[SCHEMA.md](SCHEMA.md)** - a comprehensive guide covering all fields, formats, examples, and best practices.

### Quick Reference

**Required fields:**

- `name` - Recipe name
- `ingredients` - Array of ingredients
- `instructions` - Array of instructions

**Common optional fields:**

- `category` - Primary category
- `description` - Recipe description
- `prepTime` / `cookTime` - Time as strings (e.g., "15 minutes")
- `image` - Image URL or path
- `dateAdded` - ISO date string

**Enhanced optional fields:**

- `tags` - Array of tags for filtering
- `time` - Structured time breakdown `{ prep, activeCook, passive, total }` (minutes)
- `equipment` - Array of equipment objects `[{ name, id, label }]`
- `techniques` - Array of technique names
- Ingredient objects can include: `aisle`, `prep`, `prepAction`, `prepTime`, `destination`
- Instruction objects can include: `text`, `destination`

### Basic Example

```json
{
  "name": "Chocolate Chip Cookies",
  "category": "Dessert",
  "prepTime": "15 minutes",
  "cookTime": "12 minutes",
  "ingredients": [
    "2 1/4 cups all-purpose flour",
    "1 cup butter, softened",
    "3/4 cup granulated sugar"
  ],
  "instructions": [
    "Preheat oven to 375°F",
    "Mix dry ingredients in a bowl",
    "Bake for 9-11 minutes"
  ]
}
```

### Migration

To migrate existing recipes to the new schema format:

```bash
node scripts/migrateRecipes.js --apply
```

This script converts `category` to `tags`, ingredient `category` to `aisle`, parses time strings into a `time` object, and adds empty arrays for `equipment` and `techniques`.

**For detailed schema documentation, including all field descriptions, formats, examples, and best practices, see [SCHEMA.md](SCHEMA.md).**

### Using Subsections in Recipes

You can organize ingredients and instructions into subsections with custom titles. This is useful for grouping related items (e.g., "Mise en Place", "Equipment", "For the Sauce", etc.).

#### Subsections in Ingredients

You can mix regular ingredients with subsections:

```json
{
  "ingredients": [
    {
      "item": "2 cups all-purpose flour",
      "aisle": "Baking & Spices"
    },
    {
      "item": "1 cup sugar",
      "aisle": "Baking & Spices"
    },
    {
      "subsection": "Equipment",
      "items": [
        {
          "item": "Mixing bowl",
          "aisle": "Household & Misc"
        },
        {
          "item": "Whisk",
          "aisle": "Household & Misc"
        },
        {
          "item": "Baking pan",
          "aisle": "Household & Misc"
        }
      ]
    },
    {
      "subsection": "Optional Toppings",
      "items": [
        {
          "item": "Chocolate chips",
          "aisle": "Other"
        },
        {
          "item": "Chopped nuts",
          "aisle": "Produce"
        }
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

### Technique Library

Common techniques are defined in `data/techniques.json`. Each entry includes:

- **`label`**: Display name
- **`definition`**: Technique description
- **`tips`**: Helpful tips (optional)
- **`videoUrl`**: Link to demonstration video (optional)

Update this file to add more entries or customize wording.

### AI Enrichment Workflow

A helper script is available to backfill metadata using the Claude API:

```bash
# Dry run (no files written)
ANTHROPIC_API_KEY=sk-... node scripts/enrichRecipes.js recipe-file.json

# Apply changes to every recipe
ANTHROPIC_API_KEY=sk-... node scripts/enrichRecipes.js --apply
```

The script sends each recipe to Claude with clear instructions about the desired schema and merges the response into the existing JSON (ingredients stay in order). Use `--apply` only after reviewing the dry-run output. You can target an individual file by passing its filename; otherwise every recipe in `recipes/` is processed.

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
- Run `node scripts/categorizeIngredients.js` after adding lots of new recipes to normalize ingredient categories
- The site automatically sorts recipes by date (newest first)

## License

This project is open source and available for personal use.
