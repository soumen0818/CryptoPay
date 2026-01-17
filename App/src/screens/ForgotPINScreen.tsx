import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  recoverWalletWithBiometric, 
  hasBiometricBackup,
  recreateWalletFromMnemonic 
} from '../services/wallet';
import { isBiometricAvailable, getBiometricType } from '../utils/biometric';
import { PINInput } from '../components/PINInput';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { AlertManager } from '../utils/alert';

const FONT_SIZES = TYPOGRAPHY.sizes;

interface ForgotPINScreenProps {
  navigation: any;
}

export const ForgotPINScreen: React.FC<ForgotPINScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [hasBackup, setHasBackup] = useState(false);
  const [step, setStep] = useState<'info' | 'new-pin' | 'confirm-pin'>('info');
  const [recoveredMnemonic, setRecoveredMnemonic] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const available = await isBiometricAvailable();
      const type = await getBiometricType();
      const backup = await hasBiometricBackup();
      
      setBiometricAvailable(available);
      setBiometricType(type);
      setHasBackup(backup);
      
      if (!available) {
        AlertManager.alert(
          'Biometric Not Available',
          'Your device does not have biometric authentication enabled. PIN recovery is not available.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (!backup) {
        AlertManager.alert(
          'No Backup Available',
          'This wallet was created without biometric backup. PIN recovery is not available.\n\nYou will need to reset the app and create a new wallet.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const handleRecovery = async () => {
    if (!biometricAvailable || !hasBackup) {
      AlertManager.alert('Error', 'Biometric recovery is not available');
      return;
    }

    setLoading(true);
    try {
      // This will trigger Face ID/Fingerprint prompt
      const mnemonic = await recoverWalletWithBiometric();
      
      if (!mnemonic) {
        throw new Error('Failed to recover wallet');
      }

      setRecoveredMnemonic(mnemonic);
      setStep('new-pin');
      
      AlertManager.alert(
        '✅ Wallet Recovered',
        'Your wallet has been recovered! Now create a new PIN to secure it.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Recovery error:', error);
      
      if (error.message?.includes('cancel')) {
        AlertManager.alert('Cancelled', 'Recovery was cancelled');
      } else {
        AlertManager.alert(
          'Recovery Failed',
          error.message || 'Failed to recover wallet. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewPIN = (pin: string) => {
    setNewPin(pin);
    setError('');

    if (pin.length === 6) {
      // Check for weak PINs
      if (pin === '123456' || pin === '000000' || pin === '111111' || pin === '654321') {
        setError('Please choose a stronger PIN');
        setTimeout(() => setNewPin(''), 300);
        return;
      }

      setStep('confirm-pin');
    }
  };

  const handleConfirmPIN = async (pin: string) => {
    setConfirmPin(pin);
    setError('');

    if (pin.length === 6) {
      if (pin !== newPin) {
        setError('PINs do not match');
        setTimeout(() => {
          setConfirmPin('');
          setNewPin('');
          setStep('new-pin');
        }, 500);
        return;
      }

      // PINs match - recreate wallet
      setLoading(true);
      try {
        if (!recoveredMnemonic) {
          throw new Error('No recovered mnemonic');
        }

        const walletAddress = await recreateWalletFromMnemonic(recoveredMnemonic, newPin);

        AlertManager.alert(
          '🎉 PIN Reset Successful',
          `Your new PIN has been set!\n\nWallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          [
            {
              text: 'Login',
              onPress: () => navigation.replace('Login'),
            },
          ]
        );
      } catch (error: any) {
        console.error('PIN reset error:', error);
        AlertManager.alert('Error', 'Failed to reset PIN. Please try again.');
        setStep('new-pin');
        setNewPin('');
        setConfirmPin('');
      } finally {
        setLoading(false);
      }
    }
  };

  const getBiometricIcon = () => {
    if (biometricType.includes('Face')) return '😊';
    if (biometricType.includes('Fingerprint') || biometricType.includes('Touch')) return '👆';
    return '🔐';
  };

  if (step === 'new-pin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.icon}>🔐</Text>
            <Text style={styles.title}>Create New PIN</Text>
            <Text style={styles.subtitle}>
              Choose a new 6-digit PIN
            </Text>
          </View>

          <View style={styles.pinSection}>
            <PINInput
              value={newPin}
              onChange={handleNewPIN}
              error={error}
              autoFocus
            />
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'confirm-pin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.icon}>✅</Text>
            <Text style={styles.title}>Confirm New PIN</Text>
            <Text style={styles.subtitle}>
              Re-enter your new PIN
            </Text>
          </View>

          <View style={styles.pinSection}>
            <PINInput
              value={confirmPin}
              onChange={handleConfirmPIN}
              error={error}
              autoFocus
            />
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Setting new PIN...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Info step
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.largeIcon}>{getBiometricIcon()}</Text>
          <Text style={styles.title}>Reset PIN</Text>
          <Text style={styles.subtitle}>
            Use {biometricType} to recover your wallet
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Authenticate with {biometricType}
          </Text>
          <Text style={styles.infoText}>
            2. Your wallet will be recovered
          </Text>
          <Text style={styles.infoText}>
            3. Create a new PIN
          </Text>
          <Text style={styles.infoText}>
            4. Login with your new PIN
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            You'll need to authenticate with {biometricType} to continue.
            Make sure your biometric is enrolled on this device.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRecovery}
          disabled={loading || !biometricAvailable || !hasBackup}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonIcon}>{getBiometricIcon()}</Text>
              <Text style={styles.buttonText}>
                Recover with {biometricType}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    paddingTop: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  largeIcon: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  icon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  infoBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: '#856404',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
