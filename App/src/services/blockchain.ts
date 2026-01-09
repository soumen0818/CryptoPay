import { ethers } from 'ethers';

const RPC_URL = process.env.EXPO_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';
const TOKEN_ADDRESS = process.env.EXPO_PUBLIC_TOKEN_ADDRESS || '';
const RELAYER_URL = process.env.EXPO_PUBLIC_RELAYER_URL || 'http://10.64.216.86:3000'; // Path B - Advanced

// ERC-20 + Faucet + Meta-Transaction ABI
const TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function faucet() returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function canClaimFaucet(address user) view returns (bool)',
  'function timeUntilNextClaim(address user) view returns (uint256)',
  'function getNonce(address account) view returns (uint256)',
  'function executeMetaTransaction(address from, address to, uint256 amount, uint256 nonce, bytes signature) returns (bool)',
  'function executeMetaFaucet(address user, uint256 nonce, bytes signature) returns (bool)',
];

export const provider = new ethers.JsonRpcProvider(RPC_URL);

// Export getProvider for compatibility
export function getProvider() {
  return provider;
}

// Get contract with provider (read-only)
export function getTokenContract(providerOrWallet: ethers.Provider | ethers.HDNodeWallet | ethers.Wallet) {
  return new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, providerOrWallet);
}

export async function getBalance(address: string): Promise<string> {
  try {
    const contract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
}

/**
 * Path B - Advanced: Gasless Payment with Meta-Transactions
 * User signs a message, relayer submits it as a transaction and pays gas
 */
export async function sendPaymentGasless(
  wallet: ethers.HDNodeWallet | ethers.Wallet,
  toAddress: string,
  amount: string
): Promise<string> {
  try {
    const contract = getTokenContract(wallet);
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);
    
    // Get current nonce from contract
    const nonce = await contract.getNonce(wallet.address);
    
    // Construct message to sign (must match smart contract)
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'uint256', 'uint256', 'address'],
      [wallet.address, toAddress, amountWei, nonce, TOKEN_ADDRESS]
    );
    
    // Sign the message (NOT a transaction - no gas needed!)
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    
    console.log('📝 Signed meta-transaction:', {
      from: wallet.address,
      to: toAddress,
      amount: amount,
      nonce: nonce.toString(),
      signature: signature.substring(0, 20) + '...'
    });
    
    // Send to relayer service (relayer will pay gas)
    const response = await fetch(`${RELAYER_URL}/relay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: wallet.address,
        to: toAddress,
        amount: amount,
        nonce: nonce.toString(),
        signature: signature
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Relayer service error');
    }
    
    const result = await response.json();
    
    console.log('✅ Relayer accepted transaction:', result.txHash);
    
    return result.txHash;
    
  } catch (error: any) {
    console.error('Gasless payment error:', error);
    
    // Map errors to user-friendly messages
    if (error.message?.includes('Insufficient PAY balance')) {
      throw new Error('Insufficient balance');
    } else if (error.message?.includes('Invalid signature')) {
      throw new Error('Payment verification failed');
    } else if (error.message?.includes('Invalid nonce')) {
      throw new Error('Transaction already processed');
    } else if (error.message?.includes('Service temporarily unavailable')) {
      throw new Error('Service temporarily unavailable. Please try again.');
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
      throw new Error('Network error. Please check your connection.');
    } else {
      throw new Error('Unable to process payment. Please try again.');
    }
  }
}

/**
 * Transfer tokens to another address (alias for sendPaymentGasless)
 * Used for peer-to-peer transfers
 */
export async function transferTokens(
  wallet: ethers.HDNodeWallet | ethers.Wallet,
  toAddress: string,
  amount: string
): Promise<string> {
  return sendPaymentGasless(wallet, toAddress, amount);
}

/**
 * Legacy: Direct payment with user paying gas (Path A)
 * Kept for backward compatibility
 */
export async function sendPayment(
  wallet: ethers.HDNodeWallet | ethers.Wallet,
  toAddress: string,
  amount: string
): Promise<string> {
  // Path B: Use gasless meta-transactions
  return sendPaymentGasless(wallet, toAddress, amount);
}

export async function requestFaucet(wallet: ethers.HDNodeWallet | ethers.Wallet): Promise<string> {
  try {
    const contract = getTokenContract(wallet);
    const tx = await contract.faucet();
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Faucet error:', error);
    throw error;
  }
}

export async function getTransactionReceipt(txHash: string) {
  try {
    return await provider.getTransactionReceipt(txHash);
  } catch (error) {
    console.error('Error getting receipt:', error);
    return null;
  }
}

export async function waitForTransaction(
  txHash: string,
  confirmations: number = 1
): Promise<ethers.TransactionReceipt | null> {
  try {
    console.log(`Waiting for transaction ${txHash}...`);
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    return receipt;
  } catch (error) {
    console.error('Error waiting for transaction:', error);
    return null;
  }
}

export async function getTransactionStatus(txHash: string): Promise<'pending' | 'success' | 'failed' | 'unknown'> {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      // Check if transaction exists
      const tx = await provider.getTransaction(txHash);
      if (!tx) return 'unknown';
      return 'pending';
    }
    
    return receipt.status === 1 ? 'success' : 'failed';
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return 'unknown';
  }
}

export async function getMaticBalance(address: string): Promise<string> {
  try {
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting MATIC balance:', error);
    return '0';
  }
}

/**
 * Claim free PAY tokens from the faucet (100 PAY every 24 hours)
 * NOW GASLESS - User signs message, relayer pays gas
 */
export async function claimFromFaucet(
  wallet: ethers.HDNodeWallet | ethers.Wallet
): Promise<string> {
  try {
    const contract = getTokenContract(provider);

    // Check if can claim
    const canClaim = await contract.canClaimFaucet(wallet.address);
    if (!canClaim) {
      throw new Error('Please wait 24 hours between faucet claims');
    }

    // Get current nonce
    const nonce = await contract.getNonce(wallet.address);
    
    // Faucet amount (100 PAY)
    const FAUCET_AMOUNT = ethers.parseUnits('100', 18);
    
    // Construct message hash (must match smart contract)
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'address'],
      [wallet.address, FAUCET_AMOUNT, nonce, TOKEN_ADDRESS]
    );
    
    // Sign the message (NOT a transaction - no gas needed!)
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    
    console.log('📝 Signed gasless faucet claim:', {
      user: wallet.address,
      nonce: nonce.toString(),
      signature: signature.substring(0, 20) + '...'
    });
    
    // Send to relayer service (relayer will pay gas)
    const response = await fetch(`${RELAYER_URL}/faucet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: wallet.address,
        nonce: nonce.toString(),
        signature: signature
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Faucet service error');
    }
    
    const result = await response.json();
    
    console.log('✅ Gasless faucet accepted:', result.txHash);
    
    return result.txHash;
  } catch (error: any) {
    console.error('Faucet claim error:', error);
    
    // User-friendly error messages (NO MATIC references - it's gasless!)
    if (error.message?.includes('24 hours')) {
      throw new Error('Please wait 24 hours between claims');
    } else if (error.message?.includes('Invalid signature')) {
      throw new Error('Authentication failed. Please try again.');
    } else if (error.message?.includes('Invalid nonce')) {
      throw new Error('Request expired. Please try again.');
    } else if (error.message?.includes('Service temporarily unavailable')) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
      throw new Error('Network error. Please check your connection.');
    } else {
      throw new Error(error.message || 'Failed to claim from faucet');
    }
  }
}
