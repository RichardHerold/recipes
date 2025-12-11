# Recipe Schema Documentation

This document provides comprehensive documentation for the recipe JSON schema. The schema supports both simple and enhanced formats, with full backward compatibility.

## Table of Contents

- [Overview](#overview)
- [Basic Schema](#basic-schema)
- [Enhanced Schema Fields](#enhanced-schema-fields)
- [Ingredient Schema](#ingredient-schema)
- [Equipment Schema](#equipment-schema)
- [Time Schema](#time-schema)
- [Instruction Schema](#instruction-schema)
- [Subsections](#subsections)
- [Complete Example](#complete-example)
- [Migration](#migration)

## Overview

The recipe schema has evolved to support both simple recipes and advanced features like prep tracking, equipment management, and time breakdowns. All new fields are optional, ensuring backward compatibility with existing recipes.

**Key Principles:**

- All new fields are optional
- Simple recipes work without any enhanced fields
- Enhanced features can be added incrementally
- The schema is self-documenting through examples

## Basic Schema

Every recipe requires these core fields:

```json
{
  "name": "Recipe Name",
  "category": "Category Name",
  "ingredients": [],
  "instructions": []
}
```

### Required Fields

- **`name`** (string, required): The recipe name
- **`ingredients`** (array, required): List of ingredients (see [Ingredient Schema](#ingredient-schema))
- **`instructions`** (array, required): List of cooking instructions (see [Instruction Schema](#instruction-schema))

### Optional Basic Fields

- **`category`** (string, optional): Primary category. Also used as the first tag if `tags` is not provided.
  - **Recommended values:** Appetizer, Main Course, Dessert, Side Dish, Breakfast, Lunch, Dinner, Snack, Beverage, Other
- **`description`** (string, optional): Recipe description or notes
- **`prepTime`** (string, optional): Prep time as human-readable string (e.g., "15 minutes", "1 hour")
- **`cookTime`** (string, optional): Cook time as human-readable string (e.g., "30 minutes", "2 hours")
- **`image`** (string, optional): URL or path to recipe image
- **`dateAdded`** (string, optional): ISO 8601 date string (e.g., "2024-01-15T10:00:00.000Z")

### Basic Example

```json
{
  "name": "Chocolate Chip Cookies",
  "category": "Dessert",
  "description": "Classic homemade chocolate chip cookies",
  "prepTime": "15 minutes",
  "cookTime": "12 minutes",
  "image": "images/chocolate-chip-cookies.jpg",
  "ingredients": [
    "2 1/4 cups all-purpose flour",
    "1 cup butter, softened",
    "3/4 cup granulated sugar"
  ],
  "instructions": [
    "Preheat oven to 375°F",
    "Mix dry ingredients in a bowl",
    "Cream butter and sugars",
    "Bake for 9-11 minutes"
  ],
  "dateAdded": "2024-01-15T10:00:00.000Z"
}
```

## Enhanced Schema Fields

The following fields enable advanced features but are completely optional:

### Tags

**`tags`** (array of strings, optional): Additional tags for filtering and organization.

- If not provided, the `category` field automatically becomes the first tag
- Tags should be lowercase and hyphen-safe (e.g., "vegetarian", "make-ahead", "gluten-free")
- Useful for multi-dimensional filtering beyond categories

```json
{
  "tags": ["dessert", "cookies", "make-ahead", "vegetarian"]
}
```

### Time Breakdown

**`time`** (object, optional): Structured time breakdown in minutes.

If not provided, the system will parse `prepTime` and `cookTime` strings. If provided, this takes precedence.

```json
{
  "time": {
    "prep": 15,
    "activeCook": 30,
    "passive": 20,
    "total": 65
  }
}
```

**Time fields:**

- **`prep`** (number, optional): Prep time in minutes
- **`activeCook`** (number, optional): Active cooking time in minutes
- **`passive`** (number, optional): Passive time (resting, marinating, etc.) in minutes
- **`total`** (number, optional): Total time in minutes (can be calculated from other fields)

### Equipment

**`equipment`** (array of objects, optional): Required equipment for the recipe.

```json
{
  "equipment": [
    {
      "name": "Large mixing bowl",
      "id": "bowl-dry",
      "label": "For dry ingredients"
    },
    {
      "name": "Stand mixer",
      "id": "mixer",
      "label": "For creaming butter and sugar"
    }
  ]
}
```

**Equipment fields:**

- **`name`** (string, required): Equipment name
- **`id`** (string, optional): Unique identifier for referencing in ingredients/instructions
  - Use kebab-case (e.g., "bowl-dry", "skillet-large")
  - Should be stable and descriptive
- **`label`** (string, optional): Description or purpose of the equipment

### Techniques

**`techniques`** (array of strings, optional): Cooking techniques used in the recipe.

Technique names should match entries in `data/techniques.json` for tooltip support.

```json
{
  "techniques": ["sauté", "deglaze", "temper"]
}
```

## Ingredient Schema

Ingredients can be simple strings or rich objects with metadata.

### Simple Format

The simplest format is just a string:

```json
{
  "ingredients": ["2 cups all-purpose flour", "1 cup sugar", "2 large eggs"]
}
```

### Object Format with Aisle

Add grocery aisle information for shopping list organization:

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
      "item": "2 large eggs",
      "aisle": "Dairy & Eggs"
    }
  ]
}
```

### Enhanced Format with Structured Quantity

For better parsing and scaling, use structured quantity fields:

```json
{
  "ingredients": [
    {
      "item": "2 cups all-purpose flour",
      "quantity": {
        "amount": 2,
        "unit": "cup"
      },
      "name": "all-purpose flour",
      "aisle": "Baking & Spices"
    },
    {
      "item": "1 cup butter",
      "quantity": {
        "amount": 1,
        "unit": "cup"
      },
      "name": "butter",
      "aisle": "Dairy & Eggs"
    },
    {
      "item": "2 large eggs",
      "quantity": {
        "amount": 2,
        "unit": null
      },
      "name": "large eggs",
      "aisle": "Dairy & Eggs"
    }
  ]
}
```

### Enhanced Format with Prep Metadata

For advanced prep tracking, include prep information along with structured quantities:

```json
{
  "ingredients": [
    {
      "item": "2 cups all-purpose flour",
      "quantity": {
        "amount": 2,
        "unit": "cup"
      },
      "name": "all-purpose flour",
      "aisle": "Baking & Spices",
      "prep": "sifted",
      "prepAction": "sift",
      "prepTime": 5,
      "destination": "bowl-dry"
    },
    {
      "item": "1 cup butter",
      "quantity": {
        "amount": 1,
        "unit": "cup"
      },
      "name": "butter",
      "aisle": "Dairy & Eggs",
      "prep": "softened, at room temperature",
      "prepAction": "temper",
      "prepTime": 30,
      "destination": "counter"
    },
    {
      "item": "2 large eggs",
      "quantity": {
        "amount": 2,
        "unit": null
      },
      "name": "large eggs",
      "aisle": "Dairy & Eggs",
      "prep": "beaten",
      "prepAction": "other",
      "prepTime": 2
    }
  ]
}
```

### Ingredient Fields

| Field         | Type   | Required | Description                                                                             |
| ------------- | ------ | -------- | --------------------------------------------------------------------------------------- |
| `item`        | string | Yes      | Ingredient name and quantity (human-readable format, e.g., "2 cups flour")              |
| `quantity`    | object | No       | Structured quantity object with `amount` (number) and `unit` (string or null)           |
| `name`        | string | No       | Ingredient name without quantity/unit (e.g., "all-purpose flour")                       |
| `aisle`       | string | No       | Grocery store aisle/section (see [Recommended Aisle Values](#recommended-aisle-values)) |
| `prep`        | string | No       | Prep notes (e.g., "finely chopped", "at room temperature")                              |
| `prepAction`  | string | No       | Prep action type (see [Prep Actions](#prep-actions))                                    |
| `prepTime`    | number | No       | Estimated prep time in minutes                                                          |
| `destination` | string | No       | Equipment ID where ingredient should be prepped                                         |

**Quantity Object:**

- **`amount`** (number, required if quantity is provided): The numeric quantity (e.g., 2, 1.5, 0.5)
- **`unit`** (string or null, optional): The unit of measurement (e.g., "cup", "tablespoon", "pound", "gram"). Use `null` for count-based items (e.g., "2 eggs" has unit `null`)

**Notes:**

- The `item` field is always required and should contain the full human-readable text
- The `quantity` and `name` fields are optional but enable better parsing, scaling, and unit conversion
- If `quantity` is provided, `amount` is required; `unit` can be `null` for count-based items
- Common units: cup, tablespoon, teaspoon, pound, ounce, gram, kilogram, liter, milliliter, piece, whole, etc.
- Migration scripts automatically parse `item` text to extract `quantity` and `name` when possible
- Migration scripts attempt to infer `prepAction` from ingredient text patterns (e.g., "chopped" → `chop`, "sifted" → `sift`, ingredients with units → `measure`)
- Prep fields (`prep`, `prepAction`, `prepTime`, `destination`) can be added:
  - **Manually** through the admin interface (`admin.html`)
  - **Automatically** using the AI enrichment script: `ANTHROPIC_API_KEY=sk-... node scripts/enrichRecipes.js --apply`
- Complex formats (e.g., "3 to 4 cups", "40g (⅓ cup)") may require manual adjustment after migration

**Note:** The `category` field in ingredients is deprecated in favor of `aisle`. Migration scripts automatically convert `category` to `aisle`.

### Recommended Aisle Values

Use these standardized aisle names for consistency:

- Produce
- Meat & Poultry
- Seafood
- Dairy & Eggs
- Bakery
- Pantry & Dry Goods
- Baking & Spices
- Canned & Jarred
- Frozen Foods
- Condiments & Sauces
- International & Specialty
- Beverages
- Deli & Prepared Foods
- Household & Misc
- Other

### Prep Actions

The `prepAction` field uses these standardized values:

- **`chop`**: Chopping, dicing, mincing
- **`measure`**: Measuring ingredients
- **`temper`**: Bringing to room temperature
- **`zest`**: Zesting citrus
- **`grate`**: Grating cheese, vegetables, etc.
- **`sift`**: Sifting dry ingredients
- **`toast`**: Toasting nuts, bread, etc.
- **`drain`**: Draining liquids
- **`other`**: Other prep actions

## Equipment Schema

Equipment objects define the tools and vessels needed for a recipe.

### Equipment Object Structure

```json
{
  "equipment": [
    {
      "name": "Large mixing bowl",
      "id": "bowl-dry",
      "label": "For dry ingredients"
    }
  ]
}
```

### Equipment Fields

| Field   | Type   | Required | Description                                                   |
| ------- | ------ | -------- | ------------------------------------------------------------- |
| `name`  | string | Yes      | Equipment name (e.g., "Large mixing bowl", "12-inch skillet") |
| `id`    | string | No       | Unique identifier for referencing                             |
| `label` | string | No       | Description or purpose                                        |

### Equipment ID Best Practices

- Use kebab-case: `bowl-dry`, `skillet-large`, `sheet-pan`
- Be descriptive: `bowl-wet` vs `bowl-dry`
- Keep IDs stable (don't change them after creation)
- Reference equipment IDs in ingredient `destination` and instruction `destination` fields

## Time Schema

Time can be specified as strings (human-readable) or as a structured object (machine-readable).

### String Format (Backward Compatible)

```json
{
  "prepTime": "15 minutes",
  "cookTime": "30 minutes"
}
```

Supports various formats:

- "15 minutes"
- "1 hour"
- "1 hour 30 minutes"
- "45 mins"

### Structured Format

```json
{
  "time": {
    "prep": 15,
    "activeCook": 30,
    "passive": 20,
    "total": 65
  }
}
```

**Time object fields:**

- **`prep`** (number): Prep time in minutes
- **`activeCook`** (number): Active cooking time in minutes
- **`passive`** (number): Passive time (resting, marinating, proofing, etc.) in minutes
- **`total`** (number): Total time in minutes

**Precedence:** If both string and object formats are provided, the `time` object takes precedence.

## Instruction Schema

Instructions can be simple strings or objects with equipment references.

### Simple Format

```json
{
  "instructions": [
    "Preheat oven to 375°F",
    "Mix dry ingredients in a bowl",
    "Cream butter and sugars until fluffy",
    "Bake for 9-11 minutes until golden brown"
  ]
}
```

### Enhanced Format with Equipment

Link instructions to specific equipment:

```json
{
  "instructions": [
    "Preheat oven to 375°F",
    {
      "text": "Mix dry ingredients in a large bowl",
      "destination": "bowl-dry"
    },
    {
      "text": "Cream butter and sugars in stand mixer",
      "destination": "mixer"
    },
    "Bake for 9-11 minutes until golden brown"
  ]
}
```

### Instruction Fields

| Field         | Type   | Required        | Description                         |
| ------------- | ------ | --------------- | ----------------------------------- |
| `text`        | string | Yes (if object) | Instruction text                    |
| `destination` | string | No              | Equipment ID where this step occurs |

## Subsections

Both ingredients and instructions support subsections for better organization.

### Ingredient Subsections

Group related ingredients:

```json
{
  "ingredients": [
    {
      "item": "2 cups all-purpose flour",
      "aisle": "Baking & Spices"
    },
    {
      "subsection": "For the Frosting",
      "items": [
        {
          "item": "1 cup powdered sugar",
          "aisle": "Baking & Spices"
        },
        {
          "item": "4 tbsp butter",
          "aisle": "Dairy & Eggs"
        }
      ]
    }
  ]
}
```

### Instruction Subsections

Group related steps:

```json
{
  "instructions": [
    {
      "subsection": "Mise en Place",
      "items": [
        "Preheat oven to 350°F",
        "Line baking sheet with parchment",
        "Prepare all ingredients"
      ]
    },
    "Mix dry ingredients in a large bowl",
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

**Subsection structure:**

- **`subsection`** (string): Subsection title
- **`items`** (array): Items within the subsection (ingredients or instructions)

## Complete Example

Here's a complete example using all schema features:

```json
{
  "name": "Perfect Chocolate Chip Cookies",
  "category": "Dessert",
  "description": "The ultimate chocolate chip cookie recipe with crispy edges and chewy centers",
  "prepTime": "15 minutes",
  "cookTime": "12 minutes",
  "image": "images/chocolate-chip-cookies.jpg",
  "tags": ["dessert", "cookies", "baking", "make-ahead"],
  "time": {
    "prep": 15,
    "activeCook": 12,
    "passive": 0,
    "total": 27
  },
  "equipment": [
    {
      "name": "Large mixing bowl",
      "id": "bowl-dry",
      "label": "For dry ingredients"
    },
    {
      "name": "Stand mixer",
      "id": "mixer",
      "label": "For creaming butter and sugar"
    },
    {
      "name": "Baking sheets",
      "id": "sheet-pan",
      "label": "For baking cookies"
    }
  ],
  "techniques": ["cream", "fold", "bake"],
  "ingredients": [
    {
      "item": "2 1/4 cups all-purpose flour",
      "aisle": "Baking & Spices",
      "prep": "sifted",
      "prepAction": "sift",
      "prepTime": 3,
      "destination": "bowl-dry"
    },
    {
      "item": "1 cup butter",
      "aisle": "Dairy & Eggs",
      "prep": "softened, at room temperature",
      "prepAction": "temper",
      "prepTime": 30
    },
    {
      "item": "3/4 cup granulated sugar",
      "aisle": "Baking & Spices",
      "prepAction": "measure",
      "prepTime": 1
    },
    {
      "item": "2 cups chocolate chips",
      "aisle": "Baking & Spices"
    }
  ],
  "instructions": [
    {
      "subsection": "Mise en Place",
      "items": [
        "Preheat oven to 375°F",
        "Line baking sheets with parchment paper",
        "Sift flour into mixing bowl"
      ]
    },
    {
      "text": "Cream butter and sugars in stand mixer until light and fluffy",
      "destination": "mixer"
    },
    "Beat in eggs one at a time, then add vanilla",
    "Gradually mix in flour until just combined",
    "Stir in chocolate chips",
    {
      "subsection": "Baking",
      "items": [
        "Drop rounded tablespoons of dough onto baking sheets",
        "Bake for 9-11 minutes until golden brown",
        "Cool on baking sheet for 2 minutes",
        "Transfer to wire rack to cool completely"
      ]
    }
  ],
  "dateAdded": "2024-01-15T10:00:00.000Z"
}
```

## Migration

### Migrating Existing Recipes

To migrate existing recipes to the new schema format, use the migration script:

```bash
# Dry run (preview changes without modifying files)
node scripts/migrateRecipes.js

# Apply changes to all recipes
node scripts/migrateRecipes.js --apply

# Migrate a specific recipe
node scripts/migrateRecipes.js recipe-name.json --apply
```

### What the Migration Script Does

1. **Converts `category` to `tags`**: Creates a `tags` array with the category as the first tag (keeps `category` for backward compatibility)
2. **Converts ingredient `category` to `aisle`**: Renames the `category` field in ingredients to `aisle`
3. **Parses time strings**: Converts `prepTime` and `cookTime` strings into a `time` object with numeric minutes
4. **Adds empty arrays**: Adds empty `equipment` and `techniques` arrays if missing
5. **Parses ingredient quantities**: Extracts `quantity` (amount and unit) and `name` from ingredient `item` text when possible
6. **Infers prep actions**: Attempts to infer `prepAction` from ingredient text patterns (e.g., "chopped" → `chop`, "sifted" → `sift`)

**Note:** For full prep metadata (`prep`, `prepAction`, `prepTime`, `destination`), use the AI enrichment script which analyzes instructions and ingredients to provide comprehensive prep information.

### Backward Compatibility

The schema maintains full backward compatibility:

- Recipes without enhanced fields work exactly as before
- The `category` field is preserved even when `tags` is added
- String time formats (`prepTime`, `cookTime`) work alongside the `time` object
- Simple ingredient strings work alongside rich ingredient objects
- Simple instruction strings work alongside instruction objects

### Best Practices

1. **Start simple**: Begin with basic fields, add enhanced fields as needed
2. **Use consistent aisle names**: Stick to the recommended aisle values
3. **Create stable equipment IDs**: Once created, don't change equipment IDs
4. **Be descriptive**: Use clear, descriptive names for equipment and prep notes
5. **Validate**: Use the admin interface to validate schema before committing

## Additional Resources

- [Main README](../README.md) - General project documentation
- [Admin Interface](../admin.html) - Web-based recipe editor with schema validation
- [Migration Script](../scripts/migrateRecipes.js) - Automated schema migration tool
- [Enrichment Script](../scripts/enrichRecipes.js) - AI-powered metadata enrichment
