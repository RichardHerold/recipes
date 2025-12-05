// Recipe data storage
let allRecipes = [];
let filteredRecipes = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadRecipes();
    setupSearch();
    setupCategoryFilter();
    setupURLRouting();
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
    let hasRegularIngredients = false;
    let regularIngredients = [];
    let subsections = [];
    
    // Separate regular ingredients from subsections
    ingredients.forEach(item => {
        if (typeof item === 'object' && item.subsection && item.items) {
            subsections.push(item);
        } else {
            regularIngredients.push(item);
            hasRegularIngredients = true;
        }
    });
    
    // Render subsections first
    subsections.forEach(subsection => {
        html += `<div class="ingredient-subsection">
            <h4 class="ingredient-subsection-title">${escapeHtml(subsection.subsection)}</h4>
            <ul class="ingredients-list">`;
        
        subsection.items.forEach(item => {
            html += `<li>${escapeHtml(item)}</li>`;
        });
        
        html += `</ul></div>`;
    });
    
    // Render regular ingredients after subsections if any
    if (hasRegularIngredients) {
        html += '<ul class="ingredients-list">';
        regularIngredients.forEach(ing => {
            html += `<li>${escapeHtml(ing)}</li>`;
        });
        html += '</ul>';
    }
    
    return html;
}

// Render instructions with support for subsections
function renderInstructions(instructions) {
    if (!instructions || instructions.length === 0) return '';
    
    let html = '';
    let hasRegularInstructions = false;
    let regularInstructions = [];
    let subsections = [];
    
    // Separate regular instructions from subsections
    instructions.forEach(item => {
        if (typeof item === 'object' && item.subsection && item.items) {
            subsections.push(item);
        } else {
            regularInstructions.push(item);
            hasRegularInstructions = true;
        }
    });
    
    // Render subsections first
    subsections.forEach(subsection => {
        html += `<div class="instruction-subsection">
            <h4 class="instruction-subsection-title">${escapeHtml(subsection.subsection)}</h4>
            <ol class="instructions-list">`;
        
        subsection.items.forEach(item => {
            html += `<li>${escapeHtml(item)}</li>`;
        });
        
        html += `</ol></div>`;
    });
    
    // Render regular instructions after subsections if any
    if (hasRegularInstructions) {
        html += '<ol class="instructions-list">';
        regularInstructions.forEach(inst => {
            html += `<li>${escapeHtml(inst)}</li>`;
        });
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

