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

export function normalizeUnicodeFractions(text = '') {
  return text.replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (match) => UNICODE_FRACTIONS[match] || match);
}

export function isIngredientSubsection(entry) {
  return Boolean(entry && typeof entry === 'object' && entry.subsection && Array.isArray(entry.items));
}

export function isInstructionSubsection(entry) {
  return Boolean(entry && typeof entry === 'object' && entry.subsection && Array.isArray(entry.items));
}

export function extractIngredientText(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry.item) return entry.item;
  return '';
}

export function extractInstructionText(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (entry.text) return entry.text;
  return '';
}

export function stripQuantityFromText(text = '') {
  const normalized = normalizeUnicodeFractions(text.trim());
  return normalized.replace(/^([\d/().\s-]+)([a-zA-Z]+)?\s*/, '').trim();
}

export function parseIngredientText(text = '') {
  const normalized = normalizeUnicodeFractions(text.trim());
  const quantityMatch = normalized.match(/^([\d/().\s-]+)/);
  if (!quantityMatch) {
    return null;
  }
  const quantityPart = quantityMatch[1].trim();
  const remaining = normalized.slice(quantityMatch[0].length).trim();
  const unitMatch = remaining.match(/^([a-zA-Z]+)\b/);
  let unit = null;
  let name = remaining;
  if (unitMatch) {
    unit = unitMatch[1];
    name = remaining.slice(unit.length).trim();
  }
  const quantity = evaluateQuantity(quantityPart);
  if (quantity === null) {
    return null;
  }
  return {
    quantity,
    unit,
    name
  };
}

function evaluateQuantity(input) {
  if (!input) return null;
  const parts = input.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const part of parts) {
    if (part.includes('/')) {
      const [numerator, denominator] = part.split('/').map(Number);
      if (!denominator) {
        return null;
      }
      total += numerator / denominator;
    } else {
      const value = Number(part.replace(/[^0-9.]/g, ''));
      if (Number.isNaN(value)) {
        return null;
      }
      total += value;
    }
  }
  return Math.round(total * 100) / 100;
}

export function flattenIngredients(ingredients = []) {
  const list = [];
  ingredients.forEach((entry) => {
    if (isIngredientSubsection(entry)) {
      entry.items.forEach((child) => list.push({ ...child, subsection: entry.subsection }));
    } else {
      list.push(entry);
    }
  });
  return list;
}

export function flattenInstructions(instructions = []) {
  const result = [];
  instructions.forEach((entry) => {
    if (isInstructionSubsection(entry)) {
      entry.items.forEach((child) => {
        result.push({ text: child, subsection: entry.subsection });
      });
    } else if (typeof entry === 'string') {
      result.push({ text: entry });
    } else if (entry) {
      result.push({ ...entry });
    }
  });
  return result;
}
