import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
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
        // No wallet exposure! Just navigate to MainTabs
        // The wallet will be loaded when needed with PIN
        navigation.replace('MainTabs');
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  const handlePINChange = async (newPin: string) => {
    setPin(newPin);
    setError('');

    if (newPin.length === 6) {
      setLoading(true);
      
      try {
        const isValid = await verifyPin(newPin);
        
        if (isValid) {
          // Store PIN for payment transactions
          await AsyncStorage.setItem('user_pin', newPin);
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
        </View>

        {showBiometric && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <Text style={styles.biometricIcon}>
              {biometricType.includes('Face') ? '😊' : '👆'}
            </Text>
            <Text style={styles.biometricText}>Use {biometricType}</Text>
          </TouchableOpacity>
        )}
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  biometricIcon: {
    fontSize: 24,
  },
  biometricText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
