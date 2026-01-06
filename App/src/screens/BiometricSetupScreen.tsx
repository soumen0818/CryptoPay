import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBiometricAvailable, getBiometricType, enableBiometric } from '../utils/biometric';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, FONT_SIZES } from '../constants/config';

interface BiometricSetupScreenProps {
  navigation: any;
}

export const BiometricSetupScreen: React.FC<BiometricSetupScreenProps> = ({
  navigation,
}) => {
  const [biometricType, setBiometricType] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await isBiometricAvailable();
    setIsAvailable(available);

    if (available) {
      const type = await getBiometricType();
      setBiometricType(type);
    }
  };

  const handleEnableBiometric = async () => {
    try {
      const success = await enableBiometric();

      if (success) {
        // Save biometric preference locally
        await AsyncStorage.setItem('biometric_enabled', 'true');

        // Update Supabase (optional - continues if fails)
        try {
          const walletAddress = await AsyncStorage.getItem('wallet_address');
          if (walletAddress) {
            await supabase
              .from('users')
              .update({ biometric_enabled: true })
              .eq('wallet_address', walletAddress);
          }
        } catch (dbError) {
          console.log('Failed to update Supabase, continuing...', dbError);
        }

        Alert.alert(
          'Success!',
          `${biometricType} authentication enabled`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('MainTabs'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
    }
  };

  const handleSkip = () => {
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        <Text style={styles.title}>
          {isAvailable ? `Enable ${biometricType}?` : 'Setup Complete!'}
        </Text>

        <Text style={styles.subtitle}>
          {isAvailable
            ? `Use ${biometricType} for quick and secure access to your wallet`
            : 'You can use your PIN to access your wallet'}
        </Text>

        <View style={styles.buttonContainer}>
          {isAvailable && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleEnableBiometric}
            >
              <Text style={styles.primaryButtonText}>
                Enable {biometricType}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.secondaryButton, !isAvailable && styles.primaryButton]}
            onPress={handleSkip}
          >
            <Text style={[
              styles.secondaryButtonText,
              !isAvailable && styles.primaryButtonText
            ]}>
              {isAvailable ? 'Skip for Now' : 'Get Started'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  icon: {
    fontSize: 50,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.card,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
  },
});
