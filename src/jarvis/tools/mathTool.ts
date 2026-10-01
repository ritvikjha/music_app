/**
 * src/jarvis/tools/mathTool.ts
 *
 * Safe math and percentage calculator for Jarvis.
 * Handles "what's 15% of 3400", "50 divided by 4", "12 times 8", etc.
 */

export function calculateExpression(input: string): string {
  let expr = input.toLowerCase().trim();

  // 1. Percentage check: "X% of Y" or "X percent of Y"
  const pctMatch = expr.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:of)\s*(\d+(?:\.\d+)?)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    const result = (pct / 100) * total;
    return `${pct}% of ${total} is ${cleanNumber(result)}`;
  }

  // 2. Word replacements
  expr = expr
    .replace(/\bplus\b|\bjama\b/g, '+')
    .replace(/\bminus\b|\bkam\b/g, '-')
    .replace(/\btimes\b|\bmultiplied by\b|\bx\b|\binto\b|\bguna\b/g, '*')
    .replace(/\bdivided by\b|\bdivided\b|\bover\b|\bbata\b/g, '/')
    .replace(/\bto the power of\b|\bpower\b/g, '**');

  // Strip non-math characters (strictly keep numbers, parentheses, decimal point, operators)
  const sanitized = expr.replace(/[^0-9+\-*/().^]/g, '');

  if (!sanitized) {
    return "I couldn't identify the math expression to calculate.";
  }

  try {
    // Safe evaluation using Function with only arithmetic tokens
    // We strictly validated that sanitized only has digits and safe math operators
    if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
      return "I can only calculate basic arithmetic and percentages.";
    }
    const val = Function(`'use strict'; return (${sanitized})`)();
    if (typeof val !== 'number' || !isFinite(val)) {
      return "That calculation produces an invalid result.";
    }
    return `${cleanNumber(val)}`;
  } catch {
    return "I couldn't calculate that expression.";
  }
}

function cleanNumber(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2).replace(/\.?0+$/, '');
}
