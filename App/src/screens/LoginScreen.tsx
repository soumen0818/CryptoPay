import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PINInput } from '../components/PINInput';
import { hasWallet, verifyPin } from '../services/wallet';
import { authenticateForUnlock, isBiometricAvailable, getBiometricType } from '../utils/biometric';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');

  useEffect(() => {
    checkAndTriggerBiometric();
  }, []);

  const checkAndTriggerBiometric = async () => {
    const biometricEnabled = await AsyncStorage.getItem('biometric_enabled');
    const available = await isBiometricAvailable();
    
    if (biometricEnabled === 'true' && available) {
      setShowBiometric(true);
      const type = await getBiometricType();
      setBiometricType(type);
      // Auto-trigger biometric on screen load
      setTimeout(() => handleBiometricAuth(), 500);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const available = await isBiometricAvailable();

      if (!available) {
        Alert.alert('Biometric Not Available', 'Please use your PIN to login');
        return;
      }

      const success = await authenticateForUnlock();

      if (success) {
        // Check if PIN is stored
        const storedPin = await AsyncStorage.getItem('user_pin');
        
        if (!storedPin) {
          // PIN not stored - prompt user to enter it once
          Alert.alert(
            'One-Time Setup',
            'Please enter your PIN once to complete setup. This enables faucet and payment features.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // User will need to use PIN login this time
                  Alert.alert(
                    'Use PIN Login',
                    'Please login with your PIN this time to complete setup.'
                  );
                }
              }
            ]
          );
          return;
        }
        
        // PIN exists, proceed to MainTabs
        navigation.replace('MainTabs');
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  const handlePINChange = (newPin: string) => {
    setPin(newPin);
    setError('');

    // Only verify when PIN is complete (6 digits)
    if (newPin.length === 6) {
      // Small delay to show the last digit before verifying
      setTimeout(() => verifyPinAndLogin(newPin), 100);
    }
  };

  const verifyPinAndLogin = async (pinToVerify: string) => {
    setLoading(true);
    
    try {
      const isValid = await verifyPin(pinToVerify);
      
      if (isValid) {
        // Store PIN for payment transactions
        await AsyncStorage.setItem('user_pin', pinToVerify);
        navigation.replace('MainTabs');
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    } catch (err) {
      setError('Failed to verify PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require('../../assets/cpay_logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your PIN to continue</Text>
        </View>

        <View style={styles.pinSection}>
          <PINInput
            value={pin}
            onChange={handlePINChange}
            error={error}
            autoFocus={!showBiometric}
          />
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Verifying...</Text>
            </View>
          )}
        </View>

        {showBiometric && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <Text style={styles.biometricIcon}>
              {biometricType.includes('Face') ? '😊' : '👆'}
            </Text>
            <Text style={styles.biometricText}>Use Biometric Authentication</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.forgotPinButton}
          onPress={() => navigation.navigate('ForgotPIN')}
        >
          <Text style={styles.forgotPinText}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl * 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  pinSection: {
    marginBottom: SPACING.xl,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  biometricText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  forgotPinButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  forgotPinText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
