import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Merchant {
  id?: string;
  business_name: string;
  wallet_address: string;
  description?: string;
  category?: string;
  logo_url?: string;
  is_active?: boolean;
  total_transactions?: number;
  total_revenue?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MerchantQRCode {
  id?: string;
  merchant_id?: string;
  qr_name: string;
  amount?: string;
  is_active?: boolean;
  scan_count?: number;
  created_at?: string;
}

/**
 * Check if current user is a merchant
 */
export async function isMerchant(walletAddress: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking merchant status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking merchant status:', error);
    return false;
  }
}

/**
 * Register as a merchant
 */
export async function registerAsMerchant(merchant: Merchant): Promise<{
  success: boolean;
  merchantId?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .insert(merchant)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Cache merchant status locally
    await AsyncStorage.setItem('is_merchant', 'true');
    await AsyncStorage.setItem('merchant_id', data.id);

    return { success: true, merchantId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get merchant profile
 */
export async function getMerchantProfile(
  walletAddress: string
): Promise<Merchant | null> {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      console.error('Error getting merchant profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting merchant profile:', error);
    return null;
  }
}

/**
 * Update merchant profile
 */
export async function updateMerchantProfile(
  walletAddress: string,
  updates: Partial<Merchant>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('merchants')
      .update(updates)
      .eq('wallet_address', walletAddress);

    if (error) {
      console.error('Error updating merchant profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating merchant profile:', error);
    return false;
  }
}

/**
 * Create a merchant QR code
 */
export async function createMerchantQRCode(
  qrCode: MerchantQRCode
): Promise<{ success: boolean; qrCodeId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('merchant_qr_codes')
      .insert(qrCode)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, qrCodeId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all QR codes for a merchant
 */
export async function getMerchantQRCodes(
  merchantId: string
): Promise<MerchantQRCode[]> {
  try {
    const { data, error } = await supabase
      .from('merchant_qr_codes')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting merchant QR codes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting merchant QR codes:', error);
    return [];
  }
}

/**
 * Update QR code status
 */
export async function updateQRCodeStatus(
  qrCodeId: string,
  isActive: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('merchant_qr_codes')
      .update({ is_active: isActive })
      .eq('id', qrCodeId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error updating QR code status:', error);
    throw error;
  }
}

/**
 * Increment QR code scan count
 */
export async function incrementQRScanCount(qrCodeId: string): Promise<void> {
  try {
    // Get current scan count
    const { data } = await supabase
      .from('merchant_qr_codes')
      .select('scan_count')
      .eq('id', qrCodeId)
      .single();

    if (data) {
      await supabase
        .from('merchant_qr_codes')
        .update({ scan_count: (data.scan_count || 0) + 1 })
        .eq('id', qrCodeId);
    }
  } catch (error) {
    console.error('Error incrementing scan count:', error);
  }
}

/**
 * Get merchant analytics
 */
export async function getMerchantAnalytics(merchantId: string): Promise<{
  totalTransactions: number;
  totalRevenue: string;
  pendingTransactions: number;
}> {
  try {
    const merchant = await supabase
      .from('merchants')
      .select('wallet_address')
      .eq('id', merchantId)
      .single();

    if (!merchant.data) {
      return { totalTransactions: 0, totalRevenue: '0', pendingTransactions: 0 };
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, status')
      .eq('to_address', merchant.data.wallet_address);

    if (!transactions) {
      return { totalTransactions: 0, totalRevenue: '0', pendingTransactions: 0 };
    }

    const totalTransactions = transactions.length;
    const totalRevenue = transactions
      .filter((tx) => tx.status === 'success')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
      .toString();
    const pendingTransactions = transactions.filter(
      (tx) => tx.status === 'pending'
    ).length;

    return { totalTransactions, totalRevenue, pendingTransactions };
  } catch (error) {
    console.error('Error getting merchant analytics:', error);
    return { totalTransactions: 0, totalRevenue: '0', pendingTransactions: 0 };
  }
}
