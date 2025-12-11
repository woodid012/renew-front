/**
 * Currency formatting utility
 * Formats currency values based on the selected unit preference
 */

const CURRENCY_UNITS = {
  MILLIONS: '$M',
  THOUSANDS: '$000',
  DOLLARS: '$'
};

/**
 * Format a currency value based on the selected unit
 * @param {number} value - The value to format (assumed to be in dollars)
 * @param {string} unit - The unit preference ('$M', '$000', or '$')
 * @param {object} options - Additional formatting options
 * @param {number} options.decimals - Number of decimal places (default: 1 for $M, 0 for others)
 * @param {boolean} options.showSign - Whether to show negative sign or parentheses (default: false)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, unit = CURRENCY_UNITS.MILLIONS, options = {}) {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }

  const { decimals, showSign = false } = options;
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  let formattedValue;
  let suffix = '';

  switch (unit) {
    case CURRENCY_UNITS.MILLIONS:
      formattedValue = (absValue / 1000000).toFixed(decimals !== undefined ? decimals : 1);
      suffix = 'M';
      break;
    case CURRENCY_UNITS.THOUSANDS:
      formattedValue = (absValue / 1000).toFixed(decimals !== undefined ? decimals : 0);
      suffix = 'k';
      break;
    case CURRENCY_UNITS.DOLLARS:
      formattedValue = absValue.toFixed(decimals !== undefined ? decimals : 0);
      suffix = '';
      break;
    default:
      formattedValue = (absValue / 1000000).toFixed(decimals !== undefined ? decimals : 1);
      suffix = 'M';
  }

  // Remove trailing zeros for whole numbers
  if (decimals === undefined) {
    formattedValue = parseFloat(formattedValue).toString();
  }

  // Add thousand separators (commas)
  const parts = formattedValue.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const sign = isNegative ? (showSign ? '-' : '(') : '';
  const closingParen = isNegative && !showSign ? ')' : '';

  return `${sign}$${parts.join('.')}${suffix}${closingParen}`;
}

/**
 * Format currency with context-aware decimals
 * For large values, uses fewer decimals
 */
export function formatCurrencySmart(value, unit = CURRENCY_UNITS.MILLIONS) {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }

  const absValue = Math.abs(value);
  let decimals = 1;

  switch (unit) {
    case CURRENCY_UNITS.MILLIONS:
      if (absValue >= 1000000000) decimals = 0; // Billions: no decimals
      else if (absValue >= 10000000) decimals = 1; // 10M+: 1 decimal
      else decimals = 2; // <10M: 2 decimals
      break;
    case CURRENCY_UNITS.THOUSANDS:
      decimals = 0;
      break;
    case CURRENCY_UNITS.DOLLARS:
      decimals = 0;
      break;
  }

  return formatCurrency(value, unit, { decimals });
}

/**
 * Format currency value that is already in millions
 * This is useful when the value is stored in millions (e.g., capex in $M)
 * @param {number} valueInMillions - The value already in millions
 * @param {string} unit - The unit preference ('$M', '$000', or '$')
 * @param {object} options - Additional formatting options
 * @returns {string} Formatted currency string
 */
export function formatCurrencyFromMillions(valueInMillions, unit = CURRENCY_UNITS.MILLIONS, options = {}) {
  if (valueInMillions === undefined || valueInMillions === null || isNaN(valueInMillions)) {
    return '-';
  }

  const { decimals } = options;
  const isNegative = valueInMillions < 0;
  const absValue = Math.abs(valueInMillions);

  let formattedValue;
  let suffix = '';

  switch (unit) {
    case CURRENCY_UNITS.MILLIONS:
      formattedValue = absValue.toFixed(decimals !== undefined ? decimals : 1);
      suffix = 'M';
      break;
    case CURRENCY_UNITS.THOUSANDS:
      formattedValue = (absValue * 1000).toFixed(decimals !== undefined ? decimals : 0);
      suffix = 'k';
      break;
    case CURRENCY_UNITS.DOLLARS:
      formattedValue = (absValue * 1000000).toFixed(decimals !== undefined ? decimals : 0);
      suffix = '';
      break;
    default:
      formattedValue = absValue.toFixed(decimals !== undefined ? decimals : 1);
      suffix = 'M';
  }

  // Remove trailing zeros for whole numbers
  if (decimals === undefined) {
    formattedValue = parseFloat(formattedValue).toString();
  }

  // Add thousand separators (commas)
  const parts = formattedValue.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const sign = isNegative ? '-' : '';
  return `${sign}$${parts.join('.')}${suffix}`;
}

/**
 * Format currency for display in tables/cards
 * Handles negative values with parentheses
 */
export function formatCurrencyDisplay(value, unit = CURRENCY_UNITS.MILLIONS, options = {}) {
  return formatCurrency(value, unit, { ...options, showSign: false });
}

export { CURRENCY_UNITS };

