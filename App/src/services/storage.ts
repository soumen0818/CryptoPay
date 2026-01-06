import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface Transaction {
  id?: string;
  user_id?: string;
  tx_hash: string;
  to_address: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  merchant_name?: string;
  created_at?: string;
}

// Hybrid storage: Local (AsyncStorage) + Cloud (Supabase)
// Works offline, syncs when online

export async function saveTransaction(tx: Transaction): Promise<void> {
  try {
    // Save locally first (offline-first approach)
    const existing = await AsyncStorage.getItem('transactions');
    const txs = existing ? JSON.parse(existing) : [];
    txs.unshift(tx);
    await AsyncStorage.setItem('transactions', JSON.stringify(txs));

    // Sync to Supabase (cloud backup)
    const { error } = await supabase.from('transactions').upsert({
      tx_hash: tx.tx_hash,
      to_address: tx.to_address,
      amount: tx.amount,
      status: tx.status,
      merchant_name: tx.merchant_name,
    });

    if (error) console.log('Supabase sync error (non-critical):', error);
  } catch (error) {
    console.error('Error saving transaction:', error);
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  try {
    // Try to get from Supabase first (latest data)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && !error) {
      // Update local cache
      await AsyncStorage.setItem('transactions', JSON.stringify(data));
      return data;
    }

    // Fallback to local storage (offline mode)
    const local = await AsyncStorage.getItem('transactions');
    return local ? JSON.parse(local) : [];
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

export async function updateTransactionStatus(
  txHash: string,
  status: 'success' | 'failed'
): Promise<void> {
  try {
    // Update locally
    const existing = await AsyncStorage.getItem('transactions');
    if (existing) {
      const txs = JSON.parse(existing);
      const updated = txs.map((tx: Transaction) =>
        tx.tx_hash === txHash ? { ...tx, status } : tx
      );
      await AsyncStorage.setItem('transactions', JSON.stringify(updated));
    }

    // Update in Supabase (triggers Realtime!)
    await supabase.from('transactions').update({ status }).eq('tx_hash', txHash);
  } catch (error) {
    console.error('Error updating transaction status:', error);
  }
}
