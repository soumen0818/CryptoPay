import { ethers } from 'ethers';

const RPC_URL = process.env.EXPO_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';
const TOKEN_ADDRESS = process.env.EXPO_PUBLIC_TOKEN_ADDRESS || '';

// ERC-20 + Faucet ABI
const TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function faucet() returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function canClaimFaucet(address user) view returns (bool)',
  'function timeUntilNextClaim(address user) view returns (uint256)',
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

export async function sendPayment(
  wallet: ethers.HDNodeWallet | ethers.Wallet,
  toAddress: string,
  amount: string
): Promise<string> {
  try {
    const contract = getTokenContract(wallet);
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);
    
    const tx = await contract.transfer(toAddress, amountWei);
    return tx.hash;
  } catch (error) {
    console.error('Payment error:', error);
    throw error;
  }
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
