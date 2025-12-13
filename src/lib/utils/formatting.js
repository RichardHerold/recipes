const FRACTION_DENOMINATORS = [2, 3, 4, 6, 8, 10, 12, 16];

export function formatFraction(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  const whole = Math.floor(absValue);
  const remainder = absValue - whole;

  if (remainder < 0.01) {
    return `${sign}${whole || 0}`.trim();
  }

  let bestNumerator = 0;
  let bestDenominator = 1;
  let minError = Number.POSITIVE_INFINITY;

  for (const denominator of FRACTION_DENOMINATORS) {
    const numerator = Math.round(remainder * denominator);
    const approx = numerator / denominator;
    const error = Math.abs(approx - remainder);
    if (error < minError && numerator !== 0) {
      minError = error;
      bestNumerator = numerator;
      bestDenominator = denominator;
    }
  }

  const fraction = bestNumerator
    ? `${bestNumerator}/${bestDenominator}`
    : remainder.toFixed(2).replace(/\.00$/, '');

  const parts = [];
  if (sign) {
    parts.push(sign);
  }
  if (whole > 0) {
    parts.push(String(whole));
  }
  if (fraction) {
    parts.push(fraction);
  }
  return parts.join(' ').replace(/-\\s/, '-').trim();
}

export function formatQuantity(amount, unit) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '';
  }
  const value = formatFraction(amount);
  if (!unit) {
    return value;
  }
  const normalizedUnit = formatUnit(unit, amount);
  return `${value} ${normalizedUnit}`.trim();
}

export function formatUnit(unit, quantity) {
  if (!unit) return '';
  const normalized = unit.toLowerCase();
  if (quantity === 1 || normalized.includes('/')) {
    return normalized;
  }
  if (normalized.endsWith('s')) {
    return normalized;
  }
  return `${normalized}s`;
}

export function formatDuration(minutes) {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) {
    return null;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs && mins) {
    return `${hrs} hr ${mins} min`;
  }
  if (hrs) {
    return `${hrs} hr`;
  }
  return `${mins} min`;
}

export function capitalize(value = '') {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
