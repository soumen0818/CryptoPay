import { getTransactionStatus, waitForTransaction } from './blockchain';
import { updateTransactionStatus, getTransactions } from './storage';

/**
 * Background service to poll pending transactions and update their status
 * This runs independently and updates Supabase, which triggers real-time updates
 */

let isPolling = false;
let pollingInterval: NodeJS.Timeout | null = null;

/**
 * Check status of a single transaction and update if confirmed
 */
export async function checkTransactionStatus(txHash: string): Promise<void> {
  try {
    console.log(`🔍 Checking status for tx: ${txHash.slice(0, 10)}...`);
    
    const status = await getTransactionStatus(txHash);
    
    if (status === 'success' || status === 'failed') {
      console.log(`✅ Transaction ${txHash.slice(0, 10)}... status: ${status}`);
      await updateTransactionStatus(txHash, status);
    } else if (status === 'pending') {
      console.log(`⏳ Transaction ${txHash.slice(0, 10)}... still pending`);
    }
  } catch (error) {
    console.error('Error checking transaction status:', error);
  }
}

/**
 * Poll all pending transactions and update their status
 */
export async function pollPendingTransactions(): Promise<void> {
  try {
    const transactions = await getTransactions();
    const pendingTxs = transactions.filter(tx => tx.status === 'pending');
    
    if (pendingTxs.length === 0) {
      console.log('✨ No pending transactions to poll');
      return;
    }
    
    console.log(`🔄 Polling ${pendingTxs.length} pending transaction(s)...`);
    
    // Check each pending transaction
    for (const tx of pendingTxs) {
      await checkTransactionStatus(tx.tx_hash);
    }
  } catch (error) {
    console.error('Error polling pending transactions:', error);
  }
}

/**
 * Start automatic polling of pending transactions
 * Polls every 10 seconds by default
 */
export function startTransactionPolling(intervalMs: number = 10000): void {
  if (isPolling) {
    console.log('⚠️ Transaction polling already running');
    return;
  }
  
  console.log(`🚀 Starting transaction polling (every ${intervalMs / 1000}s)...`);
  isPolling = true;
  
  // Poll immediately
  pollPendingTransactions();
  
  // Then poll at intervals
  pollingInterval = setInterval(() => {
    pollPendingTransactions();
  }, intervalMs);
}

/**
 * Stop automatic polling
 */
export function stopTransactionPolling(): void {
  if (!isPolling) {
    return;
  }
  
  console.log('🛑 Stopping transaction polling...');
  isPolling = false;
  
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

/**
 * Wait for a specific transaction to be confirmed
 * Returns the final status
 */
export async function waitForTransactionConfirmation(
  txHash: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<'success' | 'failed' | 'timeout'> {
  console.log(`⏰ Waiting for transaction ${txHash.slice(0, 10)}... to confirm`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const status = await getTransactionStatus(txHash);
    
    if (status === 'success' || status === 'failed') {
      console.log(`✅ Transaction confirmed after ${attempt} attempt(s): ${status}`);
      await updateTransactionStatus(txHash, status);
      return status;
    }
    
    console.log(`⏳ Attempt ${attempt}/${maxAttempts}: still pending...`);
    
    // Wait before next check
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  console.log(`⏱️ Transaction confirmation timeout after ${maxAttempts} attempts`);
  return 'timeout';
}

/**
 * Smart transaction monitoring
 * Tries waitForTransaction first (fast), then falls back to polling
 */
export async function monitorTransaction(txHash: string): Promise<void> {
  try {
    console.log(`🎯 Monitoring transaction: ${txHash.slice(0, 10)}...`);
    
    // Try to wait for transaction (1 confirmation)
    const receipt = await waitForTransaction(txHash, 1);
    
    if (receipt) {
      const status = receipt.status === 1 ? 'success' : 'failed';
      console.log(`✅ Transaction confirmed via waitForTransaction: ${status}`);
      await updateTransactionStatus(txHash, status);
    } else {
      // Fallback to polling if waitForTransaction fails
      console.log('⚠️ waitForTransaction failed, falling back to polling...');
      await waitForTransactionConfirmation(txHash, 12, 5000); // Poll for 60s
    }
  } catch (error) {
    console.error('Error monitoring transaction:', error);
    // Fallback to polling
    await waitForTransactionConfirmation(txHash, 12, 5000);
  }
}
