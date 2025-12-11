#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RECIPES_DIR = path.join(__dirname, '..', 'recipes');
const APPLY_CHANGES = process.argv.includes('--apply');
const TARGET_ARG = process.argv.find(arg => arg.endsWith('.json'));

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

    // Convert ingredient category to aisle
    if (Array.isArray(recipe.ingredients)) {
        migrated.ingredients = recipe.ingredients.map(ing => {
            if (typeof ing === 'string') {
                return { item: ing };
            }
            if (typeof ing === 'object' && ing !== null) {
                const migratedIng = { ...ing };
                // Convert category to aisle if aisle doesn't exist
                if (ing.category && !ing.aisle) {
                    migratedIng.aisle = ing.category;
                    delete migratedIng.category;
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
