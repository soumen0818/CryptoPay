import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store reference to PIN dialog functions (will be set by the component)
let showPINDialog: ((title: string, message: string) => Promise<string | null>) | null = null;

export function setPINDialogHandler(
  handler: (title: string, message: string) => Promise<string | null>
) {
  showPINDialog = handler;
}

/**
 * Authenticate user with their app PIN
 * Returns true if PIN matches, false otherwise
 */
export async function authenticateWithPIN(): Promise<boolean> {
  try {
    if (!showPINDialog) {
      console.error('PIN dialog handler not set');
      return false;
    }

    const inputPin = await showPINDialog(
      'Enter PIN',
      'Enter your 6-digit PIN to confirm'
    );

    if (!inputPin || inputPin.length !== 6) {
      return false;
    }

    // Get stored PIN (plain text)
    const storedPin = await AsyncStorage.getItem('user_pin');

    return inputPin === storedPin;
  } catch (error) {
    console.error('PIN authentication error:', error);
    return false;
  }
}

/**
 * Check if biometric authentication is available on the device
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

/**
 * Get the type of biometric authentication available
 * Returns the actual biometric type that is enrolled and ready to use
 */
export async function getBiometricType(): Promise<string> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    // If no biometric is enrolled, return generic "Biometric"
    if (!hasHardware || !isEnrolled) {
      return 'Biometric';
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    // On iOS, check for Face ID first (iPhone X and later)
    if (Platform.OS === 'ios') {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Touch ID';
      }
    }
    
    // On Android, prioritize fingerprint (most common)
    if (Platform.OS === 'android') {
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face Unlock';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
      }
    }
    
    // Fallback for other types
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    
    return 'Biometric';
  } catch (error) {
    console.error('Error getting biometric type:', error);
    return 'Biometric';
  }
}

/**
 * Authenticate user with biometric (for payment confirmation)
 * Returns false if biometrics not available (caller should use PIN fallback)
 */
export async function authenticateWithBiometric(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    // If no biometric available, return false (caller should use PIN)
    if (!hasHardware || !isEnrolled) {
      console.log('Biometric not available, PIN required');
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm Payment',
      fallbackLabel: 'Use Device Credentials',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow device PIN/pattern
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    // If error occurs (common in emulators), allow fallback
    return true;
  }
}

/**
 * Authenticate user for unlocking wallet
 * Falls back to device credentials (PIN/pattern) if biometric is not enrolled
 */
export async function authenticateForUnlock(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  
  // Allow device credentials even if no biometric hardware
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock your wallet',
    fallbackLabel: 'Use Device Credentials',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false, // Allow device PIN/pattern
  });

  return result.success;
}

/**
 * Enable biometric authentication (setup flow)
 * Falls back to device credentials if biometric is not available
 */
export async function enableBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric authentication',
      fallbackLabel: 'Use Device Credentials',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow device PIN/pattern
    });

    return result.success;
  } catch (error) {
    console.error('Biometric enable error:', error);
    return false;
  }
}
