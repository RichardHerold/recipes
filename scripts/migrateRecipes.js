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

// Common equipment patterns and their normalized names
const EQUIPMENT_PATTERNS = [
    // Bowls
    { pattern: /\b(large|medium|small)\s+(mixing\s+)?bowl\b/gi, name: (match) => `${match[1]} mixing bowl`, id: (match) => `bowl-${match[1].toLowerCase()}` },
    { pattern: /\bmixing\s+bowl\b/gi, name: () => 'mixing bowl', id: () => 'bowl-mixing' },
    { pattern: /\b(large|medium|small)\s+bowl\b/gi, name: (match) => `${match[1]} bowl`, id: (match) => `bowl-${match[1].toLowerCase()}` },
    { pattern: /\bbowl\b/gi, name: () => 'bowl', id: () => 'bowl' },
    
    // Skillets and pans
    { pattern: /\b(large|medium|small)\s+heavy\s+skillet\b/gi, name: (match) => `${match[1]} heavy skillet`, id: (match) => `skillet-${match[1].toLowerCase()}` },
    { pattern: /\b(large|medium|small)\s+skillet\b/gi, name: (match) => `${match[1]} skillet`, id: (match) => `skillet-${match[1].toLowerCase()}` },
    { pattern: /\b\d+\s*[-]?\s*inch\s+skillet\b/gi, name: (match) => match[0].replace(/\s+/g, ' '), id: (match) => `skillet-${match[0].match(/\d+/)[0]}in` },
    { pattern: /\bskillet\b/gi, name: () => 'skillet', id: () => 'skillet' },
    { pattern: /\bfrying\s+pan\b/gi, name: () => 'frying pan', id: () => 'pan-frying' },
    { pattern: /\b(large|medium|small)\s+pan\b/gi, name: (match) => `${match[1]} pan`, id: (match) => `pan-${match[1].toLowerCase()}` },
    { pattern: /\bsaucepan\b/gi, name: () => 'saucepan', id: () => 'saucepan' },
    { pattern: /\b(large|medium|small)\s+pot\b/gi, name: (match) => `${match[1]} pot`, id: (match) => `pot-${match[1].toLowerCase()}` },
    { pattern: /\bdutch\s+oven\b/gi, name: () => 'dutch oven', id: () => 'dutch-oven' },
    
    // Baking equipment
    { pattern: /\bbaking\s+sheet\b/gi, name: () => 'baking sheet', id: () => 'sheet-pan' },
    { pattern: /\bsheet\s+pan\b/gi, name: () => 'sheet pan', id: () => 'sheet-pan' },
    { pattern: /\bsheet\s+tray\b/gi, name: () => 'sheet tray', id: () => 'sheet-pan' },
    { pattern: /\b(lined\s+)?sheet\s+tray\b/gi, name: () => 'sheet tray', id: () => 'sheet-pan' },
    { pattern: /\bbaking\s+tray\b/gi, name: () => 'baking tray', id: () => 'sheet-pan' },
    { pattern: /\bhalf\s+size\s+baking\s+sheet\b/gi, name: () => 'half size baking sheet', id: () => 'sheet-pan-half' },
    { pattern: /\bwire\s+rack\b/gi, name: () => 'wire rack', id: () => 'rack-wire' },
    { pattern: /\bcooling\s+rack\b/gi, name: () => 'cooling rack', id: () => 'rack-wire' },
    { pattern: /\bparchment\s+paper\b/gi, name: () => 'parchment paper', id: () => 'parchment-paper' },
    
    // Measuring equipment
    { pattern: /\b(large|medium|small)\s+(liquid\s+)?measuring\s+cup\b/gi, name: (match) => `${match[1]} ${match[2] || ''}measuring cup`.trim(), id: (match) => `measuring-cup-${match[1].toLowerCase()}` },
    { pattern: /\bmeasuring\s+cup\b/gi, name: () => 'measuring cup', id: () => 'measuring-cup' },
    { pattern: /\bmeasuring\s+spoon\b/gi, name: () => 'measuring spoon', id: () => 'measuring-spoon' },
    
    // Mixing equipment
    { pattern: /\bstand\s+mixer\b/gi, name: () => 'stand mixer', id: () => 'mixer-stand' },
    { pattern: /\bhand\s+mixer\b/gi, name: () => 'hand mixer', id: () => 'mixer-hand' },
    { pattern: /\belectric\s+mixer\b/gi, name: () => 'electric mixer', id: () => 'mixer-electric' },
    { pattern: /\bmixer\b/gi, name: () => 'mixer', id: () => 'mixer' },
    { pattern: /\bwhisk\b/gi, name: () => 'whisk', id: () => 'whisk' },
    { pattern: /\bspatula\b/gi, name: () => 'spatula', id: () => 'spatula' },
    { pattern: /\brubber\s+spatula\b/gi, name: () => 'rubber spatula', id: () => 'spatula-rubber' },
    { pattern: /\bwooden\s+spoon\b/gi, name: () => 'wooden spoon', id: () => 'spoon-wooden' },
    
    // Food processors and blenders
    { pattern: /\bfood\s+processor\b/gi, name: () => 'food processor', id: () => 'food-processor' },
    { pattern: /\bblender\b/gi, name: () => 'blender', id: () => 'blender' },
    { pattern: /\bimmersion\s+blender\b/gi, name: () => 'immersion blender', id: () => 'blender-immersion' },
    
    // Cutting equipment
    { pattern: /\bcutting\s+board\b/gi, name: () => 'cutting board', id: () => 'cutting-board' },
    { pattern: /\bchef['']?s\s+knife\b/gi, name: () => "chef's knife", id: () => 'knife-chef' },
    { pattern: /\bparing\s+knife\b/gi, name: () => 'paring knife', id: () => 'knife-paring' },
    { pattern: /\bdough\s+cutter\b/gi, name: () => 'dough cutter', id: () => 'dough-cutter' },
    { pattern: /\bbiscuit\s+cutter\b/gi, name: (match) => match[0], id: () => 'biscuit-cutter' },
    { pattern: /\b\d+in\s+round\s+cutter\b/gi, name: (match) => match[0], id: (match) => `cutter-${match[0].match(/\d+/)[0]}in` },
    
    // Rolling and shaping
    { pattern: /\brolling\s+pin\b/gi, name: () => 'rolling pin', id: () => 'rolling-pin' },
    
    // Other common equipment
    { pattern: /\bramekin\b/gi, name: () => 'ramekin', id: () => 'ramekin' },
    { pattern: /\boven\b/gi, name: () => 'oven', id: () => 'oven' },
    { pattern: /\bmicrowave\b/gi, name: () => 'microwave', id: () => 'microwave' },
    { pattern: /\bstovetop\b/gi, name: () => 'stovetop', id: () => 'stovetop' },
    { pattern: /\bgrill\b/gi, name: () => 'grill', id: () => 'grill' },
    { pattern: /\bslow\s+cooker\b/gi, name: () => 'slow cooker', id: () => 'slow-cooker' },
    { pattern: /\bcrock\s+pot\b/gi, name: () => 'crock pot', id: () => 'slow-cooker' },
    { pattern: /\bcolander\b/gi, name: () => 'colander', id: () => 'colander' },
    { pattern: /\bstrainer\b/gi, name: () => 'strainer', id: () => 'strainer' },
    { pattern: /\bsieve\b/gi, name: () => 'sieve', id: () => 'sieve' },
    { pattern: /\bgrater\b/gi, name: () => 'grater', id: () => 'grater' },
    { pattern: /\bzester\b/gi, name: () => 'zester', id: () => 'zester' },
    { pattern: /\btongs\b/gi, name: () => 'tongs', id: () => 'tongs' },
    { pattern: /\btimer\b/gi, name: () => 'timer', id: () => 'timer' },
];

function extractEquipmentFromText(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }
    
    const found = new Map();
    
    for (const { pattern, name, id } of EQUIPMENT_PATTERNS) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
            const equipmentName = typeof name === 'function' ? name(match) : name;
            const equipmentId = typeof id === 'function' ? id(match) : id;
            
            // Normalize name for deduplication
            const normalizedName = equipmentName.toLowerCase().trim();
            
            if (!found.has(normalizedName)) {
                found.set(normalizedName, {
                    name: equipmentName,
                    id: equipmentId
                });
            }
        }
    }
    
    return Array.from(found.values());
}

// Helper to check if equipment is likely the same (e.g., "large mixing bowl" and "bowl")
// Returns: 0 = not related, 1 = candidate is subset of existing (skip candidate), 2 = existing is subset of candidate (replace existing)
function compareEquipmentSpecificity(existing, candidate) {
    const existingLower = existing.toLowerCase().trim();
    const candidateLower = candidate.toLowerCase().trim();
    
    if (existingLower === candidateLower) {
        return 1; // Exact match, skip candidate
    }
    
    // If existing is more specific and contains candidate, candidate is a subset
    if (existingLower.includes(candidateLower) && existingLower.length > candidateLower.length) {
        return 1; // Skip candidate (existing is more specific)
    }
    // If candidate is more specific and contains existing, existing is a subset
    if (candidateLower.includes(existingLower) && candidateLower.length > existingLower.length) {
        return 2; // Replace existing with candidate (candidate is more specific)
    }
    return 0; // Not related
}

// Get a normalized key for equipment matching
function getEquipmentKey(eq) {
    if (eq.id) return eq.id;
    return eq.name.toLowerCase().trim();
}

function extractEquipmentFromRecipe(recipe) {
    const equipmentSet = new Map(); // Maps key -> equipment object
    const equipmentNames = new Map(); // Maps normalized name -> key (for subset checking)
    
    // Process instructions sequentially (step by step)
    if (Array.isArray(recipe.instructions)) {
        recipe.instructions.forEach((inst, stepIndex) => {
            let texts = [];
            
            // Collect all text from this step
            if (typeof inst === 'string') {
                texts.push(inst);
            } else if (inst && typeof inst === 'object') {
                if (inst.text) {
                    texts.push(inst.text);
                } else if (inst.subsection && Array.isArray(inst.items)) {
                    // For subsections, each item is a separate step
                    inst.items.forEach(item => {
                        if (typeof item === 'string') {
                            texts.push(item);
                        } else if (item && typeof item === 'object' && item.text) {
                            texts.push(item.text);
                        }
                    });
                }
            }
            
            // Process each text in this step
            texts.forEach(text => {
                if (!text) return;
                
                // Extract all equipment from this step's text
                const equipmentInStep = extractEquipmentFromText(text);
                
                // Track equipment seen in this step (for same-step deduplication)
                const stepEquipmentKeys = new Set();
                
                equipmentInStep.forEach(eq => {
                    const key = getEquipmentKey(eq);
                    const eqName = eq.name.toLowerCase().trim();
                    
                    // Check if this equipment was already seen in a previous step (exact match)
                    if (equipmentSet.has(key)) {
                        // Already added from a previous step, skip
                        return;
                    }
                    
                    // Check if we already saw this in the current step
                    if (stepEquipmentKeys.has(key)) {
                        // Same equipment in same step - don't add again
                        return;
                    }
                    
                    // Check if this is a subset/superset of existing equipment
                    let shouldSkip = false;
                    let shouldReplaceKey = null;
                    let shouldReplaceName = null;
                    
                    for (const [existingName, existingKey] of equipmentNames.entries()) {
                        const comparison = compareEquipmentSpecificity(existingName, eqName);
                        if (comparison === 1) {
                            // Candidate is subset of existing, skip it
                            shouldSkip = true;
                            break;
                        } else if (comparison === 2) {
                            // Candidate is more specific than existing, mark for replacement
                            shouldReplaceKey = existingKey;
                            shouldReplaceName = existingName;
                            break;
                        }
                    }
                    
                    if (shouldSkip) {
                        // This is likely referring to equipment we already have, skip
                        return;
                    }
                    
                    if (shouldReplaceKey) {
                        // Replace the less specific equipment with this more specific one
                        equipmentSet.delete(shouldReplaceKey);
                        equipmentNames.delete(shouldReplaceName);
                    }
                    
                    // New equipment! Add it
                    equipmentSet.set(key, eq);
                    equipmentNames.set(eqName, key);
                    stepEquipmentKeys.add(key);
                });
            });
        });
    }
    
    // Extract from ingredients (process sequentially, but ingredients are typically not step-ordered)
    // Equipment in ingredients is usually listed separately, so we add all unique items
    if (Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(ing => {
            if (typeof ing === 'string') {
                const equipment = extractEquipmentFromText(ing);
                equipment.forEach(eq => {
                    const key = getEquipmentKey(eq);
                    const eqName = eq.name.toLowerCase().trim();
                    
                    if (equipmentSet.has(key)) return;
                    
                    // Check for subset/superset
                    let shouldSkip = false;
                    let shouldReplaceKey = null;
                    let shouldReplaceName = null;
                    
                    for (const [existingName, existingKey] of equipmentNames.entries()) {
                        const comparison = compareEquipmentSpecificity(existingName, eqName);
                        if (comparison === 1) {
                            shouldSkip = true;
                            break;
                        } else if (comparison === 2) {
                            shouldReplaceKey = existingKey;
                            shouldReplaceName = existingName;
                            break;
                        }
                    }
                    
                    if (shouldSkip) return;
                    if (shouldReplaceKey) {
                        equipmentSet.delete(shouldReplaceKey);
                        equipmentNames.delete(shouldReplaceName);
                    }
                    
                    equipmentSet.set(key, eq);
                    equipmentNames.set(eqName, key);
                });
            } else if (ing && typeof ing === 'object') {
                if (ing.item) {
                    const equipment = extractEquipmentFromText(ing.item);
                    equipment.forEach(eq => {
                        const key = getEquipmentKey(eq);
                        const eqName = eq.name.toLowerCase().trim();
                        
                        if (equipmentSet.has(key)) return;
                        
                        let shouldSkip = false;
                        let shouldReplace = null;
                        
                        for (const [existingName, existingKey] of equipmentNames.entries()) {
                            const comparison = compareEquipmentSpecificity(existingName, eqName);
                            if (comparison === 1) {
                                shouldSkip = true;
                                break;
                            } else if (comparison === 2) {
                                shouldReplace = existingKey;
                                break;
                            }
                        }
                        
                        if (shouldSkip) return;
                        if (shouldReplace) {
                            equipmentSet.delete(shouldReplace);
                            equipmentNames.delete(equipmentNames.get(shouldReplace) || '');
                        }
                        
                        equipmentSet.set(key, eq);
                        equipmentNames.set(eqName, key);
                    });
                }
                // Check for equipment subsection
                if (ing.subsection && ing.subsection.toLowerCase().includes('equipment') && Array.isArray(ing.items)) {
                    ing.items.forEach(item => {
                        let eqName = '';
                        let eqId = '';
                        
                        if (typeof item === 'string') {
                            const trimmed = item.trim();
                            if (trimmed && !trimmed.match(/^\d/)) {
                                eqName = trimmed;
                                eqId = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            }
                        } else if (item && typeof item === 'object' && item.item) {
                            const trimmed = item.item.trim();
                            if (trimmed) {
                                eqName = trimmed;
                                eqId = trimmed.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            }
                        }
                        
                        if (eqName) {
                            const key = eqId || eqName.toLowerCase();
                            const normalizedName = eqName.toLowerCase().trim();
                            
                            if (equipmentSet.has(key)) return;
                            
                            let shouldSkip = false;
                            let shouldReplace = null;
                            
                            for (const [existingName, existingKey] of equipmentNames.entries()) {
                                const comparison = compareEquipmentSpecificity(existingName, normalizedName);
                                if (comparison === 1) {
                                    shouldSkip = true;
                                    break;
                                } else if (comparison === 2) {
                                    shouldReplace = existingKey;
                                    break;
                                }
                            }
                            
                            if (shouldSkip) return;
                            if (shouldReplace) {
                                equipmentSet.delete(shouldReplace);
                                equipmentNames.delete(equipmentNames.get(shouldReplace) || '');
                            }
                            
                            equipmentSet.set(key, {
                                name: eqName,
                                id: eqId
                            });
                            equipmentNames.set(normalizedName, key);
                        }
                    });
                }
            }
        });
    }
    
    return Array.from(equipmentSet.values());
}

// Reorder recipe properties to ensure equipment comes before instructions
function reorderRecipeProperties(recipe) {
    // Define the desired property order
    const orderedRecipe = {};
    
    // Core fields (always present)
    if (recipe.name !== undefined) orderedRecipe.name = recipe.name;
    if (recipe.category !== undefined) orderedRecipe.category = recipe.category;
    if (recipe.description !== undefined) orderedRecipe.description = recipe.description;
    if (recipe.prepTime !== undefined) orderedRecipe.prepTime = recipe.prepTime;
    if (recipe.cookTime !== undefined) orderedRecipe.cookTime = recipe.cookTime;
    if (recipe.image !== undefined) orderedRecipe.image = recipe.image;
    if (recipe.ingredients !== undefined) orderedRecipe.ingredients = recipe.ingredients;
    
    // Equipment comes before instructions
    if (recipe.equipment !== undefined) orderedRecipe.equipment = recipe.equipment;
    if (recipe.instructions !== undefined) orderedRecipe.instructions = recipe.instructions;
    
    // Remaining fields
    if (recipe.dateAdded !== undefined) orderedRecipe.dateAdded = recipe.dateAdded;
    if (recipe.tags !== undefined) orderedRecipe.tags = recipe.tags;
    if (recipe.time !== undefined) orderedRecipe.time = recipe.time;
    if (recipe.techniques !== undefined) orderedRecipe.techniques = recipe.techniques;
    
    // Include any other properties that might exist
    for (const key in recipe) {
        if (!orderedRecipe.hasOwnProperty(key)) {
            orderedRecipe[key] = recipe[key];
        }
    }
    
    return orderedRecipe;
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

    // Extract and add equipment from recipe text
    // Always re-extract to apply improved deduplication logic (tracks equipment across steps)
    const extractedEquipment = extractEquipmentFromRecipe(migrated);
    if (extractedEquipment.length > 0) {
        migrated.equipment = extractedEquipment;
    } else {
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
            const reordered = reorderRecipeProperties(migrated);

            // Check if migration actually changed anything
            // Compare content (ignoring order) and also check if order needs fixing
            const originalReordered = reorderRecipeProperties(recipe);
            const originalStr = JSON.stringify(originalReordered, null, 2);
            const migratedStr = JSON.stringify(reordered, null, 2);
            
            // Also check if the original file has wrong property order (equipment after instructions)
            const originalParsed = JSON.parse(original);
            const originalKeys = Object.keys(originalParsed);
            const instructionsIndex = originalKeys.indexOf('instructions');
            const equipmentIndex = originalKeys.indexOf('equipment');
            const needsReorder = equipmentIndex !== -1 && instructionsIndex !== -1 && equipmentIndex > instructionsIndex;

            if (originalStr !== migratedStr || needsReorder) {
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
