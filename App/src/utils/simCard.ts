import DeviceInfo from 'react-native-device-info';

/**
 * Check if device has SIM card inserted
 */
export async function hasSIMCard(): Promise<boolean> {
  try {
    // Check if device has telephony features
    const hasSystemFeature = await DeviceInfo.hasSystemFeature('android.hardware.telephony');
    
    if (!hasSystemFeature) {
      return false;
    }

    // Check carrier name (empty if no SIM)
    const carrierName = await DeviceInfo.getCarrier();
    
    // If carrier is not empty/unknown, SIM is present
    return carrierName !== '' && carrierName !== 'unknown';
  } catch (error) {
    console.error('Error checking SIM card:', error);
    return false; // Assume no SIM on error
  }
}

/**
 * Get phone number from device (may not always be available)
 */
export async function getDevicePhoneNumber(): Promise<string | null> {
  try {
    const phoneNumber = await DeviceInfo.getPhoneNumber();
    return phoneNumber || null;
  } catch (error) {
    console.error('Error getting phone number:', error);
    return null;
  }
}

/**
 * Get carrier name
 */
export async function getCarrierName(): Promise<string> {
  try {
    return await DeviceInfo.getCarrier();
  } catch (error) {
    console.error('Error getting carrier:', error);
    return 'Unknown';
  }
}
