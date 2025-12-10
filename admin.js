// Admin page functionality
let ingredients = [];
let instructions = [];

document.addEventListener('DOMContentLoaded', () => {
    setupForm();
    addIngredient();
    addInstruction();
});

function setupForm() {
    const form = document.getElementById('recipeForm');
    form.addEventListener('submit', handleSubmit);
    
    document.getElementById('addIngredient').addEventListener('click', addIngredient);
    document.getElementById('addInstruction').addEventListener('click', addInstruction);
    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('downloadBtn').addEventListener('click', downloadFile);
}

function addIngredient(existing = { item: '', aisle: '' }) {
    const ingredientsList = document.getElementById('ingredientsList');
    const index = ingredients.length;
    
    const ingredientDiv = document.createElement('div');
    ingredientDiv.className = 'ingredient-input';
    ingredientDiv.innerHTML = `
        <input type="text" 
               class="ingredient-field" 
               placeholder="e.g., 2 cups flour"
               data-index="${index}"
               value="${existing.item || ''}">
        <input type="text"
               class="ingredient-aisle-field"
               placeholder="Aisle (optional)"
               list="ingredientAisleList"
               data-index="${index}"
               value="${existing.aisle || ''}">
        <button type="button" class="btn btn-danger btn-small remove-btn">Remove</button>
    `;
    
    ingredientsList.appendChild(ingredientDiv);
    
    const itemInput = ingredientDiv.querySelector('.ingredient-field');
    const aisleInput = ingredientDiv.querySelector('.ingredient-aisle-field');
    
    const handleInput = (inputEl, field) => {
        inputEl.addEventListener('input', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            ingredients[idx] = ingredients[idx] || { item: '', aisle: '' };
            ingredients[idx][field] = e.target.value;
        });
    };
    
    handleInput(itemInput, 'item');
    handleInput(aisleInput, 'aisle');
    
    ingredientDiv.querySelector('.remove-btn').addEventListener('click', () => {
        const idx = parseInt(itemInput.getAttribute('data-index'));
        ingredients.splice(idx, 1);
        ingredientDiv.remove();
        updateIngredientIndices();
    });
    
    ingredients.push({
        item: existing.item || '',
        aisle: existing.aisle || ''
    });
}

function addInstruction() {
    const instructionsList = document.getElementById('instructionsList');
    const index = instructions.length;
    
    const instructionDiv = document.createElement('div');
    instructionDiv.className = 'instruction-input';
    instructionDiv.innerHTML = `
        <textarea class="instruction-field" 
                  placeholder="e.g., Preheat oven to 350°F"
                  data-index="${index}"></textarea>
        <button type="button" class="btn btn-danger btn-small remove-btn">Remove</button>
    `;
    
    instructionsList.appendChild(instructionDiv);
    
    const textarea = instructionDiv.querySelector('.instruction-field');
    textarea.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        instructions[idx] = e.target.value;
    });
    
    instructionDiv.querySelector('.remove-btn').addEventListener('click', () => {
        const idx = parseInt(textarea.getAttribute('data-index'));
        instructions.splice(idx, 1);
        instructionDiv.remove();
        updateInstructionIndices();
    });
    
    instructions.push('');
}

function updateIngredientIndices() {
    const wrappers = document.querySelectorAll('.ingredient-input');
    ingredients = [];
    wrappers.forEach((wrapper, idx) => {
        const itemInput = wrapper.querySelector('.ingredient-field');
        const aisleInput = wrapper.querySelector('.ingredient-aisle-field');
        
        if (itemInput) {
            itemInput.setAttribute('data-index', idx);
        }
        
        if (aisleInput) {
            aisleInput.setAttribute('data-index', idx);
        }
        
        ingredients[idx] = {
            item: itemInput ? itemInput.value : '',
            aisle: aisleInput ? aisleInput.value : ''
        };
    });
}

function updateInstructionIndices() {
    const textareas = document.querySelectorAll('.instruction-field');
    instructions = [];
    textareas.forEach((textarea, idx) => {
        textarea.setAttribute('data-index', idx);
        instructions[idx] = textarea.value;
    });
}

function handleSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('recipeName').value.trim();
    const description = document.getElementById('recipeDescription').value.trim();
    const prepTime = document.getElementById('prepTime').value.trim();
    const cookTime = document.getElementById('cookTime').value.trim();
    const image = document.getElementById('recipeImage').value.trim();
    const tagsInput = document.getElementById('recipeTags').value.trim();
    const tags = tagsInput
        ? tagsInput.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean)
        : [];
    
    // Filter out empty ingredients and instructions
    const filteredIngredients = ingredients
        .map(ing => {
            if (!ing) return null;
            if (typeof ing === 'string') {
                const text = ing.trim();
                return text ? { item: text } : null;
            }
            const item = (ing.item || '').trim();
            const aisle = (ing.aisle || '').trim();
            if (!item) return null;
            const normalized = { item };
            if (aisle) {
                normalized.aisle = aisle;
            }
            return normalized;
        })
        .filter(ing => ing && ing.item);
    const filteredInstructions = instructions.filter(inst => inst.trim() !== '');
    
    // Validation
    if (!name) {
        alert('Please fill in recipe name.');
        return;
    }
    
    if (filteredIngredients.length === 0) {
        alert('Please add at least one ingredient.');
        return;
    }
    
    if (filteredInstructions.length === 0) {
        alert('Please add at least one instruction.');
        return;
    }
    
    // Create recipe object
    const recipe = {
        name: name,
        tags: tags,
        description: description || undefined,
        prepTime: prepTime || undefined,
        cookTime: cookTime || undefined,
        image: image || undefined,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        dateAdded: new Date().toISOString()
    };
    
    // Generate JSON
    const json = JSON.stringify(recipe, null, 2);
    
    // Display output
    document.getElementById('recipeJson').value = json;
    document.getElementById('fileOutput').style.display = 'block';
    document.getElementById('successMessage').classList.add('show');
    
    // Scroll to output
    document.getElementById('fileOutput').scrollIntoView({ behavior: 'smooth' });
    
    // Store recipe for download
    window.currentRecipe = recipe;
    window.currentRecipeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function copyToClipboard() {
    const textarea = document.getElementById('recipeJson');
    textarea.select();
    document.execCommand('copy');
    
    const btn = document.getElementById('copyBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.backgroundColor = '#2ecc71';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = '';
    }, 2000);
}

function downloadFile() {
    const recipe = window.currentRecipe;
    const filename = window.currentRecipeName || 'recipe';
    
    const json = JSON.stringify(recipe, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

