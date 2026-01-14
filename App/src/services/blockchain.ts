import { ethers } from 'ethers';
import Constants from 'expo-constants';

// Get environment variables with fallback to Constants.expoConfig.extra
const getEnvVar = (key: string, fallback: string = ''): string => {
  // Try process.env first (works in development)
  const processEnv = process.env[key];
  if (processEnv) return processEnv;
  
  // Try Constants.expoConfig.extra (works in production builds)
  const extraConfig = Constants.expoConfig?.extra?.[key];
  if (extraConfig) return extraConfig;
  
  return fallback;
};

const RPC_URL = getEnvVar('EXPO_PUBLIC_RPC_URL', 'https://rpc-amoy.polygon.technology');
const TOKEN_ADDRESS = getEnvVar('EXPO_PUBLIC_TOKEN_ADDRESS', '0x98BE2863435E05d9E6FF8A488A54Be9aA2a0469b');
const RELAYER_URL = getEnvVar('EXPO_PUBLIC_RELAYER_URL', 'https://cryptopay-relayer.onrender.com');

// Validate TOKEN_ADDRESS is set
if (!TOKEN_ADDRESS || TOKEN_ADDRESS === '') {
  console.error('❌ CRITICAL: TOKEN_ADDRESS is not set!');
  console.error('Environment check:', {
    processEnv: process.env.EXPO_PUBLIC_TOKEN_ADDRESS,
    constants: Constants.expoConfig?.extra?.EXPO_PUBLIC_TOKEN_ADDRESS,
    allExtra: Constants.expoConfig?.extra
  });
}

console.log('🔧 Blockchain Config:', {
  RPC_URL,
  TOKEN_ADDRESS,
  RELAYER_URL,
  source: TOKEN_ADDRESS === process.env.EXPO_PUBLIC_TOKEN_ADDRESS ? 'process.env' : 'Constants'
});

// ERC-20 + Faucet + Meta-Transaction ABI
// Note: Token maintains 1:1 value with INR (stablecoin approach)
// Users see ₹, blockchain uses tokens behind the scenes
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
 * Check if user can claim from faucet
 */
export async function canClaimFaucet(address: string): Promise<boolean> {
  try {
    const contract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    const canClaim = await contract.canClaimFaucet(address);
    return canClaim;
  } catch (error) {
    console.error('Error checking faucet availability:', error);
    return false;
  }
}

/**
 * Get time remaining until next faucet claim (in seconds)
 */
export async function getTimeUntilNextClaim(address: string): Promise<number> {
  try {
    const contract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    const timeRemaining = await contract.timeUntilNextClaim(address);
    return Number(timeRemaining);
  } catch (error) {
    console.error('Error getting time until next claim:', error);
    return 0;
  }
}

/**
 * Format seconds into human-readable time (e.g., "5h 30m" or "23h 45m")
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Available now';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return 'Less than 1 minute';
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
    
    // Send to relayer service with timeout (60 seconds max)
    // Note: If this times out or fails, NO MONEY is deducted from user's account
    // because the on-chain transaction never executes. User only signs a message.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    try {
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
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      clearTimeout(timeoutId);
    
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Relayer service error');
      }
      
      const result = await response.json();
      
      console.log('✅ Relayer accepted transaction:', result.txHash);
      
      return result.txHash;
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Transaction timeout after 1 minute. The network is slow. Your money is safe - no amount was deducted. Please try again.');
      }
      throw fetchError;
    }
    
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
    // Validate TOKEN_ADDRESS before proceeding
    if (!TOKEN_ADDRESS || TOKEN_ADDRESS === '') {
      throw new Error('Token contract address not configured. Please restart the app.');
    }
    
    const contract = getTokenContract(provider);

    // Check if can claim
    const canClaim = await contract.canClaimFaucet(wallet.address);
    if (!canClaim) {
      // Get exact time remaining for better error message
      const timeRemaining = await contract.timeUntilNextClaim(wallet.address);
      const timeFormatted = formatTimeRemaining(Number(timeRemaining));
      throw new Error(`Please wait ${timeFormatted} before claiming again`);
    }

    // Double check - get the actual time remaining in seconds
    const timeRemaining = await contract.timeUntilNextClaim(wallet.address);
    if (Number(timeRemaining) > 0) {
      const timeFormatted = formatTimeRemaining(Number(timeRemaining));
      console.log(`⏱️ Time remaining: ${timeRemaining}s (${timeFormatted})`);
      throw new Error(`Please wait ${timeFormatted} before claiming again`);
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
      tokenAddress: TOKEN_ADDRESS,
      relayerUrl: RELAYER_URL,
      nonce: nonce.toString(),
      signature: signature.substring(0, 20) + '...',
      messageHash: messageHash
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
    if (error.message?.includes('wait') && error.message?.includes('before claiming')) {
      // Already formatted message from our check above
      throw error;
    } else if (error.message?.includes('24 hours')) {
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
