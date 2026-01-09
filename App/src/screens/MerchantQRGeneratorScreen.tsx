import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { createMerchantQRCode } from '../services/merchant';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;

interface MerchantQRGeneratorScreenProps {
  navigation: any;
}

export const MerchantQRGeneratorScreen: React.FC<MerchantQRGeneratorScreenProps> = ({
  navigation,
}) => {
  const [qrName, setQRName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [qrValue, setQRValue] = useState('');

  const handleGenerate = async () => {
    if (!qrName.trim()) {
      Alert.alert('Error', 'Please enter a QR code name');
      return;
    }

    const amountNum = amount ? parseFloat(amount) : undefined;
    if (amount && (isNaN(amountNum!) || amountNum! <= 0)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);

      const merchantId = await AsyncStorage.getItem('merchant_id');
      const walletAddress = await AsyncStorage.getItem('wallet_address');

      if (!merchantId || !walletAddress) {
        Alert.alert('Error', 'Merchant information not found');
        return;
      }

      // Create QR code in database
      const result = await createMerchantQRCode({
        merchant_id: merchantId,
        qr_name: qrName,
        amount: amountNum ? amountNum.toString() : undefined,
        is_active: true,
      });

      if (result.success) {
        // Generate QR code data
        const qrData = JSON.stringify({
          type: 'merchant_payment',
          merchantId,
          walletAddress,
          qrName,
          amount: amountNum,
          timestamp: Date.now(),
        });

        setQRValue(qrData);
        setGeneratedQR(result.qrCodeId!);

        Alert.alert(
          'Success! 🎉',
          'QR code created successfully. Share this QR code with your customers.',
          [
            {
              text: 'View in Dashboard',
              onPress: () => navigation.navigate('MerchantDashboard'),
            },
            { text: 'Create Another', onPress: resetForm },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create QR code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQRName('');
    setAmount('');
    setGeneratedQR(null);
    setQRValue('');
  };

  const handleCopyData = async () => {
    if (qrValue) {
      await Clipboard.setStringAsync(qrValue);
      Alert.alert('Copied', 'QR code data copied to clipboard');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📱</Text>
          <Text style={styles.title}>Generate QR Code</Text>
          <Text style={styles.subtitle}>
            Create a QR code for your customers to scan
          </Text>
        </View>

        {!generatedQR ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>QR Code Name *</Text>
              <TextInput
                style={styles.input}
                value={qrName}
                onChangeText={setQRName}
                placeholder="e.g., Store Counter, Online Shop"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={styles.hint}>
                Give this QR code a descriptive name
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount (Optional)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="Leave blank for variable amount"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="decimal-pad"
              />
              <Text style={styles.hint}>
                If set, customers will pay this exact amount
              </Text>
            </View>

            <View style={styles.exampleBox}>
              <Text style={styles.exampleTitle}>💡 Examples:</Text>
              <Text style={styles.exampleText}>
                • "Coffee Shop Counter" - No amount (customer enters amount)
              </Text>
              <Text style={styles.exampleText}>
                • "Premium Plan" - 99.99 PAY (fixed subscription)
              </Text>
              <Text style={styles.exampleText}>
                • "Table 5" - No amount (restaurant order)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.card} />
              ) : (
                <Text style={styles.buttonText}>Generate QR Code</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <QRCode value={qrValue} size={250} />
            </View>

            <Text style={styles.qrLabel}>{qrName}</Text>
            {amount && (
              <Text style={styles.qrAmount}>{amount} PAY</Text>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleCopyData}
              >
                <Text style={styles.actionButtonText}>📋 Copy Data</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={resetForm}
              >
                <Text style={styles.actionButtonText}>+ New QR</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>📌 How to use:</Text>
              <Text style={styles.instructionsText}>
                1. Display this QR code at your store or online
              </Text>
              <Text style={styles.instructionsText}>
                2. Customers scan with CryptoPay app
              </Text>
              <Text style={styles.instructionsText}>
                3. Payment goes directly to your wallet
              </Text>
              <Text style={styles.instructionsText}>
                4. Track all payments in your dashboard
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.navigate('MerchantDashboard')}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl * 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  exampleBox: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  exampleTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  exampleText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
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
  qrContainer: {
    alignItems: 'center',
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: SPACING.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: SPACING.lg,
  },
  qrLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  qrAmount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  instructionsBox: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  instructionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  instructionsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.card,
  },
});
