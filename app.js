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

const SCALE_BEHAVIOR_METADATA = {
    linear: { label: 'Scales normally', icon: null },
    sublinear: { label: 'Season gently when scaling', icon: '⚠️' },
    fixed: { label: 'Does not scale', icon: '⚠️' },
    taste: { label: 'Adjust to taste', icon: '⚠️' },
    stepped: { label: 'Rounded to whole units', icon: '⚠️' }
};

const DEFAULT_SCALE_BEHAVIOR = 'linear';
const SCALE_FACTOR_MIN = 0.25;
const SCALE_FACTOR_MAX = 4;
const FRACTION_DENOMINATORS = [2, 3, 4, 6, 8, 12, 16];

function createInitialScaleState(servingsMeta) {
    const hasMeta = servingsMeta && typeof servingsMeta === 'object';
    const baseAmount = hasMeta && typeof servingsMeta.amount === 'number'
        ? servingsMeta.amount
        : null;
    return {
        baseServings: baseAmount,
        unit: hasMeta && servingsMeta.unit ? servingsMeta.unit : 'servings',
        note: hasMeta && servingsMeta.note ? servingsMeta.note : null,
        currentServings: baseAmount,
        scaleFactor: 1
    };
}

function getScaleState(recipe) {
    if (!recipe) {
        return createInitialScaleState(null);
    }
    if (!recipe.scaleState) {
        recipe.scaleState = createInitialScaleState(recipe.servings || null);
    }
    return recipe.scaleState;
}

function clampScaleFactor(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 1;
    }
    return Math.min(SCALE_FACTOR_MAX, Math.max(SCALE_FACTOR_MIN, value));
}

function setRecipeScaleFactor(recipe, factor) {
    const state = getScaleState(recipe);
    if (!state) return state;
    const clamped = clampScaleFactor(factor);
    state.scaleFactor = clamped;
    if (typeof state.baseServings === 'number') {
        const nextValue = state.baseServings * clamped;
        state.currentServings = Math.max(0.01, Math.round(nextValue * 100) / 100);
    }
    recipe._dismissedScaleWarningFor = null;
    return state;
}

function setRecipeServings(recipe, servingsValue) {
    const state = getScaleState(recipe);
    if (typeof state.baseServings !== 'number') {
        return state;
    }
    if (typeof servingsValue !== 'number' || !Number.isFinite(servingsValue) || servingsValue <= 0) {
        return setRecipeScaleFactor(recipe, 1);
    }
    const nextFactor = servingsValue / state.baseServings;
    return setRecipeScaleFactor(recipe, nextFactor);
}

function adjustRecipeServings(recipe, delta) {
    const state = getScaleState(recipe);
    if (typeof state.baseServings !== 'number') {
        return state;
    }
    const currentValue = typeof state.currentServings === 'number'
        ? state.currentServings
        : state.baseServings;
    const minServings = Math.max(0.25, state.baseServings * SCALE_FACTOR_MIN);
    const nextServings = Math.max(minServings, currentValue + delta);
    return setRecipeServings(recipe, nextServings);
}

function resetRecipeScale(recipe) {
    return setRecipeScaleFactor(recipe, 1);
}

function isApproximatelyEqual(a, b, tolerance = 0.01) {
    if (typeof a !== 'number' || typeof b !== 'number') {
        return false;
    }
    return Math.abs(a - b) <= tolerance;
}

const PREP_ACTION_METADATA = {
    chop: { label: 'Chopping', icon: '🔪' },
    measure: { label: 'Measuring', icon: '📏' },
    temper: { label: 'Temper', icon: '🕐' },
    zest: { label: 'Zesting', icon: '🍋' },
    grate: { label: 'Grating', icon: '🧀' },
    sift: { label: 'Sifting', icon: '🌫️' },
    toast: { label: 'Toasting', icon: '🔥' },
    drain: { label: 'Draining', icon: '💧' },
    other: { label: 'Other Prep', icon: '🧂' }
};

const STORAGE_KEYS = {
    checklist: 'miseChecklistState',
    grouping: 'miseGroupingPreference'
};

const DEFAULT_GROUPING_MODE = 'destination';

let techniqueLibrary = {};
let recipeMapByName = new Map();
let miseChecklistState = loadChecklistState();

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
        const [techniques, recipesList] = await Promise.all([
            loadTechniqueLibrary(),
            fetchRecipesList()
        ]);

        techniqueLibrary = techniques || {};

        const recipePromises = recipesList.map(filename => 
            fetch(`recipes/${filename}`)
                .then(res => res.json())
                .catch(err => {
                    console.error(`Error loading ${filename}:`, err);
                    return null;
                })
        );

        const recipes = await Promise.all(recipePromises);
        allRecipes = recipes
            .filter(recipe => recipe !== null)
            .map(normalizeRecipe);
        
        // Sort alphabetically by name
        allRecipes.sort((a, b) => a.name.localeCompare(b.name));
        recipeMapByName = new Map(allRecipes.map(recipe => [recipe.name, recipe]));
        
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

async function loadTechniqueLibrary() {
    try {
        const response = await fetch('data/techniques.json');
        if (response.ok) {
            return response.json();
        }
    } catch (error) {
        console.warn('Unable to load technique library:', error);
    }
    return {};
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
                e.target.classList.contains('recipe-export-inline') ||
                e.target.closest('.prevent-card-toggle')) {
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

    grid.querySelectorAll('.recipe-card').forEach(card => {
        initializeRecipeCardFeatures(card);
    });

    updateSelectionUI();
    
    // Check URL and expand matching recipe
    checkURLAndExpandRecipe();
}

function initializeRecipeCardFeatures(card) {
    if (!card) return;
    const recipeName = card.getAttribute('data-recipe-name');
    if (!recipeName) return;
    const recipe = recipeMapByName.get(recipeName);
    if (!recipe) return;
    setupInstructionToggle(card, recipe);
    setupRecipeScaling(card, recipe);
}


function setupInstructionToggle(card) {
    const toggle = card.querySelector('.instructions-view-toggle');
    const container = card.querySelector('.instructions-views');
    if (!toggle || !container) return;
    const buttons = toggle.querySelectorAll('.instructions-view-btn');
    buttons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const mode = button.getAttribute('data-mode-target');
            if (!mode || button.classList.contains('active')) return;
            buttons.forEach(btn => btn.classList.toggle('active', btn === button));
            container.setAttribute('data-active-mode', mode);
            container.querySelectorAll('.instructions-view').forEach(view => {
                view.classList.toggle('active', view.getAttribute('data-mode') === mode);
            });
        });
    });
}

function setupRecipeScaling(card, recipe) {
    if (!card || !recipe) return;
    const controls = card.querySelector('[data-role="servings-controls"]');
    if (controls) {
        controls.querySelectorAll('[data-scale-action]').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const action = button.getAttribute('data-scale-action');
                handleServingsAction(recipe, action);
            });
        });
        controls.querySelectorAll('[data-scale-preset]').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const preset = button.getAttribute('data-scale-preset');
                handleServingsPreset(recipe, preset);
            });
        });
    }
    card.querySelectorAll('[data-role="dismiss-scale-warning"]').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const state = getScaleState(recipe);
            if (state) {
                recipe._dismissedScaleWarningFor = state.scaleFactor.toFixed(2);
            }
            const warningBox = button.closest('[data-role="scale-warning"]');
            if (warningBox) {
                warningBox.remove();
            }
        });
    });
}

function handleServingsAction(recipe, action) {
    if (!recipe || !action) return;
    switch (action) {
        case 'increment':
            adjustRecipeServings(recipe, 1);
            break;
        case 'decrement':
            adjustRecipeServings(recipe, -1);
            break;
        case 'reset':
            resetRecipeScale(recipe);
            break;
        default:
            return;
    }
    refreshRecipeCookView(recipe);
}

function handleServingsPreset(recipe, preset) {
    if (!recipe || !preset) return;
    switch (preset) {
        case 'half':
            setRecipeScaleFactor(recipe, 0.5);
            break;
        case 'original':
            setRecipeScaleFactor(recipe, 1);
            break;
        case 'double':
            setRecipeScaleFactor(recipe, 2);
            break;
        default:
            return;
    }
    refreshRecipeCookView(recipe);
}

function refreshRecipeCookView(recipe) {
    if (!recipe || !recipe.name) return;
    const selector = buildRecipeCardSelector(recipe.name);
    const card = document.querySelector(selector);
    if (!card) return;
    const details = card.querySelector('.recipe-details');
    if (!details) return;
    const existingViews = details.querySelector('.instructions-views');
    const activeMode = existingViews ? existingViews.getAttribute('data-active-mode') : 'order';
    details.innerHTML = renderCookView(recipe);
    initializeRecipeCardFeatures(card);
    if (activeMode && activeMode !== 'order') {
        const toggleBtn = card.querySelector(`.instructions-view-btn[data-mode-target="${activeMode}"]`);
        if (toggleBtn && !toggleBtn.classList.contains('active')) {
            toggleBtn.click();
        }
    }
}

function buildRecipeCardSelector(recipeName) {
    if (window.CSS && window.CSS.escape) {
        return `.recipe-card[data-recipe-name="${window.CSS.escape(recipeName)}"]`;
    }
    const safeName = recipeName.replace(/["\\]/g, '\\$&');
    return `.recipe-card[data-recipe-name="${safeName}"]`;
}



function normalizeRecipe(recipe) {
    if (!recipe || typeof recipe !== 'object') {
        return recipe;
    }

    const normalized = { ...recipe };
    normalized.servings = normalizeServings(recipe.servings);
    normalized.scaleWarnings = Array.isArray(recipe.scaleWarnings) ? recipe.scaleWarnings.filter(Boolean) : [];
    normalized.scaleState = createInitialScaleState(normalized.servings);
    normalized.tags = Array.isArray(recipe.tags) ? recipe.tags.filter(Boolean) : [];
    if ((!normalized.tags || normalized.tags.length === 0) && recipe.category) {
        normalized.tags = [recipe.category];
    }
    normalized.category = normalized.tags && normalized.tags.length ? normalized.tags[0] : (recipe.category || 'Uncategorized');
    normalized.slug = createRecipeSlug(recipe.name || '');

    normalized.equipment = normalizeEquipmentList(recipe.equipment);
    normalized.equipmentMap = normalized.equipment.reduce((map, item) => {
        if (item.id) {
            map[item.id] = item;
        }
        return map;
    }, {});

    normalized.miseIngredients = collectMiseIngredients(recipe.ingredients);
    normalized.hasDestinations = normalized.miseIngredients.some(entry => Boolean(entry.destination));
    normalized.totalPrepTime = normalized.miseIngredients.reduce((sum, entry) => sum + (entry.prepTime || 0), 0);
    normalized.techniques = Array.isArray(recipe.techniques) ? recipe.techniques.filter(Boolean) : [];
    normalized.time = normalizeTimeBreakdown(recipe.time, recipe.prepTime, recipe.cookTime, normalized.totalPrepTime);

    return normalized;
}

function normalizeServings(servings) {
    if (!servings || typeof servings !== 'object' || typeof servings.amount !== 'number') {
        return null;
    }
    return {
        amount: servings.amount,
        unit: servings.unit || 'servings',
        note: servings.note || null
    };
}

function normalizeEquipmentList(equipment) {
    if (!Array.isArray(equipment)) {
        return [];
    }
    const seenIds = new Set();
    return equipment
        .map((entry, index) => {
            if (!entry) return null;
            if (typeof entry === 'string') {
                const id = generateEquipmentId(entry, index);
                if (seenIds.has(id)) {
                    return { name: entry, id: `${id}-${index}`, label: null };
                }
                seenIds.add(id);
                return { name: entry, id, label: null };
            }
            if (typeof entry === 'object') {
                const name = entry.name || entry.label || `Equipment ${index + 1}`;
                let id = entry.id || (name ? generateEquipmentId(name, index) : null);
                if (id && seenIds.has(id)) {
                    id = `${id}-${index}`;
                }
                if (id) {
                    seenIds.add(id);
                }
                return {
                    name,
                    id,
                    label: entry.label || null
                };
            }
            return null;
        })
        .filter(Boolean);
}

function generateEquipmentId(name, index) {
    if (!name) {
        return `equipment-${index}`;
    }
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `equipment-${index}`;
}

function collectMiseIngredients(ingredients) {
    if (!Array.isArray(ingredients)) {
        return [];
    }
    const list = [];
    let counter = 0;
    const pushEntry = (entry) => {
        if (isIngredientSubsection(entry)) {
            entry.items.forEach(pushEntry);
            return;
        }
        const normalized = normalizeIngredientForMise(entry, counter);
        if (normalized) {
            list.push(normalized);
            counter += 1;
        }
    };
    ingredients.forEach(pushEntry);
    return list;
}

function normalizeIngredientForMise(entry, index) {
    if (!entry) return null;
    if (typeof entry === 'string') {
        return buildMiseIngredient(entry.trim(), null, null, null, null, index);
    }
    if (typeof entry === 'object' && typeof entry.item === 'string') {
        return buildMiseIngredient(
            entry.item.trim(),
            entry.aisle || entry.category || null,
            entry.prep || null,
            entry.prepAction || null,
            entry.prepTime,
            index,
            entry.destination || null
        );
    }
    return null;
}

function buildMiseIngredient(itemText, aisle, prep, prepAction, prepTimeValue, index, destination = null) {
    if (!itemText) {
        return null;
    }
    const normalizedAction = normalizePrepAction(prepAction, prep, itemText);
    const prepTime = parsePrepTime(prepTimeValue);
    return {
        key: `ing-${index}`,
        item: itemText,
        aisle: aisle || null,
        prep: prep || null,
        prepAction: normalizedAction,
        prepTime,
        destination: destination || null,
        label: prep ? `${itemText} — ${prep}` : itemText
    };
}

function normalizePrepAction(action, prepText, itemText) {
    if (action && PREP_ACTION_METADATA[action]) {
        return action;
    }
    const text = `${prepText || ''} ${itemText || ''}`.toLowerCase();
    if (/chop|dice|mince|slice|julienne/.test(text)) return 'chop';
    if (/measure|cup|teaspoon|tablespoon/.test(text)) return 'measure';
    if (/room temperature|temper|soften/.test(text)) return 'temper';
    if (/zest/.test(text)) return 'zest';
    if (/grate|shred/.test(text)) return 'grate';
    if (/sift/.test(text)) return 'sift';
    if (/toast|roast/.test(text)) return 'toast';
    if (/drain|strain/.test(text)) return 'drain';
    return 'other';
}

function parsePrepTime(value) {
    if (typeof value === 'number' && value >= 0) {
        return value;
    }
    if (typeof value === 'string') {
        const numeric = parseFloat(value.replace(/[^\d.]/g, ''));
        if (!Number.isNaN(numeric)) {
            return numeric;
        }
    }
    return null;
}

function normalizeTimeBreakdown(timeMeta, prepTimeText, cookTimeText, aggregatedPrepMinutes = 0) {
    const result = {
        prep: null,
        activeCook: null,
        passive: null,
        total: null
    };
    if (timeMeta && typeof timeMeta === 'object') {
        result.prep = typeof timeMeta.prep === 'number' ? timeMeta.prep : (parseFloat(timeMeta.prep) || null);
        result.activeCook = typeof timeMeta.activeCook === 'number' ? timeMeta.activeCook : (parseFloat(timeMeta.activeCook) || null);
        result.passive = typeof timeMeta.passive === 'number' ? timeMeta.passive : (parseFloat(timeMeta.passive) || null);
        result.total = typeof timeMeta.total === 'number' ? timeMeta.total : (parseFloat(timeMeta.total) || null);
    }
    if (!result.prep && typeof prepTimeText === 'string') {
        result.prep = parseTimeStringToMinutes(prepTimeText);
    }
    if (!result.activeCook && typeof cookTimeText === 'string') {
        result.activeCook = parseTimeStringToMinutes(cookTimeText);
    }
    if (!result.total) {
        const parts = [result.prep, result.activeCook, result.passive].filter(value => typeof value === 'number');
        if (parts.length) {
            result.total = parts.reduce((sum, value) => sum + value, 0);
        } else if (aggregatedPrepMinutes) {
            result.total = aggregatedPrepMinutes;
        }
    }
    if (!result.prep && aggregatedPrepMinutes) {
        result.prep = aggregatedPrepMinutes;
    }
    return result;
}

function parseTimeStringToMinutes(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }
    const numeric = parseFloat(value.replace(/[^\d.]/g, ''));
    if (Number.isNaN(numeric)) {
        return null;
    }
    if (/hour|hr/i.test(value)) {
        return numeric * 60;
    }
    return numeric;
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

function renderIngredientItems(recipe, items) {
    if (!Array.isArray(items) || items.length === 0) return '';
    return items.map(subItem => {
        if (isIngredientSubsection(subItem)) {
            return renderIngredientItems(recipe, subItem.items);
        }
        const markup = renderIngredientLine(recipe, subItem);
        return markup ? `<li>${markup}</li>` : '';
    }).join('');
}

function renderIngredients(recipe, ingredients) {
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
            const subsectionItems = renderIngredientItems(recipe, item.items);
            if (!subsectionItems) return;
            closeList();
            
            html += `<div class="ingredient-subsection">
                <h4 class="ingredient-subsection-title">${escapeHtml(item.subsection)}</h4>
                <ul class="ingredients-list">
                    ${subsectionItems}
                </ul>
            </div>`;
        } else {
            const markup = renderIngredientLine(recipe, item);
            if (!markup) return;
            
            // Regular ingredient - start a list if needed
            if (!listOpen) {
                html += '<ul class="ingredients-list">';
                listOpen = true;
            }
            html += `<li>${markup}</li>`;
        }
    });
    
    closeList();
    return html;
}

// Render instructions with support for subsections
function renderInstructions(recipe) {
    if (!recipe || !recipe.instructions || recipe.instructions.length === 0) return '';
    
    let html = '';
    let currentList = null;
    const state = getScaleState(recipe);
    const scaleFactor = state ? state.scaleFactor || 1 : 1;
    
    // Render items in the order they appear in the JSON
    recipe.instructions.forEach(item => {
        if (isInstructionSubsection(item)) {
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
                const row = renderInstructionLine(subItem, scaleFactor);
                if (row) {
                    html += row;
                }
            });
            
            html += `</ol></div>`;
        } else {
            // Regular instruction - start a list if needed
            if (!currentList) {
                html += '<ol class="instructions-list">';
                currentList = true;
            }
            const row = renderInstructionLine(item, scaleFactor);
            if (row) {
                html += row;
            }
        }
    });
    
    // Close any open list
    if (currentList) {
        html += '</ol>';
    }
    
    return html;
}

function renderInstructionLine(entry, scaleFactor) {
    const text = extractInstructionText(entry);
    if (!text) {
        return '';
    }
    const note = getInstructionScaleNote(entry, scaleFactor);
    return `<li>${escapeHtml(text)}${note}</li>`;
}

function getInstructionScaleNote(entry, scaleFactor) {
    if (!entry || typeof entry !== 'object' || !entry.scaleAdjustment) {
        return '';
    }
    const adjustment = entry.scaleAdjustment;
    if (typeof adjustment.trigger === 'number' && scaleFactor < adjustment.trigger) {
        return '';
    }
    if (typeof adjustment.trigger !== 'number' && isApproximatelyEqual(scaleFactor, 1)) {
        return '';
    }
    if (!adjustment.note) {
        return '';
    }
    return `<span class="instruction-scale-note">⚠️ ${escapeHtml(adjustment.note)}</span>`;
}

function isInstructionSubsection(entry) {
    return entry && typeof entry === 'object' && entry.subsection && Array.isArray(entry.items);
}

function extractInstructionText(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    if (typeof entry === 'object') {
        if (typeof entry.text === 'string') return entry.text;
        if (typeof entry.step === 'string') return entry.step;
    }
    return '';
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
    const prepTime = getDisplayTimeLabel(recipe, 'prep', 'prepTime');
    const cookTime = getDisplayTimeLabel(recipe, 'activeCook', 'cookTime');
    const imageHtml = recipe.image ? 
        `<div class="recipe-image-container">
            <img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}" class="recipe-image" onerror="this.style.display='none'">
        </div>` : '';
    
    // Create a unique ID for this recipe card
    const recipeId = `recipe-${createRecipeSlug(recipe.name)}-${Date.now()}`;
    const isSelected = selectedRecipeNames.has(recipe.name);
    
    const slug = recipe.slug || createRecipeSlug(recipe.name);
    const cookView = renderCookView(recipe);
    const tagLabel = recipe.category || (Array.isArray(recipe.tags) && recipe.tags[0]) || 'Uncategorized';

    return `
        <div class="recipe-card" id="${recipeId}" data-recipe-name="${escapeHtml(recipe.name)}" data-recipe-slug="${escapeHtml(slug)}">
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
            <div class="recipe-details prevent-card-toggle">
                ${cookView}
            </div>
            <span class="recipe-category">${escapeHtml(tagLabel)}</span>
        </div>
    `;
}

function renderCookView(recipe) {
    const servingsHtml = renderServingsSection(recipe);
    const warningsHtml = renderScaleWarningsSection(recipe);
    const ingredientsHtml = renderIngredientsSection(recipe);

    const instructionsHtml = renderInstructionsSection(recipe);

    if (!ingredientsHtml && !instructionsHtml) {
        return `<div class="empty-state">Cooking details coming soon.</div>`;
    }

    return `
        <div class="cook-view-grid">
            ${servingsHtml}
            ${warningsHtml}
            ${ingredientsHtml}
            ${instructionsHtml}
        </div>
    `;
}

function renderServingsSection(recipe) {
    if (!recipe) return '';
    const state = getScaleState(recipe);
    if (!state || typeof state.baseServings !== 'number') {
        return '';
    }
    const isServingUnit = !state.unit ? true : /serving|portion/i.test(state.unit);
    const label = isServingUnit ? 'Serves' : 'Makes';
    const currentValue = typeof state.currentServings === 'number' ? state.currentServings : state.baseServings;
    const displayValue = formatQuantityForDisplay(currentValue);
    const unitLabel = state.unit || (isServingUnit ? 'servings' : 'portions');
    const note = state.note ? `<span class="servings-note">(${escapeHtml(state.note)})</span>` : '';
    const scaledIndicator = isApproximatelyEqual(state.scaleFactor, 1)
        ? ''
        : `<span class="servings-scaled-badge">Scaled from ${formatQuantityForDisplay(state.baseServings)} ${escapeHtml(unitLabel)}</span>`;
    const decrementDisabled = state.scaleFactor <= SCALE_FACTOR_MIN + 0.001;
    const incrementDisabled = state.scaleFactor >= SCALE_FACTOR_MAX - 0.001;
    
    return `
        <div class="servings-section full-width-block prevent-card-toggle" data-role="servings-controls">
            <div class="servings-stepper-row">
                <span class="servings-label">${label}</span>
                <div class="servings-stepper">
                    <button type="button" class="servings-btn" data-scale-action="decrement" ${decrementDisabled ? 'disabled' : ''} aria-label="Decrease servings">−</button>
                    <span class="servings-value" data-role="servings-value">${displayValue}</span>
                    <button type="button" class="servings-btn" data-scale-action="increment" ${incrementDisabled ? 'disabled' : ''} aria-label="Increase servings">+</button>
                </div>
                <span class="servings-unit">${escapeHtml(unitLabel)}</span>
                ${note}
            </div>
            <div class="servings-presets">
                ${renderServingsPresetButton('Half', 'half', state.scaleFactor, 0.5)}
                ${renderServingsPresetButton('Original', 'original', state.scaleFactor, 1)}
                ${renderServingsPresetButton('Double', 'double', state.scaleFactor, 2)}
            </div>
            <div class="servings-meta-row">
                ${scaledIndicator}
                <button type="button" class="servings-reset-btn" data-scale-action="reset" ${isApproximatelyEqual(state.scaleFactor, 1) ? 'disabled' : ''}>Reset</button>
            </div>
        </div>
    `;
}

function renderServingsPresetButton(label, presetKey, currentFactor, targetFactor) {
    const disabled = isApproximatelyEqual(currentFactor, targetFactor);
    const classes = ['servings-preset-btn'];
    if (disabled) {
        classes.push('active');
    }
    return `<button type="button" class="${classes.join(' ')}" data-scale-preset="${presetKey}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function renderScaleWarningsSection(recipe) {
    if (!recipe || !Array.isArray(recipe.scaleWarnings) || recipe.scaleWarnings.length === 0) {
        return '';
    }
    const state = getScaleState(recipe);
    if (!state || isApproximatelyEqual(state.scaleFactor, 1)) {
        return '';
    }
    const factorKey = state.scaleFactor.toFixed(2);
    if (recipe._dismissedScaleWarningFor === factorKey) {
        return '';
    }
    const items = recipe.scaleWarnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('');
    return `
        <div class="scale-warning-box full-width-block prevent-card-toggle" data-role="scale-warning" data-scale-factor="${factorKey}">
            <div class="scale-warning-header">
                <span class="scale-warning-title">⚠️ Scaling Tips</span>
                <button type="button" class="scale-warning-dismiss" data-role="dismiss-scale-warning" aria-label="Dismiss scaling warnings">×</button>
            </div>
            <ul class="scale-warning-list">
                ${items}
            </ul>
        </div>
    `;
}

function renderIngredientsSection(recipe) {
    if (!recipe || !recipe.ingredients || !recipe.ingredients.length) {
        return '';
    }
    const listMarkup = renderIngredients(recipe, recipe.ingredients);
    if (!listMarkup) {
        return '';
    }
    return `
        <div class="ingredients-section">
            <h3>Ingredients</h3>
            ${listMarkup}
        </div>
    `;
}

function renderIngredientLine(recipe, entry) {
    const meta = getScaledIngredientMeta(recipe, entry);
    if (!meta || !meta.displayText) {
        return '';
    }
    const classes = ['ingredient-line'];
    if (meta.flagged) {
        classes.push('ingredient-line-flagged');
    }
    const icon = meta.flagged ? `<span class="ingredient-flag"${meta.warningLabel ? ` title="${escapeHtml(meta.warningLabel)}"` : ''}>⚠️</span>` : '';
    const note = meta.note ? `<span class="ingredient-note">${escapeHtml(meta.note)}</span>` : '';
    return `<span class="${classes.join(' ')}">${escapeHtml(meta.displayText)}</span>${icon}${note}`;
}

function getScaledIngredientMeta(recipe, entry) {
    const baseText = extractIngredientText(entry);
    if (!baseText) {
        return null;
    }
    const normalizedText = baseText.trim();
    const state = getScaleState(recipe);
    const scaleFactor = state ? state.scaleFactor || 1 : 1;
    const behavior = getScaleBehavior(entry);
    const quantityMeta = getIngredientQuantity(entry);
    const parsed = parseIngredientText(baseText);
    const normalizedUnit = quantityMeta && quantityMeta.unit ? quantityMeta.unit : (parsed && parsed.unit ? parsed.unit : null);
    const scaleNote = entry && typeof entry === 'object' && entry.scaleNote ? entry.scaleNote : null;
    let flagged = behavior !== DEFAULT_SCALE_BEHAVIOR || Boolean(scaleNote);
    let warningLabel = behavior !== DEFAULT_SCALE_BEHAVIOR
        ? (SCALE_BEHAVIOR_METADATA[behavior]?.label || 'Scaling caution')
        : (scaleNote ? 'Scaling note' : null);
    let note = scaleNote || null;
    let displayText = normalizedText;
    let scaledQuantity = null;
    const isTasteBehavior = behavior === 'taste';

    if (isTasteBehavior) {
        if (!note) {
            note = 'Adjust to taste';
        }
        flagged = true;
        warningLabel = SCALE_BEHAVIOR_METADATA.taste.label;
        return {
            displayText,
            flagged,
            warningLabel,
            note,
            scaleBehavior: behavior,
            rawText: normalizedText,
            parsedName: parsed && parsed.name ? parsed.name : baseText,
            scaledQuantity: null,
            unit: normalizedUnit,
            isTaste: true
        };
    }

    if (quantityMeta && typeof quantityMeta.amount === 'number') {
        const scaledResult = scaleQuantityValue(quantityMeta.amount, behavior, scaleFactor);
        if (scaledResult) {
            scaledQuantity = scaledResult.amount;
            const amountText = formatQuantityForDisplay(scaledResult.amount);
            const unitText = normalizedUnit ? formatUnit(normalizedUnit, scaledResult.amount) : '';
            const ingredientName = parsed && parsed.name ? parsed.name : normalizedText.replace(/^[\d\s/().-]+/, '').trim();
            displayText = `${amountText}${unitText ? ` ${unitText}` : ''}${ingredientName ? ` ${ingredientName}` : ''}`.trim();

            if (behavior === 'fixed' && !isApproximatelyEqual(scaleFactor, 1)) {
                note = note || 'Does not scale automatically';
                flagged = true;
                warningLabel = SCALE_BEHAVIOR_METADATA.fixed.label;
            }
            if (behavior === 'stepped') {
                warningLabel = SCALE_BEHAVIOR_METADATA.stepped.label;
                if (scaledResult.roundedFrom != null && Math.abs(scaledResult.roundedFrom - scaledResult.amount) >= 0.01) {
                    note = note || `Rounded from ${formatQuantityForDisplay(scaledResult.roundedFrom)}`;
                    flagged = true;
                }
            }
            if (behavior === 'sublinear' && !note) {
                note = SCALE_BEHAVIOR_METADATA.sublinear.label;
            }
        }
    }

    return {
        displayText,
        flagged,
        warningLabel,
        note,
        scaleBehavior: behavior,
        rawText: normalizedText,
        parsedName: parsed && parsed.name ? parsed.name : null,
        scaledQuantity,
        unit: normalizedUnit,
        isTaste: false
    };
}

function getScaleBehavior(entry) {
    if (entry && typeof entry === 'object' && entry.scaleBehavior) {
        const behavior = entry.scaleBehavior.toLowerCase();
        if (SCALE_BEHAVIOR_METADATA[behavior] || behavior === DEFAULT_SCALE_BEHAVIOR) {
            return behavior;
        }
    }
    return DEFAULT_SCALE_BEHAVIOR;
}

function getIngredientQuantity(entry) {
    if (entry && typeof entry === 'object' && entry.quantity && typeof entry.quantity.amount === 'number') {
        return {
            amount: entry.quantity.amount,
            unit: entry.quantity.unit || null
        };
    }
    const text = extractIngredientText(entry);
    if (!text) return null;
    const parsed = parseIngredientText(text);
    if (!parsed || typeof parsed.quantity !== 'number') {
        return null;
    }
    return {
        amount: parsed.quantity,
        unit: parsed.unit || null
    };
}

function scaleQuantityValue(amount, behavior, scaleFactor) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
        return null;
    }
    const factor = typeof scaleFactor === 'number' && Number.isFinite(scaleFactor) ? scaleFactor : 1;
    let scaledAmount = amount;
    let roundedFrom = null;
    switch (behavior) {
        case 'linear':
            scaledAmount = amount * factor;
            break;
        case 'sublinear':
            scaledAmount = amount * Math.sqrt(Math.max(factor, 0));
            break;
        case 'fixed':
            scaledAmount = amount;
            break;
        case 'stepped':
            roundedFrom = amount * factor;
            scaledAmount = Math.max(1, Math.round(roundedFrom));
            break;
        default:
            scaledAmount = amount * factor;
            break;
    }
    return {
        amount: Math.max(0, Math.round(scaledAmount * 100) / 100),
        roundedFrom
    };
}

function renderEquipmentSection(recipe) {
    if (!recipe.equipment || !recipe.equipment.length) {
        return '';
    }
    return `
        <div class="equipment-section">
            <h3>Equipment</h3>
            <ul class="equipment-list">
                ${recipe.equipment.map((item, index) => {
                    return `
                        <li>
                            <span class="equipment-name">${escapeHtml(item.name)}</span>
                            ${item.label ? `<span class="equipment-label">${escapeHtml(item.label)}</span>` : ''}
                        </li>
                    `;
                }).join('')}
            </ul>
        </div>
    `;
}

function renderMiseEnPlaceSection(recipe) {
    if (!recipe.miseIngredients || !recipe.miseIngredients.length) {
        return '';
    }
    
    const actionGroups = groupIngredientsByAction(recipe);
    if (!actionGroups.length) {
        return '';
    }
    
    return `
        <div class="mise-en-place-section">
            <h3>Mise en Place</h3>
            ${actionGroups.map(group => {
                const meta = PREP_ACTION_METADATA[group.key] || PREP_ACTION_METADATA.other;
                return `
                    <div class="mise-action-subsection">
                        <h4 class="mise-action-title">${meta.icon ? `${meta.icon} ` : ''}${escapeHtml(meta.label)}</h4>
                        <ol class="mise-action-list">
                            ${group.items.map(item => {
                                const prepText = item.prep ? ` — ${escapeHtml(item.prep)}` : '';
                                const prepTimeText = item.prepTime != null ? ` <span class="mise-prep-time">(${formatMinutes(item.prepTime)} min)</span>` : '';
                                return `<li>${escapeHtml(item.item)}${prepText}${prepTimeText}</li>`;
                            }).join('')}
                        </ol>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderMiseGroupingControls(recipe, groupingMode) {
    const disableDestination = !recipe.hasDestinations;
    return `
        <div class="mise-group-toggle prevent-card-toggle" role="group" aria-label="Ingredient grouping toggle">
            <span>Group by</span>
            <div class="mise-group-buttons">
                <button type="button" class="mise-group-btn ${groupingMode === 'destination' ? 'active' : ''}" data-group-mode="destination" ${disableDestination ? 'disabled' : ''}>Destination</button>
                <button type="button" class="mise-group-btn ${groupingMode === 'action' ? 'active' : ''}" data-group-mode="action">Prep action</button>
            </div>
        </div>
    `;
}

function renderMiseIngredientGroups(recipe, groupingMode) {
    const groups = groupingMode === 'destination'
        ? groupIngredientsByDestination(recipe)
        : groupIngredientsByAction(recipe);
    if (!groups.length) {
        return '<p class="empty-state">Add prep metadata to build a mise en place checklist.</p>';
    }

    return groups.map(group => `
        <div class="mise-group">
            <div class="mise-group-header">
                <div>
                    <p class="mise-group-title">${group.icon ? `${group.icon} ` : ''}${escapeHtml(group.label)}</p>
                    ${group.subtitle ? `<p class="mise-group-subtitle">${escapeHtml(group.subtitle)}</p>` : ''}
                </div>
                <span class="mise-group-count">${group.items.length} item${group.items.length === 1 ? '' : 's'}</span>
            </div>
            <ul class="mise-checklist">
                ${group.items.map(item => renderMiseIngredientItem(recipe, item)).join('')}
            </ul>
        </div>
    `).join('');
}

function renderMiseIngredientItem(recipe, item) {
    const key = `${recipe.slug}::${item.key}`;
    const prepTimeText = item.prepTime != null ? `🕐 ${formatMinutes(item.prepTime)} min` : '';
    return `
        <li>
            <label class="mise-check-row">
                <input type="checkbox" class="mise-check" data-type="ingredient" data-key="${escapeHtml(key)}" ${item.prepTime != null ? `data-prep-minutes="${item.prepTime}"` : ''}>
                <span class="mise-check-label">${escapeHtml(item.label)}</span>
                ${prepTimeText ? `<span class="mise-check-meta">${prepTimeText}</span>` : ''}
            </label>
        </li>
    `;
}

function renderMiseEquipmentSection(recipe) {
    if (!recipe.equipment || !recipe.equipment.length) {
        return `
            <div class="mise-section mise-equipment">
                <h4>Equipment</h4>
                <p class="empty-state">No equipment metadata yet.</p>
            </div>
        `;
    }
    return `
        <div class="mise-section mise-equipment">
            <h4>Equipment</h4>
            <ul class="mise-checklist">
                ${recipe.equipment.map((item, index) => {
                    const key = `${recipe.slug}::${item.id || `equipment-${index}`}`;
                    return `
                        <li>
                            <label class="mise-check-row">
                                <input type="checkbox" class="mise-check" data-type="equipment" data-key="${escapeHtml(key)}">
                                <span class="mise-check-label">${escapeHtml(item.name)}</span>
                                ${item.label ? `<span class="mise-check-subtext">${escapeHtml(item.label)}</span>` : ''}
                            </label>
                        </li>
                    `;
                }).join('')}
            </ul>
        </div>
    `;
}

function renderMiseTechniquesSection(recipe) {
    if (!recipe.techniques || !recipe.techniques.length) {
        return '';
    }
    return `
        <div class="mise-section mise-techniques">
            <h4>Techniques</h4>
            <ul class="mise-checklist">
                ${recipe.techniques.map(technique => renderTechniqueChecklistItem(recipe, technique)).join('')}
            </ul>
        </div>
    `;
}

function renderTechniqueChecklistItem(recipe, techniqueName) {
    const key = `${recipe.slug}::technique::${techniqueName}`;
    const normalizedName = (techniqueName || '').toLowerCase();
    const technique = techniqueLibrary && (techniqueLibrary[normalizedName] || techniqueLibrary[techniqueName]) ? (techniqueLibrary[normalizedName] || techniqueLibrary[techniqueName]) : null;
    const displayName = technique && technique.label ? technique.label : techniqueName;
    return `
        <li>
            <label class="mise-check-row">
                <input type="checkbox" class="mise-check" data-type="technique" data-key="${escapeHtml(key)}">
                <span class="mise-check-label">${escapeHtml(capitalizeWord(displayName))}</span>
            </label>
            ${technique ? `
                <div class="technique-details">
                    <p class="technique-definition">${escapeHtml(technique.definition)}</p>
                    ${technique.tips ? `<p class="technique-tips">${escapeHtml(technique.tips)}</p>` : ''}
                    ${technique.videoUrl ? `<a href="${escapeHtml(technique.videoUrl)}" target="_blank" rel="noopener" class="technique-link">Watch video</a>` : ''}
                </div>
            ` : ''}
        </li>
    `;
}

function capitalizeWord(value) {
    if (!value || typeof value !== 'string') {
        return '';
    }
    return value.replace(/\b\w/g, char => char.toUpperCase());
}

function getTotalMiseItemsCount(recipe) {
    const ingredientCount = recipe.miseIngredients ? recipe.miseIngredients.length : 0;
    const equipmentCount = recipe.equipment ? recipe.equipment.length : 0;
    const techniqueCount = recipe.techniques ? recipe.techniques.length : 0;
    return ingredientCount + equipmentCount + techniqueCount;
}

function getIngredientGroupingPreference(recipe) {
    if (canUseLocalStorage()) {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEYS.grouping);
            if (stored === 'action') {
                return 'action';
            }
            if (stored === 'destination') {
                return recipe.hasDestinations ? 'destination' : 'action';
            }
        } catch (error) {
            // Ignore storage errors
        }
    }
    return recipe.hasDestinations ? 'destination' : 'action';
}

function setIngredientGroupingPreference(mode) {
    if (!canUseLocalStorage()) return;
    try {
        window.localStorage.setItem(STORAGE_KEYS.grouping, mode);
    } catch (error) {
        // Ignore storage errors
    }
}

function groupIngredientsByDestination(recipe) {
    if (!recipe.miseIngredients || !recipe.miseIngredients.length) {
        return [];
    }
    const groups = [];
    const equipmentGroups = new Map();
    recipe.miseIngredients.forEach(item => {
        const destinationKey = item.destination || '__other__';
        if (!equipmentGroups.has(destinationKey)) {
            equipmentGroups.set(destinationKey, []);
        }
        equipmentGroups.get(destinationKey).push(item);
    });

    equipmentGroups.forEach((items, key) => {
        if (key === '__other__') {
            groups.push({
                key,
                label: 'Other prep',
                subtitle: 'No equipment assigned',
                icon: '🧺',
                items
            });
        } else {
            const equipment = recipe.equipmentMap[key];
            groups.push({
                key,
                label: equipment ? equipment.name : capitalizeWord(key.replace(/[-_]/g, ' ')),
                subtitle: equipment && equipment.label ? equipment.label : (equipment ? null : 'Assign this destination to equipment'),
                icon: '📦',
                items
            });
        }
    });

    return groups;
}

function groupIngredientsByAction(recipe) {
    if (!recipe.miseIngredients || !recipe.miseIngredients.length) {
        return [];
    }
    const actionGroups = new Map();
    recipe.miseIngredients.forEach(item => {
        const action = item.prepAction && PREP_ACTION_METADATA[item.prepAction] ? item.prepAction : 'other';
        if (!actionGroups.has(action)) {
            actionGroups.set(action, []);
        }
        actionGroups.get(action).push(item);
    });
    return Array.from(actionGroups.entries()).map(([action, items]) => {
        const meta = PREP_ACTION_METADATA[action] || PREP_ACTION_METADATA.other;
        return {
            key: action,
            label: meta.label,
            icon: meta.icon,
            subtitle: null,
            items
        };
    });
}

function getChecklistForRecipe(recipeId) {
    if (!recipeId) {
        return { ingredient: {}, equipment: {}, technique: {} };
    }
    if (!miseChecklistState[recipeId]) {
        miseChecklistState[recipeId] = { ingredient: {}, equipment: {}, technique: {} };
    }
    return miseChecklistState[recipeId];
}

function updateChecklistState(recipeId, type, key, value) {
    if (!recipeId || !type || !key) return;
    const state = getChecklistForRecipe(recipeId);
    if (!state[type]) {
        state[type] = {};
    }
    if (value) {
        state[type][key] = true;
    } else {
        delete state[type][key];
    }
    persistChecklistState();
}

function resetChecklist(recipeId) {
    if (!recipeId) return;
    miseChecklistState[recipeId] = { ingredient: {}, equipment: {}, technique: {} };
    persistChecklistState();
}

function persistChecklistState() {
    if (!canUseLocalStorage()) return;
    try {
        window.localStorage.setItem(STORAGE_KEYS.checklist, JSON.stringify(miseChecklistState));
    } catch (error) {
        // Ignore storage errors
    }
}

function loadChecklistState() {
    if (!canUseLocalStorage()) {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.checklist);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch (error) {
        // Ignore
    }
    return {};
}
function renderInstructionsSection(recipe) {
    if (!recipe.instructions || !recipe.instructions.length) {
        return '';
    }
    const defaultInstructions = renderInstructions(recipe);
    const workflowGroups = buildEquipmentWorkflowGroups(recipe);
    const hasWorkflow = workflowGroups.some(group => group.key !== '__general__' && group.steps.length);
    const workflowHtml = hasWorkflow ? renderEquipmentWorkflow(workflowGroups) : '';

    return `
        <div class="instructions-section prevent-card-toggle">
            <h3>Instructions</h3>
            ${hasWorkflow ? `
                <div class="instructions-view-toggle prevent-card-toggle" role="group" aria-label="Instruction order toggle">
                    <button type="button" class="instructions-view-btn active" data-mode-target="order">Recipe order</button>
                    <button type="button" class="instructions-view-btn" data-mode-target="equipment">Equipment workflow</button>
                </div>
            ` : ''}
            <div class="instructions-views" data-active-mode="order">
                <div class="instructions-view active" data-mode="order">
                    ${defaultInstructions}
                </div>
                ${hasWorkflow ? `
                    <div class="instructions-view" data-mode="equipment">
                        ${workflowHtml}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function buildEquipmentWorkflowGroups(recipe) {
    if (!recipe || !Array.isArray(recipe.instructions)) {
        return [];
    }
    const steps = extractInstructionSteps(recipe.instructions);
    if (!steps.length) {
        return [];
    }
    const groups = new Map();
    steps.forEach((step, index) => {
        const hasEquipment = step.destination && recipe.equipmentMap && recipe.equipmentMap[step.destination];
        const key = hasEquipment ? step.destination : '__general__';
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push({
            ...step,
            order: index + 1
        });
    });
    return Array.from(groups.entries()).map(([key, items]) => {
        const equipment = key !== '__general__' ? recipe.equipmentMap[key] || null : null;
        return {
            key,
            equipment,
            label: equipment ? equipment.name : 'General prep',
            subtitle: equipment && equipment.label ? equipment.label : (equipment ? 'Equipment workflow' : 'Unassigned steps'),
            steps: items
        };
    });
}

function renderEquipmentWorkflow(groups) {
    if (!groups.length) {
        return '<p class="instructions-empty">No equipment workflow metadata yet.</p>';
    }
    const generalGroup = groups.find(group => group.key === '__general__');
    const equipmentGroups = groups.filter(group => group.key !== '__general__');
    const orderedGroups = generalGroup ? [...equipmentGroups, generalGroup] : equipmentGroups;
    return `
        <div class="equipment-workflow">
            ${orderedGroups.map(group => `
                <div class="workflow-group">
                    <div class="workflow-group-header">
                        <div>
                            <p class="workflow-group-title">${escapeHtml(group.label)}</p>
                            ${group.subtitle ? `<p class="workflow-group-subtitle">${escapeHtml(group.subtitle)}</p>` : ''}
                        </div>
                        <span class="workflow-count">${group.steps.length} step${group.steps.length === 1 ? '' : 's'}</span>
                    </div>
                    <ol class="workflow-steps">
                        ${group.steps.map(step => `<li>${escapeHtml(step.text)}</li>`).join('')}
                    </ol>
                </div>
            `).join('')}
        </div>
    `;
}

function extractInstructionSteps(instructions) {
    if (!Array.isArray(instructions)) {
        return [];
    }
    const steps = [];
    const pushStep = (entry, subsectionTitle = null) => {
        if (isInstructionSubsection(entry)) {
            entry.items.forEach(item => pushStep(item, entry.subsection || subsectionTitle));
            return;
        }
        const text = extractInstructionText(entry);
        if (!text) return;
        const destination = typeof entry === 'object' && entry.destination ? entry.destination : null;
        const technique = typeof entry === 'object' && entry.technique ? entry.technique : null;
        steps.push({
            text,
            destination,
            technique,
            subsection: subsectionTitle
        });
    };
    instructions.forEach(item => pushStep(item, null));
    return steps;
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
        if (Array.isArray(recipe.tags) && recipe.tags.length) {
            recipe.tags.forEach(tag => {
                if (tag) categories.add(tag);
            });
        } else if (recipe.category) {
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
        const tags = Array.isArray(recipe.tags) ? recipe.tags : (recipe.category ? [recipe.category] : []);
        const categoryMatch = activeCategory === 'all' || tags.includes(activeCategory);
        
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
    await exportRecipesToGoogleTasks(recipes, { shoppingListOnly: true });
}


async function exportSingleRecipe(recipeName) {
    if (isExportInProgress || !recipeName) return;
    const recipe = allRecipes.find(r => r.name === recipeName);
    if (!recipe) {
        showNotification('Unable to find that recipe.');
        return;
    }
    await exportRecipesToGoogleTasks([recipe], { shoppingListOnly: true });
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
        
        if (options.shoppingListOnly) {
            // Only create shopping list with subtasks for each ingredient
            const recipeCount = recipes.length;
            const today = new Date();
            const dateString = today.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            // Use recipe name if single recipe, otherwise "Shopping List"
            const listTitle = recipeCount === 1
                ? `${recipes[0].name} Shopping List (${dateString})`
                : `Shopping List (${dateString})`;
            
            // Create a new task list
            const taskList = await createGoogleTaskList({
                title: listTitle
            }, token);
            
            // Get ingredients organized for subtasks
            const ingredientSubtasks = buildShoppingListSubtasks(recipes);
            
            // Create subtasks for each ingredient in the new list
            for (const ingredient of ingredientSubtasks) {
                await createGoogleTask({
                    title: ingredient
                }, token, taskList.id);
            }
            
            showNotification(`Created shopping list "${listTitle}" with ${ingredientSubtasks.length} items for ${recipeCount} recipe${recipeCount > 1 ? 's' : ''} in Google Tasks`);
            return;
        } else {
            // Legacy behavior: create shopping list + individual recipe tasks
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
        }
        
        for (const payload of tasksPayloads) {
            await createGoogleTask(payload, token);
        }
        
        const recipeCount = recipes.length;
        showNotification(`Created shopping list for ${recipeCount} recipe${recipeCount > 1 ? 's' : ''} in Google Tasks`);
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
        } else if (isInstructionSubsection(entry)) {
            entry.items.forEach(appendStep);
        } else if (typeof entry === 'object') {
            const text = extractInstructionText(entry);
            if (text) {
                steps.push(text);
            }
        }
    };
    instructions.forEach(appendStep);
    return steps;
}

function collectIngredientEntries(recipes) {
    const entries = [];
    let orderCounter = 0;
    const pushEntry = (entry, recipe) => {
        if (isIngredientSubsection(entry)) {
            entry.items.forEach(subItem => pushEntry(subItem, recipe));
            return;
        }
        const meta = getScaledIngredientMeta(recipe, entry);
        if (!meta || !meta.displayText) return;
        const category = entry && typeof entry === 'object' ? (entry.aisle || entry.category || null) : null;
        entries.push({
            text: meta.displayText.trim(),
            rawText: meta.rawText || extractIngredientText(entry) || '',
            category,
            normalizedCategory: normalizeCategory(category),
            order: orderCounter++,
            parsedName: meta.parsedName || null,
            unitKey: meta.unit || '',
            quantity: typeof meta.scaledQuantity === 'number' ? meta.scaledQuantity : null,
            isTaste: Boolean(meta.isTaste),
            scaleBehavior: meta.scaleBehavior || DEFAULT_SCALE_BEHAVIOR
        });
    };
    
    recipes.forEach(recipe => {
        if (!Array.isArray(recipe.ingredients)) return;
        recipe.ingredients.forEach(item => pushEntry(item, recipe));
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

function extractTasteWarnings(entries) {
    const warnings = new Set();
    entries.forEach(entry => {
        if (entry && entry.isTaste) {
            const label = entry.parsedName || entry.rawText || entry.text;
            if (label) {
                warnings.add(label.trim());
            }
        }
    });
    return Array.from(warnings);
}

function buildShoppingListNotes(recipes) {
    const entries = collectIngredientEntries(recipes);
    if (!entries.length) {
        return 'No ingredients found.';
    }
    
    const combined = combineIngredientEntries(entries);
    const useCategories = shouldUseCategorizedList(entries);
    const tasteWarnings = extractTasteWarnings(entries);
    let result = '';
    
    if (!useCategories) {
        result = combined.map(item => `- ${formatCombinedIngredient(item)}`).join('\n');
    } else {
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
        
        result = lines.join('\n').trim();
    }
    
    if (tasteWarnings.length) {
        const warningLine = `⚠️ Adjust to taste: ${tasteWarnings.join(', ')}`;
        result = result ? `${result}\n\n${warningLine}` : warningLine;
    }
    
    return result;
}

function buildShoppingListSubtasks(recipes) {
    const entries = collectIngredientEntries(recipes);
    if (!entries.length) {
        return [];
    }
    
    const combined = combineIngredientEntries(entries);
    const useCategories = shouldUseCategorizedList(entries);
    const tasteWarnings = extractTasteWarnings(entries);
    let subtasks = [];
    
    if (!useCategories) {
        // Simple list - just ingredients
        subtasks = combined.map(item => formatCombinedIngredient(item));
    } else {
        // Grouped by category
        const grouped = new Map();
        combined.forEach(item => {
            const categoryKey = item.normalizedCategory || 'other';
            const label = CATEGORY_LABEL_BY_KEY[categoryKey] || CATEGORY_LABEL_BY_KEY.other;
            if (!grouped.has(label)) {
                grouped.set(label, []);
            }
            grouped.get(label).push(item);
        });
        
        // Create subtasks organized by category
        CATEGORY_GROUPS.forEach(group => {
            const items = grouped.get(group.label);
            if (items && items.length) {
                // Add ingredients for this category
                items
                    .slice()
                    .sort((a, b) => {
                        const nameA = (a.parsedName || a.rawText).toLowerCase();
                        const nameB = (b.parsedName || b.rawText).toLowerCase();
                        return nameA.localeCompare(nameB);
                    })
                    .forEach(item => {
                        subtasks.push(formatCombinedIngredient(item));
                    });
            }
        });
    }
    
    if (tasteWarnings.length) {
        subtasks.push(`⚠️ Adjust to taste: ${tasteWarnings.join(', ')}`);
    }
    
    return subtasks;
}

function combineIngredientEntries(entries) {
    const combined = new Map();
    
    entries.forEach(entry => {
        const normalizedText = normalizeUnicodeFractions(entry.text || '');
        if (!normalizedText) return;
        let parsedName = entry.parsedName || null;
        let normalizedName = parsedName ? parsedName.toLowerCase() : null;
        let unitKey = entry.unitKey || '';
        let quantityValue = typeof entry.quantity === 'number' ? entry.quantity : null;
        let parsed = null;

        if (!normalizedName) {
            parsed = parseIngredientText(normalizedText);
            if (parsed && parsed.name) {
                parsedName = parsed.name;
                normalizedName = parsedName.toLowerCase();
                if (!unitKey) {
                    unitKey = parsed.unit || '';
                }
                if (quantityValue === null && typeof parsed.quantity === 'number') {
                    quantityValue = parsed.quantity;
                }
            }
        }

        const key = normalizedName
            ? `parsed||${unitKey || 'no-unit'}||${normalizedName}`
            : `raw||${normalizedText.toLowerCase()}`;
        const existing = combined.get(key);
        
        if (existing) {
            existing.count += 1;
            existing.order = Math.min(existing.order, entry.order);
            if (quantityValue !== null) {
                if (existing.quantity === null || typeof existing.quantity !== 'number') {
                    existing.quantity = quantityValue;
                } else {
                    existing.quantity += quantityValue;
                }
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
                rawText: entry.rawText || normalizedText,
                parsedName,
                unit: unitKey,
                quantity: quantityValue,
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
        const quantityText = formatQuantityForDisplay(ingredient.quantity);
        const unitText = ingredient.unit ? ` ${formatUnit(ingredient.unit, ingredient.quantity)}` : '';
        return `${quantityText}${unitText} ${ingredient.parsedName}`.trim();
    }
    if (ingredient.count > 1) {
        return `${ingredient.rawText} (x${ingredient.count})`;
    }
    return ingredient.rawText;
}

function formatQuantityForDisplay(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '';
    }
    if (value === 0) {
        return '0';
    }
    const absValue = Math.abs(value);
    if (absValue < 0.0625) {
        return value < 0 ? '< -1/16' : '< 1/16';
    }
    const wholePart = value < 0 ? Math.ceil(value) : Math.floor(value);
    const remainder = Math.abs(value - wholePart);
    const fraction = remainder > 0 ? convertToFraction(remainder) : '';
    if (fraction) {
        if (wholePart === 0) {
            return value < 0 ? `-${fraction}` : fraction;
        }
        return `${wholePart} ${fraction}`;
    }
    if (absValue >= 1000) {
        return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    if (Number.isInteger(value)) {
        return `${value}`;
    }
    return `${Number(value.toFixed(2))}`;
}

function convertToFraction(value) {
    for (const denominator of FRACTION_DENOMINATORS) {
        const numerator = Math.round(value * denominator);
        if (numerator === 0) continue;
        const approximation = numerator / denominator;
        if (Math.abs(approximation - value) <= 0.01) {
            return `${numerator}/${denominator}`;
        }
    }
    return '';
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

function formatMinutes(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return 0;
    }
    return Math.max(0, Math.round(value));
}

function canUseLocalStorage() {
    try {
        return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch (error) {
        return false;
    }
}

function getDisplayTimeLabel(recipe, timeKey, fallbackField) {
    if (recipe && recipe.time && typeof recipe.time[timeKey] === 'number') {
        return `${formatMinutes(recipe.time[timeKey])} min`;
    }
    if (fallbackField && recipe && recipe[fallbackField]) {
        return recipe[fallbackField];
    }
    return 'N/A';
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

async function createGoogleTaskList(payload, token, retryCount = 0) {
    const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
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
        return createGoogleTaskList(payload, refreshedToken, retryCount + 1);
    }
    
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody && errorBody.error && errorBody.error.message
            ? errorBody.error.message
            : 'Google Tasks list creation failed.';
        throw new Error(message);
    }
    
    return response.json();
}

async function createGoogleTask(payload, token, listId = '@default', retryCount = 0) {
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`;
    const response = await fetch(url, {
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
        return createGoogleTask(payload, refreshedToken, listId, retryCount + 1);
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

