import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

/**
 * C-Pay ID System - User-friendly identifier instead of wallet addresses
 * Format: 10digitPhone@cpay+last4digits (no country code)
 * Example: 9876543210@cpay1a2b
 * 
 * This is ONLY for UI display. Blockchain operations still use actual wallet addresses.
 */

/**
 * Generate C-Pay ID from phone number and wallet address
 * @param phoneNumber - User's phone number (e.g., "+919876543210")
 * @param walletAddress - Blockchain wallet address (e.g., "0xAbC...1234")
 * @returns C-Pay ID (e.g., "9876543210@cpay1234") - Only 10 digits, no country code
 */
export function generateCPayId(phoneNumber: string, walletAddress: string): string {
  // Get last 4 characters of wallet address (after removing 0x prefix if present)
  const cleanAddress = walletAddress.toLowerCase().replace('0x', '');
  const last4 = cleanAddress.slice(-4);
  
  // Extract only last 10 digits from phone number (removes country code like +91)
  const phone10Digit = phoneNumber.replace(/\D/g, '').slice(-10);
  
  // Format: 10digitPhone@cpay+last4digits
  return `${phone10Digit}@cpay${last4}`;
}

/**
 * Get C-Pay ID for current user from database only
 * @returns C-Pay ID or null if not available in database
 */
export async function getCurrentUserCPayId(): Promise<string | null> {
  try {
    const walletAddress = await AsyncStorage.getItem('wallet_address');
    
    if (!walletAddress) {
      return null;
    }
    
    // Fetch from database only - no fallback generation
    const { data, error } = await supabase
      .from('users')
      .select('cpay_id')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Return stored cpay_id from database or null
    return data.cpay_id || null;
  } catch (error) {
    console.error('Error getting current user C-Pay ID:', error);
    return null;
  }
}

/**
 * Get C-Pay ID for current merchant from database only
 * @returns C-Pay ID or null if not available in database
 */
export async function getCurrentMerchantCPayId(): Promise<string | null> {
  try {
    const walletAddress = await AsyncStorage.getItem('wallet_address');
    
    if (!walletAddress) {
      return null;
    }
    
    // Fetch from merchants table
    const { data, error } = await supabase
      .from('merchants')
      .select('cpay_id')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Return stored cpay_id from database or null
    return data.cpay_id || null;
  } catch (error) {
    console.error('Error getting merchant C-Pay ID:', error);
    return null;
  }
}

/**
 * Get C-Pay ID for any wallet address by fetching from database only
 * @param walletAddress - Wallet address to look up
 * @returns C-Pay ID or null if not found in database
 */
export async function getCPayIdByWallet(walletAddress: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('cpay_id')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Return stored cpay_id from database or null (no fallback generation)
    return data.cpay_id || null;
  } catch (error) {
    console.error('Error fetching C-Pay ID:', error);
    return null;
  }
}

/**
 * Get display identifier for wallet address
 * Priority: C-Pay ID > Display Name > Truncated Address
 * @param walletAddress - Wallet address
 * @param displayName - Optional display name
 * @returns User-friendly identifier
 */
export async function getDisplayIdentifier(
  walletAddress: string,
  displayName?: string | null
): Promise<string> {
  // Try to get C-Pay ID first
  const cpayId = await getCPayIdByWallet(walletAddress);
  if (cpayId) {
    return cpayId;
  }
  
  // Fallback to display name if available
  if (displayName) {
    return displayName;
  }
  
  // Final fallback: truncated wallet address
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

/**
 * Format C-Pay ID for display (optional - adds styling/formatting)
 * @param cpayId - C-Pay ID to format
 * @returns Formatted string
 */
export function formatCPayIdForDisplay(cpayId: string): string {
  return cpayId; // Currently returns as-is, but can be enhanced with formatting
}

/**
 * Validate if a string is a valid C-Pay ID format
 * @param id - String to validate
 * @returns true if valid C-Pay ID format
 */
export function isValidCPayId(id: string): boolean {
  // Format: 10digitPhone@cpay+4chars (no country code, exactly 10 digits)
  const pattern = /^\d{10}@cpay[a-f0-9]{4}$/i;
  return pattern.test(id);
}

/**
 * Extract wallet address last 4 digits from C-Pay ID
 * @param cpayId - C-Pay ID
 * @returns Last 4 digits or null
 */
export function extractLast4FromCPayId(cpayId: string): string | null {
  const match = cpayId.match(/@cpay([a-f0-9]{4})$/i);
  return match ? match[1] : null;
}

/**
 * Extract phone number from C-Pay ID
 * @param cpayId - C-Pay ID
 * @returns Phone number (10 digits) or null
 */
export function extractPhoneFromCPayId(cpayId: string): string | null {
  const match = cpayId.match(/^(\d{10})@cpay/);
  return match ? match[1] : null;
}

/**
 * Get wallet address from C-Pay ID by searching in both users and merchants tables
 * @param cpayId - C-Pay ID to look up
 * @returns Wallet address or null if not found
 */
export async function getWalletAddressFromCPayId(cpayId: string): Promise<string | null> {
  try {
    // First try users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('cpay_id', cpayId)
      .single();
    
    if (!userError && userData?.wallet_address) {
      return userData.wallet_address;
    }
    
    // If not found in users, try merchants table
    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select('wallet_address')
      .eq('cpay_id', cpayId)
      .single();
    
    if (!merchantError && merchantData?.wallet_address) {
      return merchantData.wallet_address;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting wallet address from C-Pay ID:', error);
    return null;
  }
}
