import { formatQuantity } from './formatting.js';
import {
  extractIngredientText,
  parseIngredientText,
  stripQuantityFromText
} from './parsing.js';

const DEFAULT_BEHAVIOR = 'linear';
const SUPPORTED_BEHAVIORS = new Set([
  'linear',
  'sublinear',
  'fixed',
  'taste',
  'stepped'
]);

export function scaleIngredient(ingredient, scaleFactor = 1) {
  const baseText = extractIngredientText(ingredient);
  if (!baseText) {
    return { display: '', warning: null };
  }

  const behavior = getBehavior(ingredient);
  if (behavior === 'taste') {
    return {
      display: baseText,
      warning: ingredient?.scaleNote || 'Adjust to taste',
      scaleBehavior: behavior,
      parsedName: stripQuantityFromText(baseText)
    };
  }

  const quantityMeta = extractQuantityMeta(ingredient, baseText);
  if (!quantityMeta) {
    return {
      display: baseText,
      warning: null,
      scaleBehavior: behavior,
      parsedName: stripQuantityFromText(baseText)
    };
  }

  const scaled = applyBehavior(quantityMeta.amount, behavior, scaleFactor);
  const ingredientName = ingredient?.name || ingredient?.label || stripQuantityFromText(baseText);
  const display = `${formatQuantity(scaled.amount, quantityMeta.unit)}${ingredientName ? ` ${ingredientName}` : ''}`.trim();

  let warning = null;
  if (behavior === 'fixed' && scaleFactor !== 1) {
    warning = ingredient?.scaleNote || 'Amount does not scale';
  } else if (behavior === 'stepped' && scaled.roundedFrom != null && Math.abs(scaled.roundedFrom - scaled.amount) >= 0.01) {
    const roundedFrom = formatQuantity(scaled.roundedFrom, quantityMeta.unit);
    warning = ingredient?.scaleNote || `Rounded from ${roundedFrom}`;
  } else if (behavior === 'sublinear' && scaleFactor !== 1) {
    warning = ingredient?.scaleNote || 'Season gently when scaling';
  } else if (ingredient?.scaleNote && scaleFactor !== 1) {
    warning = ingredient.scaleNote;
  }

  return {
    display,
    warning,
    scaleBehavior: behavior,
    scaledQuantity: scaled.amount,
    unit: quantityMeta.unit,
    parsedName: ingredientName,
    category: ingredient?.aisle || ingredient?.category || null
  };
}

function getBehavior(ingredient) {
  const behavior = ingredient?.scaleBehavior?.toLowerCase?.();
  if (behavior && SUPPORTED_BEHAVIORS.has(behavior)) {
    return behavior;
  }
  return DEFAULT_BEHAVIOR;
}

function extractQuantityMeta(ingredient, fallbackText) {
  if (ingredient?.quantity && typeof ingredient.quantity.amount === 'number') {
    return {
      amount: ingredient.quantity.amount,
      unit: ingredient.quantity.unit || null
    };
  }
  const parsed = parseIngredientText(fallbackText);
  if (!parsed) {
    return null;
  }
  return {
    amount: parsed.quantity,
    unit: parsed.unit
  };
}

function applyBehavior(amount, behavior, scaleFactor) {
  const factor = typeof scaleFactor === 'number' && Number.isFinite(scaleFactor)
    ? scaleFactor
    : 1;
  switch (behavior) {
    case 'linear':
      return { amount: roundTwo(amount * factor) };
    case 'sublinear':
      return { amount: roundTwo(amount * Math.sqrt(Math.max(factor, 0))) };
    case 'fixed':
      return { amount: roundTwo(amount) };
    case 'stepped': {
      const unrounded = amount * factor;
      return {
        amount: Math.max(1, Math.round(unrounded)),
        roundedFrom: roundTwo(unrounded)
      };
    }
    default:
      return { amount: roundTwo(amount * factor) };
  }
}

function roundTwo(value) {
  return Math.round(value * 100) / 100;
}
