import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PINInput } from '../components/PINInput';
import { createWallet } from '../services/wallet';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, FONT_SIZES } from '../constants/config';

// Simple PIN hashing (same as wallet.ts)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

interface ConfirmPINScreenProps {
  navigation: any;
  route: any;
}

export const ConfirmPINScreen: React.FC<ConfirmPINScreenProps> = ({
  navigation,
  route,
}) => {
  const { pin: originalPin } = route.params;
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (confirmPin.length !== 6) {
      setError('Please enter a 6-digit PIN');
      return;
    }

    if (confirmPin !== originalPin) {
      setError('PINs do not match');
      setConfirmPin('');
      return;
    }

    setLoading(true);

    try {
      // Create wallet with PIN
      const walletAddress = await createWallet(originalPin);

      // Store PIN for payment transactions
      await AsyncStorage.setItem('user_pin', originalPin);

      // Save user to Supabase
      const { error: dbError } = await supabase.from('users').insert({
        wallet_address: walletAddress,
        biometric_enabled: false,
      });

      if (dbError) {
        console.error('Database error:', dbError);
        // Continue even if DB insert fails (offline mode)
      }

      // Show success and navigate to biometric setup
      Alert.alert(
        'Wallet Created! 🎉',
        `Your wallet address:\n${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        [
          {
            text: 'Continue',
            onPress: () => navigation.replace('BiometricSetup'),
          },
        ]
      );
    } catch (err) {
      console.error('Wallet creation error:', err);
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePINChange = async (newPin: string) => {
    setConfirmPin(newPin);
    setError('');

    // Auto-submit when PIN is complete
    if (newPin.length === 6) {
      if (newPin !== originalPin) {
        setError('PINs do not match');
        setTimeout(() => setConfirmPin(''), 500);
        return;
      }

      setLoading(true);

      try {
        // Create wallet with PIN
        const walletAddress = await createWallet(originalPin);

        // Save wallet address locally for biometric setup
        await AsyncStorage.setItem('wallet_address', walletAddress);

        // Hash the PIN for Supabase storage
        const pinHash = hashPin(originalPin);

        // Save user to Supabase
        const { error: dbError } = await supabase.from('users').insert({
          wallet_address: walletAddress,
          pin_hash: pinHash,
          biometric_enabled: false,
        });

        if (dbError) {
          console.error('Database error:', dbError);
          // Continue even if DB insert fails (offline mode)
        }

        // Show success and navigate to biometric setup
        Alert.alert(
          'Wallet Created! 🎉',
          `Your wallet address:\n${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('BiometricSetup'),
            },
          ]
        );
      } catch (err) {
        console.error('Wallet creation error:', err);
        Alert.alert('Error', 'Failed to create wallet. Please try again.');
        setConfirmPin('');
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
          <Text style={styles.title}>Confirm Your PIN</Text>
          <Text style={styles.subtitle}>
            Re-enter your PIN to confirm
          </Text>
        </View>

        <View style={styles.pinSection}>
          <PINInput
            value={confirmPin}
            onChange={handlePINChange}
            error={error}
            autoFocus
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Creating your wallet...</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>← Go Back</Text>
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
    paddingTop: SPACING.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
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
    textAlign: 'center',
  },
  pinSection: {
    marginBottom: SPACING.xl * 2,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  backButton: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
