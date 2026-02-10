import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendOTP, verifyOTP, getDevPhoneNumber, getDevOTP, getRemainingAttempts } from '../services/auth';
import { hasWallet } from '../services/wallet';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { AlertManager } from '../utils/alert';

const FONT_SIZES = TYPOGRAPHY.sizes;
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

interface PhoneVerificationScreenProps {
  navigation: any;
}

export const PhoneVerificationScreen: React.FC<PhoneVerificationScreenProps> = ({
  navigation,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadRemainingAttempts();
  }, []);

  // Auto-focus OTP input when switching to OTP verification stage
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'otp' && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const loadRemainingAttempts = async () => {
    const { remaining } = await getRemainingAttempts();
    setRemainingAttempts(remaining);
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      AlertManager.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);

    // Format phone number (add +91 if not present)
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    }

    // In dev mode, bypass OTP sending but move to OTP stage
    const isDevMode = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
    if (isDevMode) {
      setVerificationId('dev-bypass');
      setStep('otp');
      setTimer(30);
      setCanResend(false);
      setLoading(false);
      return;
    }

    const result = await sendOTP(formattedPhone);

    if (result.success && result.verificationId) {
      setVerificationId(result.verificationId);
      setStep('otp');
      setTimer(30);
      setCanResend(false);
      if (result.remainingAttempts !== undefined) {
        setRemainingAttempts(result.remainingAttempts);
      }
      // Don't show alert to avoid dismissing keyboard
      // The UI transition to OTP input stage is sufficient feedback
    } else {
      if (result.resetTime) {
        const hours = Math.ceil((result.resetTime.getTime() - Date.now()) / (1000 * 60 * 60));
        AlertManager.alert(
          'Rate Limit Exceeded',
          `You've reached the maximum OTP requests for today. Try again in ${hours} hour${hours > 1 ? 's' : ''}.`
        );
      } else {
        AlertManager.alert('Error', result.error || 'Failed to send OTP');
      }
      if (result.remainingAttempts !== undefined) {
        setRemainingAttempts(result.remainingAttempts);
      }
    }

    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      AlertManager.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);

    // In dev mode, bypass OTP verification
    const isDevMode = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
    const devOTP = process.env.EXPO_PUBLIC_DEV_OTP || '123456';
    
    let result;
    if (isDevMode && otp === devOTP) {
      // Dev mode bypass - accept dev OTP with any phone number
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone;
      }
      result = { success: true, phoneNumber: formattedPhone };
    } else {
      // Normal verification
      result = await verifyOTP(verificationId, otp);
    }

    if (result.success) {
      const verifiedPhone = result.phoneNumber || phoneNumber;
      
      // Save phone number
      await AsyncStorage.setItem('phone_number', verifiedPhone);
      
      // Check if user already has a wallet (returning user after sign out)
      const walletExists = await hasWallet();
      
      if (walletExists) {
        // Returning user - verify phone matches stored wallet
        const storedPhone = await AsyncStorage.getItem('phone_number');
        const walletAddress = await AsyncStorage.getItem('wallet_address');
        
        // In dev mode, skip strict verification
        const isDevMode = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
        
        if (!isDevMode) {
          if (storedPhone !== verifiedPhone) {
            // Phone number doesn't match - this might be a different account
            AlertManager.alert(
              'Account Mismatch',
              'This phone number is not associated with the wallet on this device. Please use the correct phone number or create a new wallet.',
              [
                {
                  text: 'Try Again',
                  onPress: () => {
                    setStep('phone');
                    setOtp('');
                    setPhoneNumber('');
                  },
                },
              ]
            );
            setLoading(false);
            return;
          }
          
          // Verify with database that phone and wallet match
          const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('wallet_address, phone_number')
            .eq('phone_number', verifiedPhone)
            .single();
          
          if (dbError || !userData) {
            console.log('No database record found, using local data');
          } else if (userData.wallet_address !== walletAddress) {
            AlertManager.alert(
              'Account Mismatch',
              'This phone number is associated with a different wallet. Please use the correct phone number.',
              [
                {
                  text: 'Try Again',
                  onPress: () => {
                    setStep('phone');
                    setOtp('');
                    setPhoneNumber('');
                  },
                },
              ]
            );
            setLoading(false);
            return;
          }
        } else {
          // Dev mode - skip strict verification
          console.log('Dev mode - skipping phone/wallet verification');
        }
        
        // Phone and wallet match - allow login
        AlertManager.alert('Welcome Back!', 'Phone verified successfully! ✓', [
          {
            text: 'Continue',
            onPress: () => navigation.replace('MainTabs'),
          },
        ]);
      } else {
        // New user - needs to create PIN and wallet
        AlertManager.alert('Success', 'Phone number verified! ✓', [
          {
            text: 'Continue',
            onPress: () => navigation.replace('CreatePIN', {
              phoneNumber: verifiedPhone,
            }),
          },
        ]);
      }
    } else {
      AlertManager.alert('Error', result.error || 'Invalid OTP');
      setOtp('');
    }

    setLoading(false);
  };

  const handleResendOTP = () => {
    setOtp('');
    setStep('phone');
    setCanResend(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>📱</Text>
              </View>
              <Text style={styles.title}>
                {step === 'phone' ? 'Enter Phone Number' : 'Verify OTP'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'phone'
                  ? "We'll send you a verification code"
                  : `Code sent to ${phoneNumber}`}
              </Text>
            </View>

            {/* Rate Limit Indicator */}
            {remainingAttempts <= 3 && step === 'phone' && (
              <View style={styles.rateLimitBanner}>
                <Text style={styles.rateLimitText}>
                  {remainingAttempts === 0
                    ? '⚠️ Daily OTP limit reached'
                    : `📊 ${remainingAttempts} OTP request${remainingAttempts > 1 ? 's' : ''} remaining today`}
                </Text>
              </View>
            )}

            {/* Development Hint */}
            <View style={styles.devHint}>
              <Text style={styles.devHintText}>
                💡 Hint: Use {getDevPhoneNumber()} with OTP {getDevOTP()} for testing
              </Text>
            </View>

        {/* Input Section */}
        {step === 'phone' ? (
          <View style={styles.inputSection}>
            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter 10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (loading || remainingAttempts === 0) && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading || remainingAttempts === 0}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.card} />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputSection}>
            {/* OTP Individual Boxes */}
            <TouchableOpacity 
              style={styles.otpContainer}
              onPress={() => otpInputRef.current?.focus()}
              activeOpacity={0.7}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    otp.length === index && styles.otpBoxFocused,
                    otp[index] && styles.otpBoxFilled,
                  ]}
                >
                  <Text style={[
                    styles.otpDigit,
                    otp[index] && styles.otpDigitFilled,
                  ]}>
                    {otp[index] || ''}
                  </Text>
                </View>
              ))}
            </TouchableOpacity>
            
            {/* Hidden TextInput for keyboard */}
            <TextInput
              ref={otpInputRef}
              style={styles.hiddenInput}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            
            {/* Tap to edit hint */}
            <TouchableOpacity 
              style={styles.otpTapArea}
              onPress={() => otpInputRef.current?.focus()}
              activeOpacity={1}
            >
              <Text style={styles.otpHint}>
                {otp.length === 0 ? 'Tap to enter OTP' : otp.length < 6 ? `${6 - otp.length} digits remaining` : '✓ OTP entered'}
              </Text>
            </TouchableOpacity>

            {/* Dev Mode Hint */}
            {process.env.EXPO_PUBLIC_DEV_MODE === 'true' && (
              <View style={styles.devHint}>
                <Text style={styles.devHintText}>
                  🔧 Dev Mode: Use OTP {process.env.EXPO_PUBLIC_DEV_OTP || '123456'}
                </Text>
              </View>
            )}

            {/* Timer and Resend */}
            <View style={styles.timerContainer}>
              {timer > 0 ? (
                <Text style={styles.timerText}>Resend OTP in {timer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResendOTP}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.card} />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            {/* Back button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep('phone');
                setOtp('');
              }}
            >
              <Text style={styles.backButtonText}>Change Phone Number</Text>
            </TouchableOpacity>
          </View>
        )}

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Text style={styles.securityIcon}>🔒</Text>
              <Text style={styles.securityText}>
                Your phone number is verified to ensure account security
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    paddingTop: isSmallDevice ? SPACING.lg : SPACING.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? SPACING.md : SPACING.xl,
  },
  logo: {
    width: isSmallDevice ? 60 : 80,
    height: isSmallDevice ? 60 : 80,
    borderRadius: isSmallDevice ? 30 : 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: isSmallDevice ? FONT_SIZES.xl : FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: isSmallDevice ? FONT_SIZES.sm : FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  rateLimitBanner: {
    backgroundColor: COLORS.warning + '20',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  rateLimitText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.warning,
    textAlign: 'center',
  },
  devHint: {
    backgroundColor: COLORS.info + '15',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  devHintText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.info,
    textAlign: 'center',
  },
  devBanner: {
    backgroundColor: '#FFC107',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  devText: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: '#000',
  },
  devSubtext: {
    fontSize: FONT_SIZES.sm,
    color: '#000',
    marginTop: SPACING.xs,
  },
  inputSection: {
    marginBottom: SPACING.xl,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  countryCode: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    paddingRight: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: isSmallDevice ? 0 : SPACING.xs,
  },
  otpBox: {
    width: isSmallDevice ? 44 : 48,
    height: isSmallDevice ? 52 : 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  otpBoxFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primaryLight + '10',
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  otpDigitFilled: {
    color: COLORS.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  otpTapArea: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  otpHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  timerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  resendText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.card,
  },
  backButton: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  securityText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
});
