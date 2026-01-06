import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PINInput } from '../components/PINInput';
import { hasWallet, verifyPin } from '../services/wallet';
import { authenticateForUnlock, isBiometricAvailable } from '../utils/biometric';
import { COLORS, SPACING, FONT_SIZES } from '../constants/config';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);

  useEffect(() => {
    checkAndTriggerBiometric();
  }, []);

  const checkAndTriggerBiometric = async () => {
    const biometricEnabled = await AsyncStorage.getItem('biometric_enabled');
    const available = await isBiometricAvailable();
    
    if (biometricEnabled === 'true' && available) {
      setShowBiometric(true);
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
          <View style={styles.logo}>
            <Text style={styles.logoText}>₿</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your PIN to continue</Text>
        </View>

        <View style={styles.pinSection}>
          <PINInput
            value={pin}
            onChange={handlePINChange}
            error={error}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleBiometricAuth}
        >
          <Text style={styles.biometricText}>🔐 Use Biometric</Text>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  logoText: {
    fontSize: 40,
    color: COLORS.card,
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
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  biometricText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
