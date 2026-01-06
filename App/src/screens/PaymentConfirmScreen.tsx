import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { PaymentQRData } from '../utils/qrCode';
import { authenticateWithBiometric } from '../utils/biometric';
import { getWallet } from '../services/wallet';
import { sendPayment } from '../services/blockchain';
import { saveTransaction } from '../services/storage';
import { monitorTransaction } from '../services/transactionMonitor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Button, Card, SuccessAnimation } from '../components';

interface PaymentConfirmScreenProps {
  navigation: any;
  route: {
    params: {
      paymentData: PaymentQRData;
    };
  };
}

export const PaymentConfirmScreen: React.FC<PaymentConfirmScreenProps> = ({
  navigation,
  route,
}) => {
  const { paymentData } = route.params;
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const showSuccessAnimation = () => {
    setShowSuccess(true);
  };

  const handleSuccessComplete = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  const pollTransactionStatus = async (txHash: string, paymentData: PaymentQRData) => {
    try {
      console.log('🔄 Starting background transaction monitoring:', txHash);
      
      // Use the new transaction monitor service
      // It will automatically update Supabase when status changes
      // This triggers real-time updates in TransactionHistoryScreen!
      await monitorTransaction(txHash);
      
      console.log('✅ Transaction monitoring complete');
    } catch (error) {
      console.error('Error monitoring transaction:', error);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setLoading(true);

      // Step 1: Biometric authentication
      const authenticated = await authenticateWithBiometric();

      if (!authenticated) {
        Alert.alert('Authentication Failed', 'Payment cancelled');
        setLoading(false);
        return;
      }

      // Step 2: Get stored PIN and retrieve wallet
      const storedPin = await AsyncStorage.getItem('user_pin');
      if (!storedPin) {
        Alert.alert('Error', 'PIN not found. Please restart the app.');
        setLoading(false);
        return;
      }

      const wallet = await getWallet(storedPin);
      if (!wallet) {
        Alert.alert('Error', 'Failed to access wallet');
        setLoading(false);
        return;
      }

      // Step 3: Send payment transaction
      const txHash = await sendPayment(
        wallet,
        paymentData.merchant,
        paymentData.amount
      );

      console.log('Transaction sent:', txHash);

      // Step 4: Save transaction to local storage (pending state)
      await saveTransaction({
        tx_hash: txHash,
        to_address: paymentData.merchant,
        amount: paymentData.amount,
        status: 'pending',
        merchant_name: paymentData.name,
      });

      // Step 5: Show success animation (transaction sent, not confirmed yet)
      showSuccessAnimation();

      // Step 6: Background polling for transaction confirmation
      pollTransactionStatus(txHash, paymentData);

    } catch (error: any) {
      console.error('Payment error:', error);
      
      // User-friendly error messages
      let errorMessage = 'Failed to process payment';
      if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient balance. Please use the faucet to get test tokens.';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction rejected';
      }
      
      Alert.alert('Payment Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Confirm Payment</Text>
      </View>

      {/* Payment Details Card */}
      <Card variant="elevated" style={styles.card}>
        <View style={styles.merchantSection}>
          <Text style={styles.merchantLabel}>Pay to</Text>
          <Text style={styles.merchantName}>{paymentData.name}</Text>
          <Text style={styles.merchantAddress}>
            {paymentData.merchant.slice(0, 6)}...{paymentData.merchant.slice(-4)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.amountValue}>{paymentData.amount}</Text>
            <Text style={styles.amountCurrency}>PAY</Text>
          </View>
        </View>

        {paymentData.note && (
          <>
            <View style={styles.divider} />
            <View style={styles.noteSection}>
              <Text style={styles.noteLabel}>Note</Text>
              <Text style={styles.noteText}>{paymentData.note}</Text>
            </View>
          </>
        )}
      </Card>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title="Cancel"
          onPress={handleCancel}
          variant="outline"
          disabled={loading}
          size="lg"
        />
        <Button
          title="Pay Now"
          onPress={handleConfirmPayment}
          variant="primary"
          loading={loading}
          disabled={loading}
          size="lg"
          icon="💳"
        />
      </View>

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Text style={styles.securityIcon}>🔒</Text>
        <Text style={styles.securityText}>
          Biometric authentication required to confirm payment
        </Text>
      </View>

      {/* Success Animation Overlay */}
      <SuccessAnimation visible={showSuccess} onComplete={handleSuccessComplete} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  card: {
    margin: SPACING.lg,
    padding: SPACING.xl,
  },
  merchantSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  merchantLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  merchantName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  merchantAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.lg,
  },
  amountSection: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  amountValue: {
    fontSize: FONT_SIZES.xxxl + 4,
    fontWeight: '700',
    color: COLORS.primary,
  },
  amountCurrency: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  noteSection: {
    alignItems: 'center',
  },
  noteLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  noteText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  securityIcon: {
    fontSize: 16,
  },
  securityText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
