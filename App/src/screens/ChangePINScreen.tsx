import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PINInput } from '../components/PINInput';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;

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

type Step = 'verify' | 'new' | 'confirm';

interface ChangePINScreenProps {
  navigation: any;
}

export const ChangePINScreen: React.FC<ChangePINScreenProps> = ({ navigation }) => {
  const [step, setStep] = useState<Step>('verify');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyCurrentPin = async (pin: string) => {
    setError('');
    
    try {
      const storedPin = await AsyncStorage.getItem('user_pin');
      
      if (pin === storedPin) {
        setCurrentPin(pin);
        setStep('new');
      } else {
        setError('Incorrect PIN. Please try again.');
        setTimeout(() => setCurrentPin(''), 300);
      }
    } catch (err) {
      setError('Error verifying PIN');
    }
  };

  const handleNewPin = (pin: string) => {
    setError('');
    
    if (pin === currentPin) {
      setError('New PIN must be different from current PIN');
      setTimeout(() => setNewPin(''), 300);
      return;
    }
    
    // Check for sequential patterns
    if (pin === '123456' || pin === '654321' || pin === '000000' || pin === '111111') {
      setError('Please choose a stronger PIN');
      setTimeout(() => setNewPin(''), 300);
      return;
    }
    
    setNewPin(pin);
    setStep('confirm');
  };

  const handleConfirmPin = async (pin: string) => {
    setError('');
    
    if (pin !== newPin) {
      setError('PINs do not match. Try again.');
      setTimeout(() => setConfirmPin(''), 300);
      return;
    }
    
    setLoading(true);
    
    try {
      // Save new PIN
      await AsyncStorage.setItem('user_pin', newPin);
      await AsyncStorage.setItem('pin_hash', hashPin(newPin));
      
      Alert.alert(
        '✅ PIN Changed',
        'Your PIN has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      setError('Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (pin: string, setter: (p: string) => void, handler: (p: string) => void) => {
    setter(pin);
    setError('');
    
    if (pin.length === 6) {
      setTimeout(() => handler(pin), 300);
    }
  };

  const getStepContent = () => {
    switch (step) {
      case 'verify':
        return {
          icon: '🔐',
          title: 'Enter Current PIN',
          subtitle: 'Verify your identity to change PIN',
          value: currentPin,
          onChange: (pin: string) => handlePinChange(pin, setCurrentPin, verifyCurrentPin),
        };
      case 'new':
        return {
          icon: '🆕',
          title: 'Create New PIN',
          subtitle: 'Choose a new 6-digit PIN',
          value: newPin,
          onChange: (pin: string) => handlePinChange(pin, setNewPin, handleNewPin),
        };
      case 'confirm':
        return {
          icon: '✅',
          title: 'Confirm New PIN',
          subtitle: 'Re-enter your new PIN',
          value: confirmPin,
          onChange: (pin: string) => handlePinChange(pin, setConfirmPin, handleConfirmPin),
        };
    }
  };

  const content = getStepContent();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, step === 'verify' && styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, step === 'new' && styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, step === 'confirm' && styles.progressDotActive]} />
        </View>

        <View style={styles.header}>
          <Text style={styles.icon}>{content.icon}</Text>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.subtitle}>{content.subtitle}</Text>
        </View>

        <View style={styles.pinSection}>
          <PINInput
            value={content.value}
            onChange={content.onChange}
            error={error}
            autoFocus
          />
        </View>

        {step === 'new' && (
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>PIN Requirements:</Text>
            <Text style={styles.infoText}>• Use 6 unique digits</Text>
            <Text style={styles.infoText}>• Avoid sequential numbers (123456)</Text>
            <Text style={styles.infoText}>• Must be different from current PIN</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
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
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  infoTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  cancelButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});
