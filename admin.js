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

function addIngredient() {
    const ingredientsList = document.getElementById('ingredientsList');
    const index = ingredients.length;
    
    const ingredientDiv = document.createElement('div');
    ingredientDiv.className = 'ingredient-input';
    ingredientDiv.innerHTML = `
        <input type="text" 
               class="ingredient-field" 
               placeholder="e.g., 2 cups flour"
               data-index="${index}">
        <button type="button" class="btn btn-danger btn-small remove-btn">Remove</button>
    `;
    
    ingredientsList.appendChild(ingredientDiv);
    
    const input = ingredientDiv.querySelector('.ingredient-field');
    input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        ingredients[idx] = e.target.value;
    });
    
    ingredientDiv.querySelector('.remove-btn').addEventListener('click', () => {
        const idx = parseInt(input.getAttribute('data-index'));
        ingredients.splice(idx, 1);
        ingredientDiv.remove();
        updateIngredientIndices();
    });
    
    ingredients.push('');
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
    const inputs = document.querySelectorAll('.ingredient-field');
    ingredients = [];
    inputs.forEach((input, idx) => {
        input.setAttribute('data-index', idx);
        ingredients[idx] = input.value;
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
    const category = document.getElementById('recipeCategory').value.trim();
    const description = document.getElementById('recipeDescription').value.trim();
    const prepTime = document.getElementById('prepTime').value.trim();
    const cookTime = document.getElementById('cookTime').value.trim();
    const image = document.getElementById('recipeImage').value.trim();
    
    // Filter out empty ingredients and instructions
    const filteredIngredients = ingredients.filter(ing => ing.trim() !== '');
    const filteredInstructions = instructions.filter(inst => inst.trim() !== '');
    
    // Validation
    if (!name || !category) {
        alert('Please fill in recipe name and category.');
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
        category: category,
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

