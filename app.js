// Recipe data storage
let allRecipes = [];
let filteredRecipes = [];
const selectedRecipeNames = new Set();
let isExportInProgress = false;
let isSelectionMode = false;

const GOOGLE_TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';
let googleScriptPromise = null;
let googleTokenClient = null;
let googleAccessToken = null;
let googleTokenExpiry = 0;

const CATEGORY_GROUPS = [
    { key: 'produce', label: 'Produce' },
    { key: 'meat', label: 'Meat' },
    { key: 'dairy', label: 'Dairy' },
    { key: 'frozen', label: 'Frozen' },
    { key: 'bakery', label: 'Bakery/Baking' },
    { key: 'pantry', label: 'Pantry/Dry Goods' },
    { key: 'spices', label: 'Spices' },
    { key: 'beverages', label: 'Beverages' },
    { key: 'other', label: 'Other' }
];

const CATEGORY_SYNONYMS = {
    'produce': 'produce',
    'vegetable': 'produce',
    'vegetables': 'produce',
    'fruit': 'produce',
    'fruits': 'produce',
    'meat': 'meat',
    'protein': 'meat',
    'poultry': 'meat',
    'seafood': 'meat',
    'dairy': 'dairy',
    'dairy eggs': 'dairy',
    'dairy and eggs': 'dairy',
    'eggs': 'dairy',
    'cheese': 'dairy',
    'frozen': 'frozen',
    'freezer': 'frozen',
    'bakery': 'bakery',
    'baking': 'bakery',
    'baking spices': 'bakery',
    'bakery baking': 'bakery',
    'bakery/baking': 'bakery',
    'pantry': 'pantry',
    'dry goods': 'pantry',
    'pantry dry goods': 'pantry',
    'canned goods': 'pantry',
    'spices': 'spices',
    'seasonings': 'spices',
    'seasoning': 'spices',
    'herbs': 'spices',
    'beverages': 'beverages',
    'drinks': 'beverages',
    'other': 'other',
    'misc': 'other',
    'uncategorized': 'other'
};

const CATEGORY_LABEL_BY_KEY = CATEGORY_GROUPS.reduce((acc, group) => {
    acc[group.key] = group.label;
    return acc;
}, {});

const UNIT_SYNONYMS = {
    'cup': { base: 'cup', plural: 'cups' },
    'cups': { base: 'cup', plural: 'cups' },
    'tablespoon': { base: 'tablespoon', plural: 'tablespoons' },
    'tablespoons': { base: 'tablespoon', plural: 'tablespoons' },
    'tbsp': { base: 'tablespoon', plural: 'tablespoons' },
    'teaspoon': { base: 'teaspoon', plural: 'teaspoons' },
    'teaspoons': { base: 'teaspoon', plural: 'teaspoons' },
    'tsp': { base: 'teaspoon', plural: 'teaspoons' },
    'ounce': { base: 'ounce', plural: 'ounces' },
    'ounces': { base: 'ounce', plural: 'ounces' },
    'oz': { base: 'ounce', plural: 'ounces' },
    'fluid ounce': { base: 'fluid ounce', plural: 'fluid ounces' },
    'fluid ounces': { base: 'fluid ounce', plural: 'fluid ounces' },
    'pound': { base: 'pound', plural: 'pounds' },
    'pounds': { base: 'pound', plural: 'pounds' },
    'lb': { base: 'pound', plural: 'pounds' },
    'lbs': { base: 'pound', plural: 'pounds' },
    'clove': { base: 'clove', plural: 'cloves' },
    'cloves': { base: 'clove', plural: 'cloves' },
    'slice': { base: 'slice', plural: 'slices' },
    'slices': { base: 'slice', plural: 'slices' },
    'can': { base: 'can', plural: 'cans' },
    'cans': { base: 'can', plural: 'cans' },
    'package': { base: 'package', plural: 'packages' },
    'packages': { base: 'package', plural: 'packages' },
    'stick': { base: 'stick', plural: 'sticks' },
    'sticks': { base: 'stick', plural: 'sticks' },
    'quart': { base: 'quart', plural: 'quarts' },
    'quarts': { base: 'quart', plural: 'quarts' },
    'pint': { base: 'pint', plural: 'pints' },
    'pints': { base: 'pint', plural: 'pints' },
    'gallon': { base: 'gallon', plural: 'gallons' },
    'gallons': { base: 'gallon', plural: 'gallons' },
    'ml': { base: 'ml', plural: 'ml' },
    'l': { base: 'l', plural: 'l' },
    'liter': { base: 'liter', plural: 'liters' },
    'liters': { base: 'liter', plural: 'liters' },
    'gram': { base: 'gram', plural: 'grams' },
    'grams': { base: 'gram', plural: 'grams' },
    'g': { base: 'gram', plural: 'grams' },
    'kilogram': { base: 'kilogram', plural: 'kilograms' },
    'kilograms': { base: 'kilogram', plural: 'kilograms' },
    'kg': { base: 'kilogram', plural: 'kilograms' },
    'bunch': { base: 'bunch', plural: 'bunches' },
    'bunches': { base: 'bunch', plural: 'bunches' },
    'head': { base: 'head', plural: 'heads' },
    'heads': { base: 'head', plural: 'heads' },
    'bag': { base: 'bag', plural: 'bags' },
    'bags': { base: 'bag', plural: 'bags' }
};

const UNIT_DISPLAY_LOOKUP = {};
Object.keys(UNIT_SYNONYMS).forEach(key => {
    const meta = UNIT_SYNONYMS[key];
    if (!UNIT_DISPLAY_LOOKUP[meta.base]) {
        UNIT_DISPLAY_LOOKUP[meta.base] = meta;
    }
});

const UNICODE_FRACTIONS = {
    '¼': '1/4',
    '½': '1/2',
    '¾': '3/4',
    '⅓': '1/3',
    '⅔': '2/3',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8'
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadRecipes();
    setupSearch();
    setupCategoryFilter();
    setupURLRouting();
    setupExportControls();
});

// Load all recipe files
async function loadRecipes() {
    try {
        // Get list of recipe files
        const recipesList = await fetchRecipesList();
        
        // Load each recipe
        const recipePromises = recipesList.map(filename => 
            fetch(`recipes/${filename}`)
                .then(res => res.json())
                .catch(err => {
                    console.error(`Error loading ${filename}:`, err);
                    return null;
                })
        );

        const recipes = await Promise.all(recipePromises);
        allRecipes = recipes.filter(recipe => recipe !== null);
        
        // Sort alphabetically by name
        allRecipes.sort((a, b) => a.name.localeCompare(b.name));
        
        filteredRecipes = [...allRecipes];
        displayRecipes();
        updateCategoryButtons();
        removeStaleSelections();
        updateSelectionUI();
    } catch (error) {
        console.error('Error loading recipes:', error);
        document.getElementById('recipesGrid').innerHTML = 
            '<div class="loading">Error loading recipes. Please check that recipe files exist in the recipes folder.</div>';
    }
}

// Fetch list of recipe files
async function fetchRecipesList() {
    // Since GitHub Pages doesn't support directory listing,
    // we'll use a recipes-index.json file that lists all recipes
    try {
        const response = await fetch('recipes-index.json');
        if (response.ok) {
            const data = await response.json();
            return data.recipes || [];
        }
    } catch (error) {
        console.warn('recipes-index.json not found, trying to load recipes manually');
    }
    
    // Fallback: try common recipe filenames or use a default
    // In production, you should maintain recipes-index.json
    return ['sample-recipe.json'];
}

// Display recipes in the grid
function displayRecipes() {
    const grid = document.getElementById('recipesGrid');
    const noResults = document.getElementById('noResults');
    
    if (filteredRecipes.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    grid.innerHTML = filteredRecipes.map(recipe => createRecipeCard(recipe)).join('');
    
    // Add click handlers for expanding/collapsing
    grid.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't toggle if clicking on the category badge or action buttons
            if (e.target.classList.contains('recipe-category') || 
                e.target.classList.contains('recipe-action-btn') ||
                e.target.closest('.recipe-actions') ||
                e.target.classList.contains('recipe-export-inline')) {
                return;
            }
            
            const recipeName = this.getAttribute('data-recipe-name');
            const isExpanded = this.classList.contains('expanded');
            
            // If in selection mode, toggle selection instead of expanding
            if (isSelectionMode) {
                e.preventDefault();
                e.stopPropagation();
                if (selectedRecipeNames.has(recipeName)) {
                    selectedRecipeNames.delete(recipeName);
                    this.classList.remove('selected');
                } else {
                    selectedRecipeNames.add(recipeName);
                    this.classList.add('selected');
                }
                updateSelectionUI();
                return;
            }
            
            if (isExpanded) {
                // Collapsing - remove from URL and reset meta tags
                updateURL(null);
                updateMetaTags(null);
            } else {
                // Expanding - update URL with recipe slug and meta tags
                updateURL(recipeName);
                // Find the recipe data to update meta tags
                const recipe = allRecipes.find(r => r.name === recipeName);
                if (recipe) {
                    updateMetaTags(recipe);
                }
            }
            
            this.classList.toggle('expanded');
        });
    });

    // Update selected state on recipe cards
    grid.querySelectorAll('.recipe-card').forEach(card => {
        const recipeName = card.getAttribute('data-recipe-name');
        if (selectedRecipeNames.has(recipeName)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Single recipe export buttons (only visible when expanded)
    grid.querySelectorAll('.recipe-export-inline').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const recipeName = button.getAttribute('data-recipe-name');
            exportSingleRecipe(recipeName);
        });
    });

    updateSelectionUI();
    
    // Check URL and expand matching recipe
    checkURLAndExpandRecipe();
}

// Render ingredients with support for subsections
function isIngredientSubsection(entry) {
    return entry && typeof entry === 'object' && entry.subsection && Array.isArray(entry.items);
}

function extractIngredientText(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    if (typeof entry === 'object' && typeof entry.item === 'string') {
        return entry.item;
    }
    return '';
}

function renderIngredientItems(items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items.map(subItem => {
        if (isIngredientSubsection(subItem)) {
            return renderIngredientItems(subItem.items);
        }
        const text = extractIngredientText(subItem);
        return text ? `<li>${escapeHtml(text)}</li>` : '';
    }).join('');
}

function renderIngredients(ingredients) {
    if (!ingredients || ingredients.length === 0) return '';
    
    let html = '';
    let listOpen = false;
    
    const closeList = () => {
        if (listOpen) {
            html += '</ul>';
            listOpen = false;
        }
    };
    
    // Render items in the order they appear in the JSON
    ingredients.forEach(item => {
        if (isIngredientSubsection(item)) {
            const subsectionItems = renderIngredientItems(item.items);
            if (!subsectionItems) return;
            closeList();
            
            html += `<div class="ingredient-subsection">
                <h4 class="ingredient-subsection-title">${escapeHtml(item.subsection)}</h4>
                <ul class="ingredients-list">
                    ${subsectionItems}
                </ul>
            </div>`;
        } else {
            const text = extractIngredientText(item);
            if (!text) return;
            
            // Regular ingredient - start a list if needed
            if (!listOpen) {
                html += '<ul class="ingredients-list">';
                listOpen = true;
            }
            html += `<li>${escapeHtml(text)}</li>`;
        }
    });
    
    closeList();
    return html;
}

// Render instructions with support for subsections
function renderInstructions(instructions) {
    if (!instructions || instructions.length === 0) return '';
    
    let html = '';
    let currentList = null;
    
    // Render items in the order they appear in the JSON
    instructions.forEach(item => {
        if (typeof item === 'object' && item.subsection && item.items) {
            // Close any open list before starting a subsection
            if (currentList) {
                html += '</ol>';
                currentList = null;
            }
            
            // Render subsection
            html += `<div class="instruction-subsection">
                <h4 class="instruction-subsection-title">${escapeHtml(item.subsection)}</h4>
                <ol class="instructions-list">`;
            
            item.items.forEach(subItem => {
                html += `<li>${escapeHtml(subItem)}</li>`;
            });
            
            html += `</ol></div>`;
        } else {
            // Regular instruction - start a list if needed
            if (!currentList) {
                html += '<ol class="instructions-list">';
                currentList = true;
            }
            html += `<li>${escapeHtml(item)}</li>`;
        }
    });
    
    // Close any open list
    if (currentList) {
        html += '</ol>';
    }
    
    return html;
}

// Create a slug from recipe name for URL
function createRecipeSlug(recipeName) {
    return recipeName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Update URL with recipe slug
function updateURL(recipeName) {
    const baseUrl = window.location.origin + window.location.pathname;
    if (recipeName) {
        const slug = createRecipeSlug(recipeName);
        const newUrl = `${baseUrl}#${slug}`;
        window.history.pushState({ recipe: recipeName }, '', newUrl);
    } else {
        window.history.pushState({}, '', baseUrl);
    }
}

// Check URL and expand matching recipe
function checkURLAndExpandRecipe() {
    const hash = window.location.hash.substring(1); // Remove the #
    if (!hash) {
        // If no hash, collapse all recipes
        document.querySelectorAll('.recipe-card.expanded').forEach(card => {
            card.classList.remove('expanded');
        });
        return;
    }
    
    // Find recipe with matching slug
    const matchingRecipe = allRecipes.find(recipe => {
        const slug = createRecipeSlug(recipe.name);
        return slug === hash;
    });
    
    if (matchingRecipe) {
        // Collapse all other recipes first
        document.querySelectorAll('.recipe-card.expanded').forEach(card => {
            card.classList.remove('expanded');
        });
        
        // Find the card and expand it
        const recipeName = matchingRecipe.name;
        const card = document.querySelector(`[data-recipe-name="${escapeHtml(recipeName)}"]`);
        if (card) {
            card.classList.add('expanded');
            // Update meta tags for social media previews
            updateMetaTags(matchingRecipe);
            // Scroll to the card
            setTimeout(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    } else {
        // No matching recipe, reset meta tags
        updateMetaTags(null);
    }
}

// Setup URL routing
function setupURLRouting() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
        checkURLAndExpandRecipe();
    });
}

// Create HTML for a recipe card
function createRecipeCard(recipe) {
    const date = recipe.dateAdded ? new Date(recipe.dateAdded).toLocaleDateString() : 'Unknown';
    const prepTime = recipe.prepTime || 'N/A';
    const cookTime = recipe.cookTime || 'N/A';
    const imageHtml = recipe.image ? 
        `<div class="recipe-image-container">
            <img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}" class="recipe-image" onerror="this.style.display='none'">
        </div>` : '';
    
    // Create a unique ID for this recipe card
    const recipeId = `recipe-${createRecipeSlug(recipe.name)}-${Date.now()}`;
    const isSelected = selectedRecipeNames.has(recipe.name);
    
    return `
        <div class="recipe-card" id="${recipeId}" data-recipe-name="${escapeHtml(recipe.name)}">
            ${imageHtml}
            <div class="recipe-header">
                <div class="recipe-header-main">
                    <h2 class="recipe-title">${escapeHtml(recipe.name)}</h2>
                </div>
                <div class="recipe-header-controls">
                    <button class="recipe-action-btn recipe-export-inline" type="button" data-recipe-name="${escapeHtml(recipe.name)}" title="Make Shopping List">Make Shopping List</button>
                    <div class="recipe-actions">
                        <button class="recipe-action-btn" onclick="printRecipe('${recipeId}')" title="Print recipe">Print</button>
                        <button class="recipe-action-btn" onclick="shareRecipe('${recipeId}')" title="Share recipe">Share</button>
                    </div>
                </div>
            </div>
            ${recipe.description ? `<p class="recipe-description">${escapeHtml(recipe.description)}</p>` : ''}
            <div class="recipe-meta">
                <span>Prep: ${prepTime}</span>
                <span>Cook: ${cookTime}</span>
            </div>
            <div class="recipe-details">
                ${recipe.ingredients ? `
                    <div class="ingredients-section">
                        <h3>Ingredients</h3>
                        ${renderIngredients(recipe.ingredients)}
                    </div>
                ` : ''}
                ${recipe.instructions ? `
                    <div class="instructions-section">
                        <h3>Instructions</h3>
                        ${renderInstructions(recipe.instructions)}
                    </div>
                ` : ''}
            </div>
            <span class="recipe-category">${escapeHtml(recipe.category || 'Uncategorized')}</span>
        </div>
    `;
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterRecipes();
        }, 300);
    });
}

// Setup category filter
function setupCategoryFilter() {
    const categoryButtons = document.getElementById('categoryButtons');
    
    categoryButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            // Update active button
            categoryButtons.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            filterRecipes();
        }
    });
}

// Update category buttons based on available categories
function updateCategoryButtons() {
    const categories = new Set();
    allRecipes.forEach(recipe => {
        if (recipe.category) {
            categories.add(recipe.category);
        }
    });
    
    const categoryButtons = document.getElementById('categoryButtons');
    const existingButtons = categoryButtons.querySelectorAll('.category-btn:not([data-category="all"])');
    existingButtons.forEach(btn => btn.remove());
    
    const sortedCategories = Array.from(categories).sort();
    sortedCategories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = category;
        btn.setAttribute('data-category', category);
        categoryButtons.appendChild(btn);
    });
}

// Filter recipes based on search and category
function flattenIngredientsForSearch(ingredients) {
    if (!Array.isArray(ingredients)) return [];
    
    const values = [];
    const pushText = (entry) => {
        if (isIngredientSubsection(entry)) {
            entry.items.forEach(pushText);
            return;
        }
        const text = extractIngredientText(entry);
        if (text) {
            values.push(text.toLowerCase());
        }
    };
    
    ingredients.forEach(item => {
        if (isIngredientSubsection(item)) {
            item.items.forEach(pushText);
        } else {
            pushText(item);
        }
    });
    
    return values;
}

function flattenInstructionsForSearch(instructions) {
    if (!Array.isArray(instructions)) return [];
    
    const values = [];
    const pushText = (entry) => {
        if (!entry) return;
        if (typeof entry === 'string') {
            values.push(entry.toLowerCase());
        } else if (typeof entry === 'object' && Array.isArray(entry.items)) {
            entry.items.forEach(pushText);
        }
    };
    
    instructions.forEach(pushText);
    return values;
}

function filterRecipes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const activeCategory = document.querySelector('.category-btn.active').getAttribute('data-category');
    
    filteredRecipes = allRecipes.filter(recipe => {
        // Category filter
        const categoryMatch = activeCategory === 'all' || recipe.category === activeCategory;
        
        if (!searchTerm) {
            return categoryMatch;
        }
        
        const ingredientText = flattenIngredientsForSearch(recipe.ingredients);
        const instructionText = flattenInstructionsForSearch(recipe.instructions);
        
        // Search filter
        const searchMatch = 
            recipe.name.toLowerCase().includes(searchTerm) ||
            (recipe.description && recipe.description.toLowerCase().includes(searchTerm)) ||
            ingredientText.some(ing => ing.includes(searchTerm)) ||
            instructionText.some(inst => inst.includes(searchTerm));
        
        return categoryMatch && searchMatch;
    });
    
    displayRecipes();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Print recipe function
function printRecipe(recipeId) {
    const card = document.getElementById(recipeId);
    if (!card) return;
    
    // Get recipe data
    const recipeName = card.getAttribute('data-recipe-name');
    const title = card.querySelector('.recipe-title').textContent;
    const category = card.querySelector('.recipe-category')?.textContent || '';
    const description = card.querySelector('.recipe-description')?.textContent || '';
    const meta = card.querySelector('.recipe-meta')?.innerHTML || '';
    const ingredients = card.querySelector('.ingredients-section')?.innerHTML || '';
    const instructions = card.querySelector('.instructions-section')?.innerHTML || '';
    const image = card.querySelector('.recipe-image')?.src || '';
    
    // Create print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapeHtml(title)}</title>
            <style>
                @media print {
                    @page {
                        margin: 1in;
                    }
                    body {
                        font-family: 'Garamond', 'Georgia', 'Times New Roman', serif;
                        font-size: 12pt;
                        line-height: 1.6;
                        color: #000;
                        max-width: 7in;
                        margin: 0 auto;
                    }
                    .recipe-header {
                        border-bottom: 2px solid #000;
                        padding-bottom: 0.5rem;
                        margin-bottom: 1rem;
                    }
                    .recipe-title {
                        font-size: 24pt;
                        font-weight: bold;
                        margin: 0 0 0.25rem 0;
                    }
                    .recipe-category {
                        font-size: 9pt;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        color: #666;
                    }
                    .recipe-description {
                        font-style: italic;
                        margin: 0.75rem 0;
                        color: #333;
                    }
                    .recipe-meta {
                        font-size: 9pt;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin: 0.5rem 0;
                        color: #666;
                    }
                    .recipe-image {
                        max-width: 100%;
                        height: auto;
                        margin: 1rem 0;
                        page-break-inside: avoid;
                    }
                    .ingredients-section, .instructions-section {
                        margin: 1.5rem 0;
                        page-break-inside: avoid;
                    }
                    .ingredients-section h3, .instructions-section h3 {
                        font-size: 14pt;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 0.15em;
                        margin-bottom: 0.75rem;
                        border-bottom: 1px solid #000;
                        padding-bottom: 0.25rem;
                    }
                    .ingredients-list, .instructions-list {
                        margin: 0;
                        padding-left: 0;
                    }
                    .ingredients-list li {
                        list-style: none;
                        padding: 0.25rem 0;
                        padding-left: 1.5rem;
                        position: relative;
                    }
                    .ingredients-list li:before {
                        content: "—";
                        position: absolute;
                        left: 0;
                    }
                    .instructions-list {
                        counter-reset: step-counter;
                    }
                    .instructions-list li {
                        list-style: none;
                        counter-increment: step-counter;
                        padding: 0.5rem 0;
                        padding-left: 2rem;
                        position: relative;
                    }
                    .instructions-list li:before {
                        content: counter(step-counter) ".";
                        position: absolute;
                        left: 0;
                        font-weight: bold;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="recipe-header">
                <h1 class="recipe-title">${escapeHtml(title)}</h1>
                ${category ? `<div class="recipe-category">${escapeHtml(category)}</div>` : ''}
            </div>
            ${description ? `<p class="recipe-description">${escapeHtml(description)}</p>` : ''}
            ${meta ? `<div class="recipe-meta">${meta}</div>` : ''}
            ${image ? `<img src="${image}" alt="${escapeHtml(title)}" class="recipe-image" />` : ''}
            ${ingredients ? `<div class="ingredients-section">${ingredients}</div>` : ''}
            ${instructions ? `<div class="instructions-section">${instructions}</div>` : ''}
            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ccc; font-size: 9pt; color: #666; text-align: center;">
                From Richard's Recipe Collection
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 250);
}

// Copy text to clipboard using fallback method
function copyToClipboardFallback(text) {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
    } catch (err) {
        document.body.removeChild(textarea);
        return false;
    }
}

// Update meta tags for social media previews
function updateMetaTags(recipe) {
    if (!recipe) {
        // Reset to default
        document.getElementById('og-title').setAttribute('content', 'Richard\'s Recipe Collection');
        document.getElementById('og-description').setAttribute('content', 'A collection of delicious recipes');
        document.getElementById('og-url').setAttribute('content', window.location.origin + window.location.pathname);
        document.getElementById('og-image').setAttribute('content', '');
        document.getElementById('twitter-title').setAttribute('content', 'Richard\'s Recipe Collection');
        document.getElementById('twitter-description').setAttribute('content', 'A collection of delicious recipes');
        document.getElementById('twitter-url').setAttribute('content', window.location.origin + window.location.pathname);
        document.getElementById('twitter-image').setAttribute('content', '');
        document.title = 'Richard\'s Recipe Collection';
        return;
    }
    
    const currentUrl = window.location.origin + window.location.pathname;
    const recipeSlug = createRecipeSlug(recipe.name);
    const recipeUrl = `${currentUrl}#${recipeSlug}`;
    const fullTitle = `${recipe.name} - Richard's Recipe Collection`;
    const description = recipe.description || `A delicious ${recipe.category || 'recipe'} from Richard's Recipe Collection`;
    const imageUrl = recipe.image ? (recipe.image.startsWith('http') ? recipe.image : `${currentUrl}${recipe.image}`) : '';
    
    // Update Open Graph tags
    document.getElementById('og-title').setAttribute('content', fullTitle);
    document.getElementById('og-description').setAttribute('content', description);
    document.getElementById('og-url').setAttribute('content', recipeUrl);
    if (imageUrl) {
        document.getElementById('og-image').setAttribute('content', imageUrl);
    }
    
    // Update Twitter tags
    document.getElementById('twitter-title').setAttribute('content', fullTitle);
    document.getElementById('twitter-description').setAttribute('content', description);
    document.getElementById('twitter-url').setAttribute('content', recipeUrl);
    if (imageUrl) {
        document.getElementById('twitter-image').setAttribute('content', imageUrl);
    }
    
    // Update page title
    document.title = fullTitle;
}

// Share recipe function
async function shareRecipe(recipeId) {
    const card = document.getElementById(recipeId);
    if (!card) return;
    
    const recipeName = card.getAttribute('data-recipe-name');
    
    // Get current URL and add recipe identifier using the same slug format as URL routing
    const currentUrl = window.location.origin + window.location.pathname;
    const recipeSlug = createRecipeSlug(recipeName);
    const recipeUrl = `${currentUrl}#${recipeSlug}`;
    
    try {
        // Try Web Share API first (mobile and modern browsers)
        if (navigator.share) {
            await navigator.share({
                url: recipeUrl
            });
            return;
        }
    } catch (error) {
        // User cancelled sharing
        if (error.name === 'AbortError') {
            return;
        }
        // If share fails, fall through to clipboard
    }
    
    // Fallback: Copy only URL to clipboard
    try {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(recipeUrl);
            showNotification('Recipe link copied to clipboard');
        } else {
            // Fallback to execCommand method
            if (copyToClipboardFallback(recipeUrl)) {
                showNotification('Recipe link copied to clipboard');
            } else {
                throw new Error('Clipboard API not available');
            }
        }
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        // Last resort: show the URL in notification so user can manually copy
        showNotification('Unable to copy. URL: ' + recipeUrl);
    }
}

// Show notification function
function showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationText = notification.querySelector('.notification-text');
    
    if (!notification || !notificationText) return;
    
    notificationText.textContent = message;
    notification.style.display = 'block';
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

// Export controls and Google Tasks integration
function setupExportControls() {
    const exportSelectedButton = document.getElementById('exportSelectedButton');
    const clearSelectionButton = document.getElementById('clearSelectionButton');
    
    if (exportSelectedButton) {
        exportSelectedButton.addEventListener('click', () => {
            if (!isSelectionMode) {
                // Enter selection mode - collapse all recipes
                isSelectionMode = true;
                exportSelectedButton.textContent = 'Create Shopping List';
                exportSelectedButton.setAttribute('data-selection-mode', 'true');
                // Collapse all expanded recipe cards
                document.querySelectorAll('.recipe-card.expanded').forEach(card => {
                    card.classList.remove('expanded');
                });
                // Clear URL hash
                updateURL(null);
                updateMetaTags(null);
                updateSelectionUI();
            } else {
                // Create shopping list
                exportSelectedRecipes();
            }
        });
    }
    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', () => {
            selectedRecipeNames.clear();
            isSelectionMode = false;
            document.querySelectorAll('.recipe-card').forEach(card => {
                card.classList.remove('selected');
            });
            updateSelectionUI();
            const exportSelectedButton = document.getElementById('exportSelectedButton');
            if (exportSelectedButton) {
                exportSelectedButton.textContent = 'Make Shopping List';
                exportSelectedButton.removeAttribute('data-selection-mode');
            }
        });
    }
    
    updateSelectionUI();
}

function removeStaleSelections() {
    if (selectedRecipeNames.size === 0) return;
    const validNames = new Set(allRecipes.map(recipe => recipe.name));
    let mutated = false;
    selectedRecipeNames.forEach(name => {
        if (!validNames.has(name)) {
            selectedRecipeNames.delete(name);
            mutated = true;
        }
    });
    if (mutated) {
        // Update selected state on recipe cards
        document.querySelectorAll('.recipe-card').forEach(card => {
            const recipeName = card.getAttribute('data-recipe-name');
            if (selectedRecipeNames.has(recipeName)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }
}

function updateSelectionUI() {
    const selectedCountEl = document.getElementById('selectedCount');
    const exportSelectedButton = document.getElementById('exportSelectedButton');
    const clearSelectionButton = document.getElementById('clearSelectionButton');
    const selectedCount = selectedRecipeNames.size;
    
    if (selectedCountEl) {
        const label = selectedCount === 1 ? 'recipe' : 'recipes';
        selectedCountEl.textContent = `${selectedCount} ${label} selected`;
    }
    
    if (exportSelectedButton) {
        if (isSelectionMode) {
            exportSelectedButton.textContent = 'Create Shopping List';
            exportSelectedButton.setAttribute('data-selection-mode', 'true');
            exportSelectedButton.disabled = selectedCount === 0 || isExportInProgress;
        } else {
            exportSelectedButton.textContent = 'Make Shopping List';
            exportSelectedButton.removeAttribute('data-selection-mode');
            exportSelectedButton.disabled = isExportInProgress;
        }
    }
    if (clearSelectionButton) {
        clearSelectionButton.disabled = isExportInProgress;
    }
    
    document.querySelectorAll('.recipe-export-inline').forEach(button => {
        button.disabled = isExportInProgress;
    });
}

function getRecipesByNames(names) {
    if (!Array.isArray(names) || names.length === 0) return [];
    const nameSet = new Set(names);
    return allRecipes.filter(recipe => nameSet.has(recipe.name));
}

async function exportSelectedRecipes() {
    if (isExportInProgress) return;
    const recipes = getRecipesByNames(Array.from(selectedRecipeNames));
    if (!recipes.length) {
        showNotification('Select at least one recipe to create a shopping list.');
        return;
    }
    isSelectionMode = false;
    const exportSelectedButton = document.getElementById('exportSelectedButton');
    if (exportSelectedButton) {
        exportSelectedButton.textContent = 'Make Shopping List';
    }
    await exportRecipesToGoogleTasks(recipes, { includeShoppingList: recipes.length > 1 });
}


async function exportSingleRecipe(recipeName) {
    if (isExportInProgress || !recipeName) return;
    const recipe = allRecipes.find(r => r.name === recipeName);
    if (!recipe) {
        showNotification('Unable to find that recipe.');
        return;
    }
    await exportRecipesToGoogleTasks([recipe], { includeShoppingList: false });
}

async function exportRecipesToGoogleTasks(recipes, options = {}) {
    if (!window.GOOGLE_TASKS_CLIENT_ID) {
        showNotification('Google Tasks client ID is not configured.');
        return;
    }
    if (!Array.isArray(recipes) || recipes.length === 0) {
        showNotification('No recipes available to export.');
        return;
    }
    
    try {
        setExportInProgress(true);
        const token = await ensureGoogleAccessToken();
        const tasksPayloads = [];
        
        if (options.includeShoppingList && recipes.length > 1) {
            tasksPayloads.push({
                title: `Shopping List (${recipes.length} recipes)`,
                notes: buildShoppingListNotes(recipes)
            });
        }
        
        recipes.forEach(recipe => {
            tasksPayloads.push({
                title: recipe.name,
                notes: buildRecipeTaskNotes(recipe)
            });
        });
        
        for (const payload of tasksPayloads) {
            await createGoogleTask(payload, token);
        }
        
        showNotification(`Created shopping list for ${recipes.length} recipe${recipes.length > 1 ? 's' : ''} in Google Tasks`);
    } catch (error) {
        console.error('Google Tasks export error:', error);
        const message = error && error.message ? error.message : 'Unable to export recipes.';
        showNotification(`Export failed: ${message}`);
    } finally {
        setExportInProgress(false);
    }
}

function setExportInProgress(state) {
    isExportInProgress = state;
    updateSelectionUI();
}

function buildRecipeTaskNotes(recipe) {
    const ingredients = collectIngredientEntries([recipe]).map(entry => entry.text);
    const instructions = flattenInstructionSteps(recipe.instructions);
    const lines = [];
    
    if (ingredients.length) {
        lines.push('Ingredients:');
        ingredients.forEach(item => lines.push(`- ${item}`));
    }
    
    if (instructions.length) {
        if (lines.length) {
            lines.push('');
        }
        lines.push('Instructions:');
        instructions.forEach((step, index) => {
            lines.push(`${index + 1}. ${step}`);
        });
    }
    
    return lines.join('\n') || 'Recipe details unavailable.';
}

function flattenInstructionSteps(instructions) {
    if (!Array.isArray(instructions)) return [];
    const steps = [];
    const appendStep = (entry) => {
        if (!entry) return;
        if (typeof entry === 'string') {
            steps.push(entry);
        } else if (typeof entry === 'object' && Array.isArray(entry.items)) {
            entry.items.forEach(appendStep);
        }
    };
    instructions.forEach(appendStep);
    return steps;
}

function collectIngredientEntries(recipes) {
    const entries = [];
    let orderCounter = 0;
    const pushEntry = (entry) => {
        if (isIngredientSubsection(entry)) {
            entry.items.forEach(pushEntry);
            return;
        }
        const text = extractIngredientText(entry);
        if (!text) return;
        const category = entry && typeof entry === 'object' ? entry.category || null : null;
        entries.push({
            text: text.trim(),
            category,
            normalizedCategory: normalizeCategory(category),
            order: orderCounter++
        });
    };
    
    recipes.forEach(recipe => {
        if (!Array.isArray(recipe.ingredients)) return;
        recipe.ingredients.forEach(pushEntry);
    });
    
    return entries;
}

function normalizeCategory(categoryValue) {
    if (!categoryValue || typeof categoryValue !== 'string') return null;
    const cleaned = categoryValue
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[\/_-]/g, ' ')
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleaned) return null;
    const compact = cleaned.replace(/\band\b/g, '').replace(/\s+/g, ' ').trim();
    return CATEGORY_SYNONYMS[compact] || CATEGORY_SYNONYMS[cleaned] || null;
}

function shouldUseCategorizedList(entries) {
    if (!entries.length) return false;
    const categorized = entries.filter(entry => entry.normalizedCategory).length;
    if (categorized === 0) return false;
    return categorized / entries.length >= 0.5;
}

function buildShoppingListNotes(recipes) {
    const entries = collectIngredientEntries(recipes);
    if (!entries.length) {
        return 'No ingredients found.';
    }
    
    const combined = combineIngredientEntries(entries);
    const useCategories = shouldUseCategorizedList(entries);
    
    if (!useCategories) {
        return combined.map(item => `- ${formatCombinedIngredient(item)}`).join('\n');
    }
    
    const grouped = new Map();
    combined.forEach(item => {
        const categoryKey = item.normalizedCategory || 'other';
        const label = CATEGORY_LABEL_BY_KEY[categoryKey] || CATEGORY_LABEL_BY_KEY.other;
        if (!grouped.has(label)) {
            grouped.set(label, []);
        }
        grouped.get(label).push(item);
    });
    
    const lines = [];
    CATEGORY_GROUPS.forEach(group => {
        const items = grouped.get(group.label);
        if (items && items.length) {
            lines.push(`${group.label}:`);
            items
                .slice()
                .sort((a, b) => {
                    const nameA = (a.parsedName || a.rawText).toLowerCase();
                    const nameB = (b.parsedName || b.rawText).toLowerCase();
                    return nameA.localeCompare(nameB);
                })
                .forEach(item => {
                    lines.push(`- ${formatCombinedIngredient(item)}`);
                });
            lines.push('');
        }
    });
    
    return lines.join('\n').trim();
}

function combineIngredientEntries(entries) {
    const combined = new Map();
    
    entries.forEach(entry => {
        const normalizedText = normalizeUnicodeFractions(entry.text || '');
        if (!normalizedText) return;
        const parsed = parseIngredientText(normalizedText);
        const key = parsed && parsed.name
            ? `parsed||${parsed.unit || 'no-unit'}||${parsed.name.toLowerCase()}`
            : `raw||${normalizedText.toLowerCase()}`;
        const existing = combined.get(key);
        
        if (existing) {
            existing.count += 1;
            existing.order = Math.min(existing.order, entry.order);
            if (parsed && typeof parsed.quantity === 'number' && existing.quantity !== null) {
                existing.quantity += parsed.quantity;
            }
            if (!existing.normalizedCategory && entry.normalizedCategory) {
                existing.normalizedCategory = entry.normalizedCategory;
            }
            if (!existing.category && entry.category) {
                existing.category = entry.category;
            }
        } else {
            combined.set(key, {
                key,
                rawText: normalizedText,
                parsedName: parsed ? parsed.name : null,
                unit: parsed ? parsed.unit : '',
                quantity: parsed && typeof parsed.quantity === 'number' ? parsed.quantity : null,
                count: 1,
                category: entry.category || null,
                normalizedCategory: entry.normalizedCategory || null,
                order: entry.order
            });
        }
    });
    
    return Array.from(combined.values()).sort((a, b) => a.order - b.order);
}

function parseIngredientText(text) {
    if (!text) return null;
    const normalized = normalizeUnicodeFractions(text).trim();
    if (!normalized) return null;
    const quantityMatch = normalized.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d*\.\d+)|(?:\d+))(?:\s|$)/);
    if (!quantityMatch) {
        return null;
    }
    const quantityValue = convertQuantityString(quantityMatch[1]);
    if (quantityValue === null) {
        return null;
    }
    let remainder = normalized.slice(quantityMatch[0].length).trim();
    if (!remainder) {
        return null;
    }
    const tokens = remainder.split(/\s+/);
    let unit = '';
    let consumed = 0;
    
    if (tokens.length >= 2) {
        const twoWord = `${tokens[0].toLowerCase()} ${tokens[1].toLowerCase()}`;
        if (UNIT_SYNONYMS[twoWord]) {
            unit = UNIT_SYNONYMS[twoWord].base;
            consumed = 2;
        }
    }
    
    if (!unit && tokens.length) {
        const singleWord = tokens[0].toLowerCase();
        if (UNIT_SYNONYMS[singleWord]) {
            unit = UNIT_SYNONYMS[singleWord].base;
            consumed = 1;
        }
    }
    
    const nameTokens = tokens.slice(consumed);
    const name = nameTokens.join(' ').trim();
    if (!name) {
        return null;
    }
    
    return {
        quantity: quantityValue,
        unit,
        name
    };
}

function normalizeUnicodeFractions(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (match) => UNICODE_FRACTIONS[match] || match);
}

function convertQuantityString(value) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes(' ')) {
        const parts = trimmed.split(' ');
        if (parts.length === 2) {
            const whole = parseFloat(parts[0]);
            const fraction = convertQuantityString(parts[1]);
            if (!isNaN(whole) && fraction !== null) {
                return whole + fraction;
            }
        }
    }
    if (trimmed.includes('/')) {
        const [num, denom] = trimmed.split('/');
        const numerator = parseFloat(num);
        const denominator = parseFloat(denom);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            return numerator / denominator;
        }
        return null;
    }
    const numeric = parseFloat(trimmed);
    return isNaN(numeric) ? null : numeric;
}

function formatCombinedIngredient(ingredient) {
    if (ingredient.quantity !== null && ingredient.parsedName) {
        const quantityText = formatQuantity(ingredient.quantity);
        const unitText = ingredient.unit ? ` ${formatUnit(ingredient.unit, ingredient.quantity)}` : '';
        return `${quantityText}${unitText} ${ingredient.parsedName}`.trim();
    }
    if (ingredient.count > 1) {
        return `${ingredient.rawText} (x${ingredient.count})`;
    }
    return ingredient.rawText;
}

function formatQuantity(value) {
    if (Number.isInteger(value)) {
        return `${value}`;
    }
    const precise = Number(value.toFixed(2));
    return `${precise}`;
}

function formatUnit(unit, quantity) {
    if (!unit) return '';
    const metadata = UNIT_DISPLAY_LOOKUP[unit];
    if (!metadata) {
        return unit;
    }
    const isPlural = quantity > 1.0001;
    if (isPlural && metadata.plural) {
        return metadata.plural;
    }
    return metadata.base || unit;
}

function loadGoogleIdentityServices() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        return Promise.resolve();
    }
    if (googleScriptPromise) {
        return googleScriptPromise;
    }
    
    googleScriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-google-identity]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
    });
    
    return googleScriptPromise;
}

async function ensureGoogleAccessToken(forcePrompt = false) {
    await loadGoogleIdentityServices();
    
    if (!window.GOOGLE_TASKS_CLIENT_ID) {
        return Promise.reject(new Error('Google Tasks client ID is not configured.'));
    }
    
    if (googleAccessToken && Date.now() < googleTokenExpiry - 60000 && !forcePrompt) {
        return googleAccessToken;
    }
    
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
            reject(new Error('Google Identity Services unavailable.'));
            return;
        }
        
        if (!googleTokenClient) {
            googleTokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: window.GOOGLE_TASKS_CLIENT_ID,
                scope: GOOGLE_TASKS_SCOPE,
                callback: () => {}
            });
        }
        
        googleTokenClient.callback = (response) => {
            if (response && response.access_token) {
                googleAccessToken = response.access_token;
                const expiresIn = response.expires_in || 0;
                googleTokenExpiry = Date.now() + expiresIn * 1000;
                resolve(googleAccessToken);
            } else {
                reject(new Error('Authorization was not granted.'));
            }
        };
        
        try {
            googleTokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
        } catch (error) {
            reject(error);
        }
    });
}

async function createGoogleTask(payload, token, retryCount = 0) {
    const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    
    if (response.status === 401 && retryCount === 0) {
        googleAccessToken = null;
        const refreshedToken = await ensureGoogleAccessToken(true);
        return createGoogleTask(payload, refreshedToken, retryCount + 1);
    }
    
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody && errorBody.error && errorBody.error.message
            ? errorBody.error.message
            : 'Google Tasks request failed.';
        throw new Error(message);
    }
    
    return response.json();
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration.scope);
                
                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
        
        // Listen for service worker updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service Worker updated, reloading page...');
            // Optionally reload the page when a new service worker is activated
            // window.location.reload();
        });
    });
}

// Handle install prompt for PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Optionally, show a custom install button
    // showInstallButton();
});

// Function to show install prompt (can be called from a button)
function showInstallPrompt() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    }
}

