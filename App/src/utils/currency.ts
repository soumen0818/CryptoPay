/**
 * Currency conversion utilities
 * Stablecoin to INR conversion (1:1 ratio)
 * 
 * Behind the scenes, the app uses blockchain tokens (stablecoins)
 * that maintain 1:1 value with INR. Users only see INR amounts.
 */

// Stablecoin conversion rate: 1 token = 1 INR
// This creates a seamless experience where users only think in INR
const STABLECOIN_TO_INR_RATE = 1.0; // 1 token = ₹1
const INR_TO_STABLECOIN_RATE = 1.0; // ₹1 = 1 token

/**
 * Convert blockchain tokens to INR (1:1 ratio)
 * Users see INR, blockchain uses tokens behind the scenes
 */
export function convertTokenToINR(tokenAmount: string | number): number {
  const amount = typeof tokenAmount === 'string' ? parseFloat(tokenAmount) : tokenAmount;
  return amount * STABLECOIN_TO_INR_RATE;
}

/**
 * Convert INR to blockchain tokens (1:1 ratio)
 * When user enters ₹100, system sends 100 tokens
 */
export function convertINRtoToken(inrAmount: string | number): number {
  const amount = typeof inrAmount === 'string' ? parseFloat(inrAmount) : inrAmount;
  return amount * INR_TO_STABLECOIN_RATE;
}

// Legacy function names for backward compatibility
export const convertPAYtoINR = convertTokenToINR;
export const convertINRtoPAY = convertINRtoToken;

/**
 * Format amount as INR only (never show token amounts to users)
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Legacy function - now just shows INR (tokens hidden from users)
 * Kept for backward compatibility with merchant screens
 */
export function formatPAY(amount: number): string {
  return formatINR(amount);
}

/**
 * Legacy function - now just shows INR (tokens hidden from users)
 */
export function formatPayWithINR(tokenAmount: string | number): string {
  const amount = typeof tokenAmount === 'string' ? parseFloat(tokenAmount) : tokenAmount;
  const inrAmount = convertTokenToINR(amount);
  return formatINR(inrAmount);
}
