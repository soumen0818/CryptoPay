import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { PINInput } from '../components/PINInput';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;

interface CreatePINScreenProps {
  navigation: any;
  route: any;
}

export const CreatePINScreen: React.FC<CreatePINScreenProps> = ({ navigation, route }) => {
  const { phoneNumber } = route.params || {};
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (pin.length !== 6) {
      setError('Please enter a 6-digit PIN');
      return;
    }

    // Navigate to confirm PIN screen
    navigation.navigate('ConfirmPIN', { pin, phoneNumber });
  };

  const handlePINChange = (newPin: string) => {
    setPin(newPin);
    setError('');

    // Auto-submit when PIN is complete
    if (newPin.length === 6) {
      setTimeout(() => {
        navigation.navigate('ConfirmPIN', { pin: newPin, phoneNumber });
      }, 300);
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
          <Text style={styles.title}>Create Your PIN</Text>
          <Text style={styles.subtitle}>
            Choose a 6-digit PIN to secure your wallet
          </Text>
        </View>

        <View style={styles.pinSection}>
          <PINInput
            value={pin}
            onChange={handlePINChange}
            error={error}
            autoFocus
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>PIN Requirements:</Text>
          <Text style={styles.infoText}>• Use 6 unique digits</Text>
          <Text style={styles.infoText}>• Avoid sequential numbers (123456)</Text>
          <Text style={styles.infoText}>• Don't use obvious patterns</Text>
          <Text style={styles.infoWarning}>
            ⚠️ Keep your PIN safe. You'll need it to access your wallet.
          </Text>
        </View>
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
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    textAlign: 'center',
  },
  pinSection: {
    marginBottom: SPACING.xl * 2,
  },
  infoSection: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: 12,
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
    marginBottom: SPACING.xs,
  },
  infoWarning: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
});
