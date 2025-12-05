// Recipe data storage
let allRecipes = [];
let filteredRecipes = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadRecipes();
    setupSearch();
    setupCategoryFilter();
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
            
            this.classList.toggle('expanded');
        });
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
    const recipeId = `recipe-${recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    
    return `
        <div class="recipe-card" id="${recipeId}" data-recipe-name="${escapeHtml(recipe.name)}">
            ${imageHtml}
            <div class="recipe-header">
                <div>
                    <h2 class="recipe-title">${escapeHtml(recipe.name)}</h2>
                    <span class="recipe-category">${escapeHtml(recipe.category || 'Uncategorized')}</span>
                </div>
                <div class="recipe-actions">
                    <button class="recipe-action-btn" onclick="printRecipe('${recipeId}')" title="Print recipe">Print</button>
                    <button class="recipe-action-btn" onclick="shareRecipe('${recipeId}')" title="Share recipe">Share</button>
                </div>
            </div>
            <p class="recipe-description">${escapeHtml(recipe.description || '')}</p>
            <div class="recipe-meta">
                <span>Prep: ${prepTime}</span>
                <span>Cook: ${cookTime}</span>
                <span>${date}</span>
            </div>
            <div class="recipe-details">
                ${recipe.ingredients ? `
                    <div class="ingredients-section">
                        <h3>Ingredients</h3>
                        <ul class="ingredients-list">
                            ${recipe.ingredients.map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${recipe.instructions ? `
                    <div class="instructions-section">
                        <h3>Instructions</h3>
                        <ol class="instructions-list">
                            ${recipe.instructions.map(inst => `<li>${escapeHtml(inst)}</li>`).join('')}
                        </ol>
                    </div>
                ` : ''}
            </div>
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

// Share recipe function
async function shareRecipe(recipeId) {
    const card = document.getElementById(recipeId);
    if (!card) return;
    
    const recipeName = card.getAttribute('data-recipe-name');
    const title = card.querySelector('.recipe-title').textContent;
    const category = card.querySelector('.recipe-category')?.textContent || '';
    const description = card.querySelector('.recipe-description')?.textContent || '';
    const prepTime = card.querySelector('.recipe-meta span')?.textContent.replace('Prep: ', '') || '';
    
    // Get current URL and add recipe identifier
    const currentUrl = window.location.href.split('#')[0];
    const recipeUrl = `${currentUrl}#recipe-${encodeURIComponent(recipeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`;
    
    const shareData = {
        title: `${title} - Richard's Recipe Collection`,
        text: `${title}${category ? ` (${category})` : ''}${description ? `\n\n${description}` : ''}${prepTime ? `\n\nPrep Time: ${prepTime}` : ''}\n\nView full recipe:`,
        url: recipeUrl
    };
    
    try {
        // Try Web Share API first (mobile and modern browsers)
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: Copy to clipboard
            const shareText = `${shareData.title}\n\n${shareData.text} ${shareData.url}`;
            await navigator.clipboard.writeText(shareText);
            
            // Show notification
            showNotification('Recipe link copied to clipboard');
        }
    } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
            console.error('Error sharing recipe:', error);
            // Fallback to clipboard
            try {
                const shareText = `${shareData.title}\n\n${shareData.text} ${shareData.url}`;
                await navigator.clipboard.writeText(shareText);
                showNotification('Recipe link copied to clipboard');
            } catch (clipboardError) {
                console.error('Clipboard error:', clipboardError);
                showNotification('Failed to copy link. Please try again.');
            }
        }
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

