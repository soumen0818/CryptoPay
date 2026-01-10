/**
 * Currency conversion utilities
 * PAY token to INR conversion
 */

// Current conversion rate
// 1 PAY = 0.85 INR (100 PAY = 85 INR)
// 1 INR = 1.176 PAY (10 INR = 11.76 PAY)
const PAY_TO_INR_RATE = 0.85; // 1 PAY = 0.85 INR
const INR_TO_PAY_RATE = 1.176; // 1 INR = 1.176 PAY

/**
 * Convert PAY tokens to INR
 */
export function convertPAYtoINR(payAmount: string | number): number {
  const amount = typeof payAmount === 'string' ? parseFloat(payAmount) : payAmount;
  return amount * PAY_TO_INR_RATE;
}

/**
 * Convert INR to PAY tokens
 */
export function convertINRtoPAY(inrAmount: string | number): number {
  const amount = typeof inrAmount === 'string' ? parseFloat(inrAmount) : inrAmount;
  return amount * INR_TO_PAY_RATE;
}

/**
 * Format PAY amount with INR equivalent
 */
export function formatPayWithINR(payAmount: string | number): string {
  const amount = typeof payAmount === 'string' ? parseFloat(payAmount) : payAmount;
  const inrAmount = convertPAYtoINR(amount);
  return `${amount.toFixed(2)} PAY (₹${inrAmount.toFixed(2)})`;
}

/**
 * Format INR currency
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format PAY currency
 */
export function formatPAY(amount: number): string {
  return `${amount.toFixed(2)} PAY`;
}

/**
 * Get the conversion rate display string
 */
export function getConversionRateDisplay(): string {
  return `1 PAY = ₹${PAY_TO_INR_RATE}`;
}
