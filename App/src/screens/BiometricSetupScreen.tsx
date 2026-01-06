import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { isBiometricAvailable, getBiometricType, enableBiometric } from '../utils/biometric';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

interface BiometricSetupScreenProps {
  navigation: any;
}

export const BiometricSetupScreen: React.FC<BiometricSetupScreenProps> = ({
  navigation,
}) => {
  const [biometricType, setBiometricType] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get icon and description based on biometric type
  const getBiometricIcon = () => {
    if (biometricType.includes('Face')) return '😊';
    if (biometricType.includes('Fingerprint')) return '👆';
    if (biometricType.includes('Iris')) return '👁️';
    return '🔐';
  };

  const getBiometricDescription = () => {
    if (biometricType.includes('Face')) {
      return 'Use facial recognition for quick and secure access to your wallet. Just look at your phone to unlock.';
    }
    if (biometricType.includes('Fingerprint')) {
      return 'Use your fingerprint for quick and secure access to your wallet. Just touch the sensor to unlock.';
    }
    return 'Use biometric authentication for quick and secure access to your wallet.';
  };

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

  const requestAppPermissions = async () => {
    try {
      // Check if permissions already granted, only request if needed
      const { status: cameraStatus } = await Camera.getCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        await Camera.requestCameraPermissionsAsync();
      }
      
      const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        await Location.requestForegroundPermissionsAsync();
      }
    } catch (error) {
      console.log('Permission request error:', error);
    }
  };

  const navigateToMainTabs = async () => {
    // Request permissions after authentication is complete
    await requestAppPermissions();
    navigation.replace('MainTabs');
  };

  const handleEnableBiometric = async () => {
    setLoading(true);
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
          '✅ Success!',
          `${biometricType} has been enabled for your wallet`,
          [
            {
              text: 'Continue',
              onPress: () => navigateToMainTabs(),
            },
          ]
        );
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigateToMainTabs();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{isAvailable ? getBiometricIcon() : '✅'}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isAvailable ? `Enable ${biometricType}` : 'All Set!'}
          </Text>

          {/* Description */}
          <Text style={styles.subtitle}>
            {isAvailable
              ? getBiometricDescription()
              : 'Your wallet is ready. You can use your PIN to securely access it anytime.'}
          </Text>

          {/* Feature List */}
          {isAvailable && (
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>⚡</Text>
                <Text style={styles.featureText}>Quick unlock in seconds</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🔒</Text>
                <Text style={styles.featureText}>Secure & private authentication</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>💳</Text>
                <Text style={styles.featureText}>Confirm payments easily</Text>
              </View>
            </View>
          )}
        </View>

        {/* Buttons at bottom */}
        <View style={styles.buttonContainer}>
          {isAvailable && (
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleEnableBiometric}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.card} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Enable {biometricType}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.secondaryButton, !isAvailable && styles.primaryButton]}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={[
              styles.secondaryButtonText,
              !isAvailable && styles.primaryButtonText
            ]}>
              {isAvailable ? 'Maybe Later' : 'Get Started'}
            </Text>
          </TouchableOpacity>

          {isAvailable && (
            <Text style={styles.skipNote}>
              You can enable this later in Settings
            </Text>
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: isSmallDevice ? SPACING.xl : SPACING.xl * 2,
    paddingBottom: SPACING.xl,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: isSmallDevice ? 80 : 100,
    height: isSmallDevice ? 80 : 100,
    borderRadius: isSmallDevice ? 40 : 50,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isSmallDevice ? SPACING.lg : SPACING.xl,
    ...SHADOWS.md,
  },
  icon: {
    fontSize: isSmallDevice ? 40 : 50,
  },
  title: {
    fontSize: isSmallDevice ? FONT_SIZES.xl : FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isSmallDevice ? FONT_SIZES.sm : FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: isSmallDevice ? SPACING.lg : SPACING.xl,
    paddingHorizontal: SPACING.sm,
    lineHeight: isSmallDevice ? 20 : 24,
  },
  featureList: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmallDevice ? SPACING.sm : SPACING.md,
  },
  featureIcon: {
    fontSize: isSmallDevice ? 18 : 22,
    marginRight: SPACING.md,
  },
  featureText: {
    fontSize: isSmallDevice ? FONT_SIZES.sm : FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: isSmallDevice ? SPACING.md : SPACING.lg,
    borderRadius: 14,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  primaryButtonText: {
    color: COLORS.card,
    fontSize: isSmallDevice ? FONT_SIZES.md : FONT_SIZES.lg,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: isSmallDevice ? SPACING.md : SPACING.lg,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: isSmallDevice ? FONT_SIZES.md : FONT_SIZES.lg,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  skipNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
