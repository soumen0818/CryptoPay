import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface Transaction {
  id?: string;
  user_id?: string;
  tx_hash: string;
  to_address: string;
  from_address?: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  // Phase 2: Invisible Rail - Two-tier status system
  internal_status?: 'processing' | 'submitted' | 'confirmed' | 'failed';
  user_visible_status?: 'success' | 'failed';
  merchant_name?: string;
  created_at?: string;
  submitted_at?: string; // When user clicked "Pay"
  confirmed_at?: string; // When blockchain confirmed
  failure_reason?: string; // User-friendly error message
}

// Hybrid storage: Local (AsyncStorage) + Cloud (Supabase)
// Works offline, syncs when online

// Helper function to get or create user in Supabase
async function getOrCreateUser(walletAddress: string, phoneNumber?: string, displayName?: string): Promise<string | null> {
  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (existingUser && !fetchError) {
      return existingUser.id;
    }

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress,
        phone_number: phoneNumber || null,
        display_name: displayName || null,
      })
      .select('id')
      .single();

    if (newUser && !insertError) {
      console.log('✅ User created in Supabase:', newUser.id);
      return newUser.id;
    }

    console.log('Error creating user:', insertError?.message);
    return null;
  } catch (error) {
    console.log('Error in getOrCreateUser:', error);
    return null;
  }
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  try {
    // Save locally first (offline-first approach)
    const existing = await AsyncStorage.getItem('transactions');
    const txs = existing ? JSON.parse(existing) : [];
    
    // Add timestamp if not present
    const txWithTime = {
      ...tx,
      created_at: tx.created_at || new Date().toISOString(),
      id: tx.id || tx.tx_hash,
    };
    
    txs.unshift(txWithTime);
    await AsyncStorage.setItem('transactions', JSON.stringify(txs));
    
    console.log('✅ Transaction saved locally:', txWithTime.tx_hash);

    // Sync to Supabase (cloud backup) - non-blocking
    try {
      // Get user_id from wallet address
      let userId: string | null = null;
      
      if (tx.from_address) {
        // Get phone number and display name from AsyncStorage if available
        const phoneNumber = await AsyncStorage.getItem('user_phone');
        const displayName = await AsyncStorage.getItem('user_name');
        
        userId = await getOrCreateUser(tx.from_address, phoneNumber || undefined, displayName || undefined);
      }

      const { data, error } = await supabase.from('transactions').insert({
        user_id: userId,
        tx_hash: tx.tx_hash,
        to_address: tx.to_address,
        from_address: tx.from_address || '',
        amount: parseFloat(tx.amount),
        status: tx.status,
        internal_status: tx.internal_status || 'processing',
        user_visible_status: tx.user_visible_status || 'success',
        merchant_name: tx.merchant_name,
        created_at: tx.created_at,
        submitted_at: tx.submitted_at || tx.created_at || new Date().toISOString(),
        confirmed_at: tx.confirmed_at,
        failure_reason: tx.failure_reason,
      }).select();

      if (error) {
        console.error('❌ Supabase sync error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Transaction synced to Supabase:', data);
      }
    } catch (syncError) {
      console.log('Supabase sync skipped:', syncError);
    }
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  try {
    // Get from local storage first (always available)
    const local = await AsyncStorage.getItem('transactions');
    const localTxs = local ? JSON.parse(local) : [];
    
    console.log(`📦 Loaded ${localTxs.length} transactions from local storage`);

    // Try to sync with Supabase in background (non-blocking)
    try {
      const walletAddress = await AsyncStorage.getItem('wallet_address');
      
      if (!walletAddress) {
        console.log('No wallet address found, using local data only');
        return localTxs;
      }

      // Fetch transactions from Supabase (both sent and received)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`from_address.eq.${walletAddress},to_address.eq.${walletAddress}`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data && !error && data.length > 0) {
        console.log(`☁️ Loaded ${data.length} transactions from Supabase`);
        
        // Merge local and cloud data (remove duplicates by tx_hash)
        const mergedTxs = [...data];
        const txHashes = new Set(data.map(tx => tx.tx_hash));
        
        localTxs.forEach((localTx: Transaction) => {
          if (!txHashes.has(localTx.tx_hash)) {
            mergedTxs.push(localTx);
          }
        });
        
        // Sort by created_at
        mergedTxs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        
        // Update local cache with merged data
        await AsyncStorage.setItem('transactions', JSON.stringify(mergedTxs));
        return mergedTxs;
      }
    } catch (supabaseError) {
      console.log('Supabase fetch skipped (using local data):', supabaseError);
    }

    // Return local data
    return localTxs;
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

export async function updateTransactionStatus(
  txHash: string,
  status: 'pending' | 'success' | 'failed',
  internalStatus?: 'processing' | 'submitted' | 'confirmed' | 'failed',
  confirmedAt?: string,
  failureReason?: string
): Promise<void> {
  try {
    // Update locally
    const existing = await AsyncStorage.getItem('transactions');
    if (existing) {
      const txs = JSON.parse(existing);
      const updated = txs.map((tx: Transaction) =>
        tx.tx_hash === txHash
          ? {
              ...tx,
              status,
              internal_status: internalStatus || status,
              user_visible_status: status,
              confirmed_at: confirmedAt || (status === 'success' ? new Date().toISOString() : tx.confirmed_at),
              failure_reason: failureReason,
            }
          : tx
      );
      await AsyncStorage.setItem('transactions', JSON.stringify(updated));
    }

    // Update in Supabase (triggers Realtime!)
    await supabase
      .from('transactions')
      .update({
        status,
        internal_status: internalStatus || status,
        user_visible_status: status,
        confirmed_at: confirmedAt || (status === 'success' ? new Date().toISOString() : null),
        failure_reason: failureReason,
      })
      .eq('tx_hash', txHash);
  } catch (error) {
    console.error('Error updating transaction status:', error);
  }
}
