#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RECIPES_DIR = path.join(__dirname, '..', 'recipes');
const APPLY_CHANGES = process.argv.includes('--apply');
const TARGET_ARG = process.argv.find(arg => arg.endsWith('.json'));

// Unit synonyms mapping (simplified version from app.js)
const UNIT_SYNONYMS = {
    'cup': { base: 'cup' },
    'cups': { base: 'cup' },
    'c': { base: 'cup' },
    'tablespoon': { base: 'tablespoon' },
    'tablespoons': { base: 'tablespoon' },
    'tbsp': { base: 'tablespoon' },
    'tbs': { base: 'tablespoon' },
    'teaspoon': { base: 'teaspoon' },
    'teaspoons': { base: 'teaspoon' },
    'tsp': { base: 'teaspoon' },
    'pound': { base: 'pound' },
    'pounds': { base: 'pound' },
    'lb': { base: 'pound' },
    'lbs': { base: 'pound' },
    'ounce': { base: 'ounce' },
    'ounces': { base: 'ounce' },
    'oz': { base: 'ounce' },
    'gram': { base: 'gram' },
    'grams': { base: 'gram' },
    'g': { base: 'gram' },
    'kilogram': { base: 'kilogram' },
    'kilograms': { base: 'kilogram' },
    'kg': { base: 'kilogram' },
    'liter': { base: 'liter' },
    'liters': { base: 'liter' },
    'l': { base: 'liter' },
    'milliliter': { base: 'milliliter' },
    'milliliters': { base: 'milliliter' },
    'ml': { base: 'milliliter' },
    'piece': { base: null },
    'pieces': { base: null },
    'whole': { base: null },
    'large': { base: null },
    'medium': { base: null },
    'small': { base: null }
};

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

function inferPrepAction(itemText, prepText) {
    if (!itemText) return null;
    const text = `${prepText || ''} ${itemText || ''}`.toLowerCase();
    
    // Check for common prep patterns
    if (/chop|dice|mince|slice|julienne|chopped|diced|minced|sliced/.test(text)) return 'chop';
    if (/measure|cup|teaspoon|tablespoon|measured/.test(text)) return 'measure';
    if (/room temperature|temper|soften|softened|at room temp/.test(text)) return 'temper';
    if (/zest|zested/.test(text)) return 'zest';
    if (/grate|shred|grated|shredded/.test(text)) return 'grate';
    if (/sift|sifted/.test(text)) return 'sift';
    if (/toast|roast|toasted|roasted/.test(text)) return 'toast';
    if (/drain|strain|drained|strained/.test(text)) return 'drain';
    
    // Default to 'other' if we can't determine
    return null;
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

function migrateRecipe(recipe) {
    const migrated = { ...recipe };

    // Convert category to tags array
    if (recipe.category && !Array.isArray(recipe.tags)) {
        migrated.tags = [recipe.category];
    } else if (!Array.isArray(recipe.tags)) {
        migrated.tags = [];
    }

    // Convert ingredient category to aisle and parse quantity/unit/name
    if (Array.isArray(recipe.ingredients)) {
        migrated.ingredients = recipe.ingredients.map(ing => {
            if (typeof ing === 'string') {
                const parsed = parseIngredientText(ing);
                const result = { item: ing };
                if (parsed) {
                    result.quantity = {
                        amount: parsed.quantity,
                        unit: parsed.unit || null
                    };
                    result.name = parsed.name;
                }
                // Infer prepAction from text
                const inferredAction = inferPrepAction(ing, null);
                if (inferredAction) {
                    result.prepAction = inferredAction;
                }
                return result;
            }
            if (typeof ing === 'object' && ing !== null) {
                const migratedIng = { ...ing };
                // Convert category to aisle if aisle doesn't exist
                if (ing.category && !ing.aisle) {
                    migratedIng.aisle = ing.category;
                    delete migratedIng.category;
                }
                // Parse quantity/unit/name if not already present
                if (!migratedIng.quantity && migratedIng.item) {
                    const parsed = parseIngredientText(migratedIng.item);
                    if (parsed) {
                        migratedIng.quantity = {
                            amount: parsed.quantity,
                            unit: parsed.unit || null
                        };
                        if (!migratedIng.name) {
                            migratedIng.name = parsed.name;
                        }
                    }
                }
                // Infer prepAction from ingredient text if not present
                if (!migratedIng.prepAction && migratedIng.item) {
                    const inferredAction = inferPrepAction(migratedIng.item, migratedIng.prep);
                    if (inferredAction) {
                        migratedIng.prepAction = inferredAction;
                    }
                }
                return migratedIng;
            }
            return ing;
        });
    }

    // Convert prepTime and cookTime to time object
    if (!migrated.time || typeof migrated.time !== 'object') {
        const prepMinutes = parseTimeStringToMinutes(recipe.prepTime);
        const cookMinutes = parseTimeStringToMinutes(recipe.cookTime);
        
        migrated.time = {};
        if (prepMinutes !== null) {
            migrated.time.prep = Math.round(prepMinutes);
        }
        if (cookMinutes !== null) {
            migrated.time.activeCook = Math.round(cookMinutes);
        }
        // Calculate total if we have prep and/or cook time
        if (prepMinutes !== null || cookMinutes !== null) {
            const parts = [prepMinutes, cookMinutes].filter(v => v !== null);
            if (parts.length > 0) {
                migrated.time.total = Math.round(parts.reduce((sum, v) => sum + v, 0));
            }
        }
    }

    // Add empty arrays for equipment and techniques if missing
    if (!Array.isArray(migrated.equipment)) {
        migrated.equipment = [];
    }
    if (!Array.isArray(migrated.techniques)) {
        migrated.techniques = [];
    }

    // Ensure instructions can have destination field (no migration needed, just preserve structure)
    if (Array.isArray(migrated.instructions)) {
        migrated.instructions = migrated.instructions.map(inst => {
            if (typeof inst === 'string') {
                return inst;
            }
            if (typeof inst === 'object' && inst !== null) {
                return inst;
            }
            return inst;
        });
    }

    return migrated;
}

async function main() {
    const recipeFiles = await collectRecipeFiles(TARGET_ARG);
    if (!recipeFiles.length) {
        console.error('No recipe files found to migrate.');
        process.exit(1);
    }

    console.log(`Processing ${recipeFiles.length} recipe${recipeFiles.length === 1 ? '' : 's'}${APPLY_CHANGES ? ' with apply' : ' (dry run)'}.`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const file of recipeFiles) {
        try {
            const absolutePath = path.join(RECIPES_DIR, file);
            const original = await fs.promises.readFile(absolutePath, 'utf8');
            const recipe = JSON.parse(original);
            const migrated = migrateRecipe(recipe);

            // Check if migration actually changed anything
            const originalStr = JSON.stringify(recipe, null, 2);
            const migratedStr = JSON.stringify(migrated, null, 2);

            if (originalStr !== migratedStr) {
                if (APPLY_CHANGES) {
                    await fs.promises.writeFile(absolutePath, migratedStr + '\n', 'utf8');
                    console.log(`✔ Updated ${file}`);
                    updatedCount++;
                } else {
                    console.log(`ℹ Would update ${file}`);
                    updatedCount++;
                }
            } else {
                console.log(`○ No changes needed for ${file}`);
            }
        } catch (error) {
            console.error(`✗ Failed to process ${file}:`, error.message);
            errorCount++;
        }
    }

    console.log(`\nSummary: ${updatedCount} file${updatedCount === 1 ? '' : 's'} ${APPLY_CHANGES ? 'updated' : 'would be updated'}, ${errorCount} error${errorCount === 1 ? '' : 's'}.`);
    if (!APPLY_CHANGES && updatedCount > 0) {
        console.log('\nRun with --apply to actually update the files.');
    }
}

async function collectRecipeFiles(targetFile) {
    if (targetFile) {
        // If targetFile is a full path, extract just the filename
        const filename = path.basename(targetFile);
        return [filename];
    }
    const entries = await fs.promises.readdir(RECIPES_DIR);
    return entries.filter(entry => entry.endsWith('.json') && entry !== 'recipes-index.json');
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = { migrateRecipe, parseTimeStringToMinutes };
