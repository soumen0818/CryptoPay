import * as LocalAuthentication from 'expo-local-authentication';

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
 */
export async function getBiometricType(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  
  return 'Biometric';
}

/**
 * Authenticate user with biometric (for payment confirmation)
 */
export async function authenticateWithBiometric(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return true; // Skip if unavailable

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirm Payment',
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
  });

  return result.success;
}

/**
 * Authenticate user for unlocking wallet
 */
export async function authenticateForUnlock(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false; // Must use PIN if biometric unavailable

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock your wallet',
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
  });

  return result.success;
}

/**
 * Enable biometric authentication (setup flow)
 */
export async function enableBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric authentication',
      fallbackLabel: 'Use PIN instead',
      cancelLabel: 'Cancel',
    });

    return result.success;
  } catch (error) {
    console.error('Biometric enable error:', error);
    return false;
  }
}
