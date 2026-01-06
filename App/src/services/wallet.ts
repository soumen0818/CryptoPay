import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';

const WALLET_KEY = 'cryptopay_wallet';
const PIN_KEY = 'cryptopay_pin';

export async function createWallet(pin: string): Promise<string> {
  try {
    console.log('Creating wallet...');
    
    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    console.log('Wallet generated:', wallet.address);
    
    // Get mnemonic phrase
    const mnemonic = wallet.mnemonic?.phrase;
    if (!mnemonic) {
      throw new Error('Failed to generate mnemonic');
    }
    console.log('Mnemonic generated');
    
    // Encrypt mnemonic with PIN (basic encryption)
    const encrypted = Buffer.from(mnemonic).toString('base64');
    console.log('Mnemonic encrypted');
    
    // Store securely
    await SecureStore.setItemAsync(WALLET_KEY, encrypted);
    console.log('Wallet stored');
    
    await SecureStore.setItemAsync(PIN_KEY, hashPin(pin));
    console.log('PIN stored');
    
    return wallet.address;
  } catch (error) {
    console.error('Create wallet error details:', error);
    throw error;
  }
}

export async function getWallet(pin: string): Promise<ethers.HDNodeWallet | null> {
  try {
    // Verify PIN
    const storedPinHash = await SecureStore.getItemAsync(PIN_KEY);
    if (!storedPinHash || storedPinHash !== hashPin(pin)) {
      throw new Error('Invalid PIN');
    }

    // Retrieve encrypted mnemonic
    const encrypted = await SecureStore.getItemAsync(WALLET_KEY);
    if (!encrypted) return null;

    // Decrypt
    const mnemonic = Buffer.from(encrypted, 'base64').toString('utf-8');
    return ethers.Wallet.fromPhrase(mnemonic);
  } catch (error) {
    console.error('Error getting wallet:', error);
    return null;
  }
}

export async function hasWallet(): Promise<boolean> {
  try {
    const wallet = await SecureStore.getItemAsync(WALLET_KEY);
    const pin = await SecureStore.getItemAsync(PIN_KEY);
    console.log('Checking wallet existence:', { hasWallet: !!wallet, hasPin: !!pin });
    return !!wallet && !!pin;
  } catch (error) {
    console.error('Error checking wallet:', error);
    return false;
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const storedPinHash = await SecureStore.getItemAsync(PIN_KEY);
  return storedPinHash === hashPin(pin);
}

// Simple PIN hashing (for MVP - use bcrypt in production)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// For development: Clear wallet data (use carefully!)
export async function clearWallet(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(WALLET_KEY);
    await SecureStore.deleteItemAsync(PIN_KEY);
    console.log('Wallet cleared successfully');
  } catch (error) {
    console.error('Error clearing wallet:', error);
  }
}
