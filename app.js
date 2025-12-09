// Recipe data storage
let allRecipes = [];
let filteredRecipes = [];

const GOOGLE_KEEP_SCOPES = 'https://www.googleapis.com/auth/keep';
const GOOGLE_KEEP_API_BASE = 'https://keep.googleapis.com/v1';
const GOOGLE_LIBRARY_TIMEOUT = 5000;
const GOOGLE_LIBRARY_POLL_INTERVAL = 150;

const AISLE_DEFINITIONS = [
    { 
        category: 'Produce', 
        keywords: ['apple', 'avocado', 'banana', 'basil', 'broccoli', 'cabbage', 'carrot', 'celery', 'cilantro', 'cucumber', 'garlic', 'ginger', 'herb', 'jalapeño', 'jalapeno', 'kale', 'lemon', 'lettuce', 'lime', 'mushroom', 'onion', 'orange', 'parsley', 'pepper', 'potato', 'shallot', 'spinach', 'tomato']
    },
    { 
        category: 'Dairy & Eggs', 
        keywords: ['butter', 'cream', 'cheese', 'egg', 'milk', 'parmesan', 'ricotta', 'sour cream', 'yogurt', 'mozzarella', 'half-and-half']
    },
    { 
        category: 'Meat & Seafood', 
        keywords: ['bacon', 'beef', 'chicken', 'chorizo', 'duck', 'fish', 'ground', 'ham', 'lamb', 'pork', 'prosciutto', 'salmon', 'sausage', 'shrimp', 'steak', 'turkey']
    },
    { 
        category: 'Bakery', 
        keywords: ['baguette', 'bread', 'bun', 'ciabatta', 'dough', 'pita', 'roll', 'tortilla']
    },
    { 
        category: 'Pantry', 
        keywords: ['flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'spice', 'powder', 'sauce', 'broth', 'stock', 'pasta', 'rice', 'bean', 'lentil', 'cornstarch', 'honey', 'molasses', 'oats', 'quinoa', 'soy', 'tomato paste', 'tomato sauce']
    },
    { 
        category: 'Frozen', 
        keywords: ['frozen', 'ice cream', 'sorbet', 'frozen peas']
    },
    { 
        category: 'Beverages', 
        keywords: ['beer', 'coffee', 'juice', 'tea', 'wine', 'vine']
    },
    { 
        category: 'Spices & Seasonings', 
        keywords: ['cumin', 'coriander', 'paprika', 'oregano', 'thyme', 'rosemary', 'sage', 'turmeric', 'curry', 'spice blend', 'seasoning']
    },
    { 
        category: 'Household', 
        keywords: ['foil', 'paper', 'toothpick', 'skewer']
    }
];

const AISLE_FALLBACK = 'Other';
const AISLE_ORDER = [...AISLE_DEFINITIONS.map(def => def.category), AISLE_FALLBACK];

const googleKeepState = {
    tokenClient: null,
    accessToken: null,
    expiresAt: 0
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadRecipes();
    setupSearch();
    setupCategoryFilter();
    setupURLRouting();
    setupGoogleKeepControls();
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
                e.target.closest('.recipe-actions')) return;
            
            const recipeName = this.getAttribute('data-recipe-name');
            const isExpanded = this.classList.contains('expanded');
            
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
    
    // Check URL and expand matching recipe
    checkURLAndExpandRecipe();
}

// Render ingredients with support for subsections
function renderIngredients(ingredients) {
    if (!ingredients || ingredients.length === 0) return '';
    
    let html = '';
    let currentList = null;
    
    // Render items in the order they appear in the JSON
    ingredients.forEach(item => {
        if (typeof item === 'object' && item.subsection && item.items) {
            // Close any open list before starting a subsection
            if (currentList) {
                html += '</ul>';
                currentList = null;
            }
            
            // Render subsection
            html += `<div class="ingredient-subsection">
                <h4 class="ingredient-subsection-title">${escapeHtml(item.subsection)}</h4>
                <ul class="ingredients-list">`;
            
            item.items.forEach(subItem => {
                html += `<li>${escapeHtml(subItem)}</li>`;
            });
            
            html += `</ul></div>`;
        } else {
            // Regular ingredient - start a list if needed
            if (!currentList) {
                html += '<ul class="ingredients-list">';
                currentList = true;
            }
            html += `<li>${escapeHtml(item)}</li>`;
        }
    });
    
    // Close any open list
    if (currentList) {
        html += '</ul>';
    }
    
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
    
    return `
        <div class="recipe-card" id="${recipeId}" data-recipe-name="${escapeHtml(recipe.name)}">
            ${imageHtml}
            <div class="recipe-header">
                <div>
                    <h2 class="recipe-title">${escapeHtml(recipe.name)}</h2>
                </div>
                <div class="recipe-actions">
                    <button class="recipe-action-btn" onclick="printRecipe('${recipeId}')" title="Print recipe">Print</button>
                    <button class="recipe-action-btn" onclick="shareRecipe('${recipeId}')" title="Share recipe">Share</button>
                    <button class="recipe-action-btn keep-export-btn" onclick="exportRecipeToGoogleKeep('${recipeId}')" title="Export ingredients to Google Keep">Export to Keep</button>
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
function filterRecipes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const activeCategory = document.querySelector('.category-btn.active').getAttribute('data-category');
    
    filteredRecipes = allRecipes.filter(recipe => {
        // Category filter
        const categoryMatch = activeCategory === 'all' || recipe.category === activeCategory;
        
        // Search filter
        const searchMatch = !searchTerm || 
            recipe.name.toLowerCase().includes(searchTerm) ||
            (recipe.description && recipe.description.toLowerCase().includes(searchTerm)) ||
            (recipe.ingredients && recipe.ingredients.some(ing => ing.toLowerCase().includes(searchTerm))) ||
            (recipe.instructions && recipe.instructions.some(inst => inst.toLowerCase().includes(searchTerm)));
        
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

// Google Keep integration
function setupGoogleKeepControls() {
    const connectBtn = document.getElementById('googleKeepConnect');
    const statusEl = document.getElementById('googleKeepStatus');
    
    if (!connectBtn || !statusEl) return;
    
    connectBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        const isConnected = googleKeepState.accessToken && Date.now() < googleKeepState.expiresAt;
        
        if (isConnected) {
            await disconnectGoogleKeep();
        } else {
            await connectGoogleKeep();
        }
    });
    
    updateGoogleKeepUi();
}

function getGoogleKeepClientId() {
    return window.GOOGLE_KEEP_CLIENT_ID || '';
}

function updateGoogleKeepUi() {
    const connectBtn = document.getElementById('googleKeepConnect');
    const statusEl = document.getElementById('googleKeepStatus');
    
    if (!connectBtn || !statusEl) return;
    
    const clientConfigured = Boolean(getGoogleKeepClientId());
    const isConnected = Boolean(googleKeepState.accessToken && Date.now() < googleKeepState.expiresAt);
    
    if (!clientConfigured) {
        connectBtn.textContent = 'Connect Google Keep';
        connectBtn.disabled = true;
        connectBtn.classList.remove('is-connected');
        statusEl.textContent = 'Add a Google OAuth Client ID to enable exports';
        return;
    }
    
    connectBtn.disabled = false;
    connectBtn.textContent = isConnected ? 'Disconnect Google Keep' : 'Connect Google Keep';
    connectBtn.classList.toggle('is-connected', isConnected);
    statusEl.textContent = isConnected ? 'Ready to export shopping lists' : 'Not connected';
}

function setGoogleKeepLoadingState(isLoading) {
    const connectBtn = document.getElementById('googleKeepConnect');
    if (!connectBtn) return;
    
    if (isLoading) {
        if (!connectBtn.dataset.originalText) {
            connectBtn.dataset.originalText = connectBtn.textContent;
        }
        connectBtn.textContent = 'Authorizing...';
        connectBtn.disabled = true;
        connectBtn.classList.add('is-loading');
    } else {
        connectBtn.classList.remove('is-loading');
        if (connectBtn.dataset.originalText) {
            connectBtn.textContent = connectBtn.dataset.originalText;
            delete connectBtn.dataset.originalText;
        }
        updateGoogleKeepUi();
    }
}

async function connectGoogleKeep() {
    if (!getGoogleKeepClientId()) {
        showNotification('Set a Google client ID before connecting');
        return;
    }
    
    setGoogleKeepLoadingState(true);
    
    try {
        const token = await requestGoogleKeepAccessToken({ prompt: 'consent' });
        if (token) {
            showNotification('Google Keep connected');
        }
    } catch (error) {
        console.error('Google Keep connect error:', error);
        showNotification('Unable to connect to Google Keep');
    } finally {
        setGoogleKeepLoadingState(false);
    }
}

async function disconnectGoogleKeep() {
    setGoogleKeepLoadingState(true);
    
    try {
        if (googleKeepState.accessToken && window.google && window.google.accounts && window.google.accounts.oauth2 && window.google.accounts.oauth2.revoke) {
            await new Promise((resolve) => {
                window.google.accounts.oauth2.revoke(googleKeepState.accessToken, () => resolve());
            });
        }
    } catch (error) {
        console.warn('Google Keep revoke error:', error);
    } finally {
        googleKeepState.accessToken = null;
        googleKeepState.expiresAt = 0;
        setGoogleKeepLoadingState(false);
        updateGoogleKeepUi();
        showNotification('Google Keep disconnected');
    }
}

async function ensureGoogleKeepClient() {
    if (googleKeepState.tokenClient) {
        return true;
    }
    
    const clientId = getGoogleKeepClientId();
    if (!clientId) {
        return false;
    }
    
    await waitForGoogleLibrary();
    
    if (!(window.google && window.google.accounts && window.google.accounts.oauth2 && window.google.accounts.oauth2.initTokenClient)) {
        return false;
    }
    
    googleKeepState.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_KEEP_SCOPES,
        callback: () => {}
    });
    
    return true;
}

function waitForGoogleLibrary() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - startTime > GOOGLE_LIBRARY_TIMEOUT) {
                clearInterval(interval);
                reject(new Error('Google identity services script not available'));
            }
        }, GOOGLE_LIBRARY_POLL_INTERVAL);
    });
}

function requestGoogleKeepAccessToken(options = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            const clientReady = await ensureGoogleKeepClient();
            if (!clientReady || !googleKeepState.tokenClient) {
                reject(new Error('Google OAuth client is not ready'));
                return;
            }
            
            googleKeepState.tokenClient.callback = (tokenResponse) => {
                if (tokenResponse.error) {
                    reject(new Error(tokenResponse.error));
                    return;
                }
                
                googleKeepState.accessToken = tokenResponse.access_token;
                const expiresIn = Number(tokenResponse.expires_in) || 0;
                googleKeepState.expiresAt = Date.now() + Math.max((expiresIn - 30) * 1000, 0);
                updateGoogleKeepUi();
                resolve(tokenResponse.access_token);
            };
            
            if (googleKeepState.tokenClient.error_callback) {
                delete googleKeepState.tokenClient.error_callback;
            }
            
            googleKeepState.tokenClient.requestAccessToken(options);
        } catch (error) {
            reject(error);
        }
    });
}

async function ensureGoogleKeepAccessToken() {
    if (googleKeepState.accessToken && Date.now() < googleKeepState.expiresAt) {
        return googleKeepState.accessToken;
    }
    
    try {
        return await requestGoogleKeepAccessToken({ prompt: '' });
    } catch (error) {
        console.error('Google Keep token error:', error);
        return null;
    }
}

async function exportRecipeToGoogleKeep(recipeId) {
    const card = document.getElementById(recipeId);
    if (!card) return;
    
    const exportButton = card.querySelector('.keep-export-btn');
    const recipeName = card.getAttribute('data-recipe-name');
    const recipe = allRecipes.find(r => r.name === recipeName);
    
    if (!recipe) {
        showNotification('Recipe data unavailable');
        return;
    }
    
    const payload = buildGoogleKeepPayload(recipe);
    
    if (!payload) {
        showNotification('This recipe has no ingredients to export');
        return;
    }
    
    setButtonBusy(exportButton, true, 'Exporting...');
    
    try {
        const token = await ensureGoogleKeepAccessToken();
        if (!token) {
            showNotification('Connect Google Keep before exporting');
            return;
        }
        
        const response = await fetch(`${GOOGLE_KEEP_API_BASE}/notes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            let errorMessage = 'Google Keep request failed';
            try {
                const errorBody = await response.json();
                errorMessage = errorBody?.error?.message || errorMessage;
            } catch (parseError) {
                // Ignore JSON parse failures
            }
            
            if (response.status === 401 || response.status === 403) {
                googleKeepState.accessToken = null;
                googleKeepState.expiresAt = 0;
                updateGoogleKeepUi();
            }
            
            throw new Error(errorMessage);
        }
        
        showNotification('Shopping list added to Google Keep');
    } catch (error) {
        console.error('Google Keep export error:', error);
        showNotification('Unable to export to Google Keep');
    } finally {
        setButtonBusy(exportButton, false);
    }
}

function buildGoogleKeepPayload(recipe) {
    const normalizedIngredients = normalizeIngredientItems(recipe.ingredients || []);
    
    if (normalizedIngredients.length === 0) {
        return null;
    }
    
    const grouped = groupIngredientsByAisle(normalizedIngredients);
    const orderedCategories = [
        ...AISLE_ORDER.filter(category => grouped[category] && grouped[category].length > 0),
        ...Object.keys(grouped).filter(category => !AISLE_ORDER.includes(category))
    ];
    
    const listItems = [];
    orderedCategories.forEach(category => {
        const items = grouped[category] || [];
        items.forEach(item => {
            listItems.push({
                text: `[${category}] ${item}`,
                checked: false
            });
        });
    });
    
    return {
        title: `${recipe.name} Shopping List`,
        content: {
            list: {
                items: listItems
            }
        }
    };
}

function normalizeIngredientItems(rawItems = []) {
    const normalized = [];
    
    rawItems.forEach(item => {
        if (!item) {
            return;
        }
        
        if (typeof item === 'string') {
            normalized.push(item.trim());
        } else if (typeof item === 'object') {
            if (Array.isArray(item.items)) {
                item.items.forEach(subItem => {
                    if (typeof subItem === 'string') {
                        normalized.push(subItem.trim());
                    }
                });
            } else if (typeof item.ingredient === 'string') {
                normalized.push(item.ingredient.trim());
            }
        }
    });
    
    return normalized.filter(item => item.length > 0);
}

function groupIngredientsByAisle(items) {
    return items.reduce((acc, item) => {
        const category = detectAisleForIngredient(item);
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {});
}

function detectAisleForIngredient(ingredient) {
    const lowerCaseIngredient = ingredient.toLowerCase();
    
    for (const definition of AISLE_DEFINITIONS) {
        if (definition.keywords.some(keyword => lowerCaseIngredient.includes(keyword))) {
            return definition.category;
        }
    }
    
    return AISLE_FALLBACK;
}

function setButtonBusy(button, isLoading, loadingLabel = 'Working...') {
    if (!button) return;
    
    if (isLoading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }
        button.textContent = loadingLabel;
        button.disabled = true;
        button.classList.add('is-loading');
    } else {
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
        button.disabled = false;
        button.classList.remove('is-loading');
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

