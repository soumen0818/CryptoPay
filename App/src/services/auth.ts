import { supabase } from './supabase';

// Development mode: Read from environment variables
const IS_DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
const DEV_PHONE_NUMBER = process.env.EXPO_PUBLIC_DEV_PHONE || '+911234567890';
const DEV_OTP = process.env.EXPO_PUBLIC_DEV_OTP || '123456';

/**
 * Send OTP to phone number using Supabase
 */
export async function sendOTP(phoneNumber: string): Promise<{
  success: boolean;
  verificationId?: string;
  error?: string;
}> {
  try {
    // Development mode bypass
    if (IS_DEV_MODE && phoneNumber === DEV_PHONE_NUMBER) {
      console.log('DEV MODE: Bypassing Supabase OTP');
      return {
        success: true,
        verificationId: 'dev-verification-id',
      };
    }

    // Production: Use Supabase phone auth
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      verificationId: phoneNumber, // Supabase uses phone number as identifier
    };
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send OTP',
    };
  }
}

/**
 * Verify OTP code using Supabase
 */
export async function verifyOTP(
  verificationId: string,
  otpCode: string
): Promise<{
  success: boolean;
  phoneNumber?: string;
  error?: string;
}> {
  try {
    // Development mode bypass
    if (IS_DEV_MODE && verificationId === 'dev-verification-id') {
      if (otpCode === DEV_OTP) {
        console.log('DEV MODE: OTP verified successfully');
        return {
          success: true,
          phoneNumber: DEV_PHONE_NUMBER,
        };
      } else {
        return {
          success: false,
          error: 'Invalid OTP. Use 123456 for dev mode.',
        };
      }
    }

    // Production: Verify with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      phone: verificationId,
      token: otpCode,
      type: 'sms',
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      phoneNumber: data.user?.phone || verificationId,
    };
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return {
      success: false,
      error: error.message || 'Invalid OTP code',
    };
  }
}

/**
 * Sign out from Supabase
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Check if dev mode is enabled
 */
export function isDevMode(): boolean {
  return IS_DEV_MODE;
}

/**
 * Get dev phone number
 */
export function getDevPhoneNumber(): string {
  return DEV_PHONE_NUMBER;
}

/**
 * Get dev OTP
 */
export function getDevOTP(): string {
  return DEV_OTP;
}
