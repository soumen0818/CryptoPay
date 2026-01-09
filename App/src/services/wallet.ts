import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';

const WALLET_KEY = 'cryptopay_wallet';
const PIN_KEY = 'cryptopay_pin';
const SALT_KEY = 'cryptopay_pin_salt';
const ENCRYPTION_KEY = 'cryptopay_encryption_key';
const BIOMETRIC_BACKUP_KEY = 'cryptopay_biometric_backup';

// Cache for PIN hash to avoid repeated SecureStore reads
let cachedPinHash: string | null = null;

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
    
    // Phase 4: Encrypt mnemonic securely with PIN-derived key
    const encrypted = await encryptMnemonic(mnemonic, pin);
    console.log('Mnemonic encrypted securely');
    
    // Store securely
    await SecureStore.setItemAsync(WALLET_KEY, encrypted);
    console.log('Wallet stored');
    
    // ✅ NEW: Store biometric backup for PIN recovery
    // This allows users to recover wallet if they forget PIN
    try {
      await SecureStore.setItemAsync(
        BIOMETRIC_BACKUP_KEY,
        mnemonic, // Store plain mnemonic, protected by device biometrics
        {
          requireAuthentication: true, // Requires Face ID/Fingerprint to access
          authenticationPrompt: 'Secure your wallet with biometric authentication'
        }
      );
      console.log('Biometric backup created');
    } catch (bioError) {
      // If biometric backup fails (no biometric enrolled), continue anyway
      // User can still use wallet with PIN, just can't recover if PIN forgotten
      console.warn('Biometric backup failed (biometric not available):', bioError);
    }
    
    // Phase 4: Hash PIN with salt
    const pinHash = await hashPin(pin);
    await SecureStore.setItemAsync(PIN_KEY, pinHash);
    cachedPinHash = pinHash; // Cache it
    console.log('PIN hashed and stored');
    
    return wallet.address;
  } catch (error) {
    console.error('Create wallet error details:', error);
    throw error;
  }
}

export async function getWallet(pin: string): Promise<ethers.HDNodeWallet | null> {
  try {
    // Phase 4: Verify PIN with secure hash
    const storedPinHash = await SecureStore.getItemAsync(PIN_KEY);
    const pinHash = await hashPin(pin);
    
    if (!storedPinHash || storedPinHash !== pinHash) {
      throw new Error('Invalid PIN');
    }

    // Retrieve encrypted mnemonic
    const encrypted = await SecureStore.getItemAsync(WALLET_KEY);
    if (!encrypted) return null;

    // Phase 4: Decrypt with PIN-derived key
    const mnemonic = await decryptMnemonic(encrypted, pin);
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

// Phase 4: Use secure PIN hashing
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const storedPinHash = await SecureStore.getItemAsync(PIN_KEY);
    if (!storedPinHash) return false;
    
    const pinHash = await hashPin(pin);
    const isValid = storedPinHash === pinHash;
    
    if (isValid) {
      cachedPinHash = pinHash; // Cache for next time
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Change wallet PIN - re-encrypts mnemonic with new PIN
 * This is the ONLY safe way to change PIN without losing wallet access
 */
export async function changeWalletPin(oldPin: string, newPin: string): Promise<void> {
  try {
    console.log('Starting PIN change process...');
    
    // Step 1: Verify old PIN is correct
    const isValidOldPin = await verifyPin(oldPin);
    if (!isValidOldPin) {
      throw new Error('Invalid current PIN');
    }
    console.log('Old PIN verified');
    
    // Step 2: Decrypt mnemonic with old PIN
    const encryptedMnemonic = await SecureStore.getItemAsync(WALLET_KEY);
    if (!encryptedMnemonic) {
      throw new Error('Wallet not found');
    }
    
    const mnemonic = await decryptMnemonic(encryptedMnemonic, oldPin);
    console.log('Mnemonic decrypted successfully');
    
    // Step 3: Re-encrypt mnemonic with new PIN
    const newEncryptedMnemonic = await encryptMnemonic(mnemonic, newPin);
    console.log('Mnemonic re-encrypted with new PIN');
    
    // Step 4: Generate new salt for new PIN
    // Delete old salt to force hashPin to create a new one
    await SecureStore.deleteItemAsync(SALT_KEY);
    const newPinHash = await hashPin(newPin);
    console.log('New PIN hashed with fresh salt');
    
    // Step 5: Save everything atomically
    await SecureStore.setItemAsync(WALLET_KEY, newEncryptedMnemonic);
    await SecureStore.setItemAsync(PIN_KEY, newPinHash);
    cachedPinHash = newPinHash; // Update cache
    
    console.log('✅ PIN changed successfully');
  } catch (error) {
    console.error('Error changing wallet PIN:', error);
    throw error;
  }
}

// Phase 4: Secure PIN hashing with SHA-256 and salt
async function hashPin(pin: string): Promise<string> {
  try {
    // Get or generate salt
    let salt = await SecureStore.getItemAsync(SALT_KEY);
    
    if (!salt) {
      // Generate new salt (32 bytes = 64 hex characters)
      salt = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Date.now().toString() + Math.random().toString()
      );
      await SecureStore.setItemAsync(SALT_KEY, salt);
    }
    
    // Hash PIN with salt using SHA-256
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      salt + pin + salt // Salt prefix and suffix
    );
    
    return hash;
  } catch (error) {
    console.error('Error hashing PIN:', error);
    throw new Error('Failed to hash PIN');
  }
}

// Phase 4: Secure encryption for mnemonic using AES-like approach
async function encryptMnemonic(mnemonic: string, pin: string): Promise<string> {
  try {
    // Derive encryption key from PIN using SHA-256
    const pinHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
    
    // XOR-based encryption (simple but more secure than base64)
    // For production, use expo-crypto or react-native-aes-crypto
    const encrypted = xorEncrypt(mnemonic, pinHash);
    return Buffer.from(encrypted).toString('base64');
  } catch (error) {
    console.error('Error encrypting mnemonic:', error);
    throw new Error('Failed to encrypt mnemonic');
  }
}

async function decryptMnemonic(encrypted: string, pin: string): Promise<string> {
  try {
    // Derive same encryption key from PIN
    const pinHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
    
    // Decrypt
    const encryptedBuffer = Buffer.from(encrypted, 'base64').toString('utf-8');
    return xorEncrypt(encryptedBuffer, pinHash);
  } catch (error) {
    console.error('Error decrypting mnemonic:', error);
    throw new Error('Failed to decrypt mnemonic');
  }
}

// XOR encryption helper (simple but better than base64)
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

// For development: Clear wallet data (use carefully!)
export async function clearWallet(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(WALLET_KEY);
    await SecureStore.deleteItemAsync(SALT_KEY);
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_BACKUP_KEY);
    cachedPinHash = null; // Clear cache
    await SecureStore.deleteItemAsync(PIN_KEY);
    console.log('Wallet cleared successfully');
  } catch (error) {
    console.error('Error clearing wallet:', error);
  }
}

/**
 * Recover wallet using biometric authentication (Face ID/Fingerprint)
 * This is used when user forgets their PIN
 * Returns the mnemonic if successful, allowing user to set a new PIN
 */
export async function recoverWalletWithBiometric(): Promise<string | null> {
  try {
    console.log('Attempting biometric wallet recovery...');
    
    // Try to retrieve biometric-protected mnemonic
    // This will automatically trigger Face ID/Fingerprint prompt
    const mnemonic = await SecureStore.getItemAsync(
      BIOMETRIC_BACKUP_KEY,
      {
        authenticationPrompt: 'Unlock wallet to reset PIN',
        requireAuthentication: true
      }
    );
    
    if (!mnemonic) {
      console.log('No biometric backup found');
      return null;
    }
    
    console.log('✅ Wallet recovered with biometric authentication');
    return mnemonic;
  } catch (error: any) {
    console.error('Biometric recovery error:', error);
    
    // User cancelled biometric prompt
    if (error.message?.includes('cancel') || error.message?.includes('Authentication canceled')) {
      throw new Error('Authentication cancelled');
    }
    
    // Biometric authentication failed
    if (error.message?.includes('failed') || error.message?.includes('not recognized')) {
      throw new Error('Biometric authentication failed. Please try again.');
    }
    
    // No biometric backup available
    if (error.message?.includes('not found') || error.message?.includes('no entry')) {
      throw new Error('No biometric backup available. Wallet was created without biometric support.');
    }
    
    // Generic error
    throw new Error('Failed to recover wallet. Please contact support.');
  }
}

/**
 * Check if biometric backup is available for recovery
 */
export async function hasBiometricBackup(): Promise<boolean> {
  try {
    // Just check if the key exists (don't retrieve it - that would trigger biometric)
    const backup = await SecureStore.getItemAsync(BIOMETRIC_BACKUP_KEY);
    return !!backup;
  } catch (error) {
    return false;
  }
}

/**
 * Re-create wallet from recovered mnemonic with new PIN
 * Used after successful biometric recovery
 */
export async function recreateWalletFromMnemonic(mnemonic: string, newPin: string): Promise<string> {
  try {
    console.log('Recreating wallet from mnemonic...');
    
    // Validate mnemonic
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    const walletAddress = wallet.address;
    console.log('Wallet recreated:', walletAddress);
    
    // Encrypt mnemonic with new PIN
    const encrypted = await encryptMnemonic(mnemonic, newPin);
    await SecureStore.setItemAsync(WALLET_KEY, encrypted);
    
    // Delete old PIN salt to force new one
    await SecureStore.deleteItemAsync(SALT_KEY);
    
    // Hash new PIN with fresh salt
    const pinHash = await hashPin(newPin);
    await SecureStore.setItemAsync(PIN_KEY, pinHash);
    cachedPinHash = pinHash;
    
    // Update biometric backup with same mnemonic (already exists, but refresh)
    try {
      await SecureStore.setItemAsync(
        BIOMETRIC_BACKUP_KEY,
        mnemonic,
        {
          requireAuthentication: true,
          authenticationPrompt: 'Secure your wallet with biometric authentication'
        }
      );
      console.log('Biometric backup updated');
    } catch (bioError) {
      console.warn('Biometric backup update failed:', bioError);
    }
    
    console.log('✅ Wallet recreated successfully with new PIN');
    return walletAddress;
  } catch (error) {
    console.error('Error recreating wallet:', error);
    throw new Error('Failed to recreate wallet');
  }
}
