const PREP_ACTION_CHOICES = [
  { value: '', label: 'Prep action' },
  { value: 'chop', label: 'Chop' },
  { value: 'measure', label: 'Measure' },
  { value: 'temper', label: 'Temper' },
  { value: 'zest', label: 'Zest' },
  { value: 'grate', label: 'Grate' },
  { value: 'sift', label: 'Sift' },
  { value: 'toast', label: 'Toast' },
  { value: 'drain', label: 'Drain' },
  { value: 'other', label: 'Other' }
];

let currentRecipe = null;
let currentFilename = 'recipe';

document.addEventListener('DOMContentLoaded', () => {
  setupForm();
  addIngredient();
  addInstruction();
  addEquipment();
});

function setupForm() {
  const form = document.getElementById('recipeForm');
  form.addEventListener('submit', handleSubmit);

  document.getElementById('addIngredient').addEventListener('click', () => addIngredient());
  document.getElementById('addInstruction').addEventListener('click', () => addInstruction());
  document.getElementById('addEquipment').addEventListener('click', () => addEquipment());
  document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
  document.getElementById('downloadBtn').addEventListener('click', downloadFile);
}

function addIngredient(existing = {}) {
  const list = document.getElementById('ingredientsList');
  const wrapper = document.createElement('div');
  wrapper.className = 'ingredient-input';
  wrapper.innerHTML = `
    <div class="ingredient-row">
      <input type="text" class="ingredient-field" placeholder="e.g., 2 cups flour" data-field="item" value="${escapeInput(existing.item || '')}">
      <input type="text" class="ingredient-aisle-field" placeholder="Aisle" list="ingredientCategoryList" data-field="aisle" value="${escapeInput(existing.aisle || existing.category || '')}">
    </div>
    <div class="ingredient-row ingredient-meta">
      <input type="text" class="ingredient-prep-field" placeholder="Prep notes (e.g., finely chopped)" data-field="prep" value="${escapeInput(existing.prep || '')}">
      <select class="ingredient-action-field" data-field="prepAction">
        ${buildPrepActionOptions(existing.prepAction || '')}
      </select>
      <input type="number" class="ingredient-preptime-field" placeholder="Minutes" min="0" data-field="prepTime" value="${escapeInput(existing.prepTime || '')}">
      <input type="text" class="ingredient-destination-field" placeholder="Destination id" data-field="destination" value="${escapeInput(existing.destination || '')}">
    </div>
    <button type="button" class="btn btn-danger btn-small remove-btn">Remove</button>
  `;

  wrapper.querySelector('.remove-btn').addEventListener('click', () => {
    wrapper.remove();
  });

  list.appendChild(wrapper);
}

function addInstruction(existing = {}) {
  const list = document.getElementById('instructionsList');
  const wrapper = document.createElement('div');
  wrapper.className = 'instruction-input';
  wrapper.innerHTML = `
    <textarea class="instruction-field" placeholder="e.g., Preheat oven to 350°F" data-field="text">${escapeInput(existing.text || '')}</textarea>
    <input type="text" class="instruction-destination-field" placeholder="Destination id (optional)" data-field="destination" value="${escapeInput(existing.destination || '')}">
    <button type="button" class="btn btn-danger btn-small remove-btn">Remove</button>
  `;

  wrapper.querySelector('.remove-btn').addEventListener('click', () => {
    wrapper.remove();
  });

  list.appendChild(wrapper);
}

function addEquipment(existing = {}) {
  const list = document.getElementById('equipmentList');
  const wrapper = document.createElement('div');
  wrapper.className = 'equipment-input';
  wrapper.innerHTML = `
    <div class="equipment-row">
      <input type="text" class="equipment-field" placeholder="Equipment name" data-field="name" value="${escapeInput(existing.name || '')}">
      <input type="text" class="equipment-field" placeholder="Equipment id (optional)" data-field="id" value="${escapeInput(existing.id || '')}">
      <input type="text" class="equipment-field" placeholder="Label or purpose" data-field="label" value="${escapeInput(existing.label || '')}">
    </div>
    <button type="button" class="btn btn-danger btn-small remove-btn">Remove</button>
  `;

  wrapper.querySelector('.remove-btn').addEventListener('click', () => {
    wrapper.remove();
  });

  list.appendChild(wrapper);
}

function handleSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('recipeName').value.trim();
  const category = document.getElementById('recipeCategory').value.trim();
  const description = document.getElementById('recipeDescription').value.trim();
  const image = document.getElementById('recipeImage').value.trim();
  const tagsInput = document.getElementById('recipeTags').value.trim();
  const techniquesInput = document.getElementById('recipeTechniques').value.trim();

  const time = buildTimePayload(
    document.getElementById('timePrep').value,
    document.getElementById('timeActive').value,
    document.getElementById('timePassive').value,
    document.getElementById('timeTotal').value
  );

  const ingredients = collectIngredientPayloads();
  const instructions = collectInstructionPayloads();
  const equipment = collectEquipmentPayloads();
  const tags = buildTags(category, tagsInput);
  const techniques = parseCSV(techniquesInput);

  if (!name || !category) {
    alert('Please fill in recipe name and category.');
    return;
  }

  if (!ingredients.length) {
    alert('Please add at least one ingredient.');
    return;
  }

  if (!instructions.length) {
    alert('Please add at least one instruction.');
    return;
  }

  const recipe = {
    name,
    category,
    tags: tags.length ? tags : undefined,
    description: description || undefined,
    image: image || undefined,
    ingredients,
    instructions,
    dateAdded: new Date().toISOString()
  };

  if (equipment.length) {
    recipe.equipment = equipment;
  }

  if (techniques.length) {
    recipe.techniques = techniques;
  }

  if (Object.keys(time).length) {
    recipe.time = time;
    if (typeof time.prep === 'number') {
      recipe.prepTime = `${time.prep} minutes`;
    }
    if (typeof time.activeCook === 'number') {
      recipe.cookTime = `${time.activeCook} minutes`;
    }
  }

  const json = JSON.stringify(recipe, null, 2);
  currentRecipe = recipe;
  currentFilename = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  window.currentRecipe = recipe;
  window.currentRecipeName = currentFilename;

  const output = document.getElementById('recipeJson');
  output.value = json;
  document.getElementById('fileOutput').style.display = 'block';
  document.getElementById('successMessage').classList.add('show');
  document.getElementById('fileOutput').scrollIntoView({ behavior: 'smooth' });
}

function collectIngredientPayloads() {
  const nodes = document.querySelectorAll('.ingredient-input');
  return Array.from(nodes).map(node => {
    const item = node.querySelector('[data-field="item"]').value.trim();
    if (!item) {
      return null;
    }
    const payload = { item };
    const aisle = node.querySelector('[data-field="aisle"]').value.trim();
    const prep = node.querySelector('[data-field="prep"]').value.trim();
    const prepAction = node.querySelector('[data-field="prepAction"]').value;
    const prepTimeValue = node.querySelector('[data-field="prepTime"]').value.trim();
    const destination = node.querySelector('[data-field="destination"]').value.trim();

    if (aisle) payload.aisle = aisle;
    if (prep) payload.prep = prep;
    if (prepAction) payload.prepAction = prepAction;
    if (prepTimeValue) {
      const minutes = Number(prepTimeValue);
      if (!Number.isNaN(minutes)) {
        payload.prepTime = minutes;
      }
    }
    if (destination) payload.destination = destination;
    return payload;
  }).filter(Boolean);
}

function collectInstructionPayloads() {
  const nodes = document.querySelectorAll('.instruction-input');
  return Array.from(nodes).map(node => {
    const text = node.querySelector('[data-field="text"]').value.trim();
    if (!text) {
      return null;
    }
    const destination = node.querySelector('[data-field="destination"]').value.trim();
    if (destination) {
      return { text, destination };
    }
    return text;
  }).filter(Boolean);
}

function collectEquipmentPayloads() {
  const nodes = document.querySelectorAll('.equipment-input');
  return Array.from(nodes).map(node => {
    const name = node.querySelector('[data-field="name"]').value.trim();
    if (!name) {
      return null;
    }
    const payload = { name };
    const id = node.querySelector('[data-field="id"]').value.trim();
    const label = node.querySelector('[data-field="label"]').value.trim();
    if (id) payload.id = id;
    if (label) payload.label = label;
    return payload;
  }).filter(Boolean);
}

function buildPrepActionOptions(selected) {
  return PREP_ACTION_CHOICES.map(choice => {
    const isSelected = choice.value === selected ? 'selected' : '';
    return `<option value="${choice.value}" ${isSelected}>${choice.label}</option>`;
  }).join('');
}

function buildTags(category, extraTags) {
  const base = category ? [category] : [];
  const extras = parseCSV(extraTags);
  return Array.from(new Set([...base, ...extras]));
}

function buildTimePayload(prep, active, passive, total) {
  const payload = {};
  const prepValue = sanitizeNumber(prep);
  const activeValue = sanitizeNumber(active);
  const passiveValue = sanitizeNumber(passive);
  const totalValue = sanitizeNumber(total);

  if (prepValue != null) payload.prep = prepValue;
  if (activeValue != null) payload.activeCook = activeValue;
  if (passiveValue != null) payload.passive = passiveValue;
  if (totalValue != null) payload.total = totalValue;

  return payload;
}

function sanitizeNumber(value) {
  if (!value && value !== 0) {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function parseCSV(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(tag => tag.toLowerCase());
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
  if (!currentRecipe) {
    alert('Please generate a recipe first.');
    return;
  }

  const json = JSON.stringify(currentRecipe, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentFilename || 'recipe'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeInput(value) {
  const safeValue = value == null ? '' : String(value);
  return safeValue.replace(/["&<>]/g, char => ({
    '"': '&quot;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  }[char] || char));
}
