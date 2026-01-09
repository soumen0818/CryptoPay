import React, { useState, useEffect } from 'react';
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
import { sendPayment, getProvider } from '../services/blockchain';
import { saveTransaction } from '../services/storage';
import { monitorTransaction } from '../services/transactionMonitor';
import { getMerchantById, getMerchantByAddress } from '../services/merchant';
import { checkTransactionLimit, recordTransaction, checkRateLimit, recordAction } from '../services/securityLimits';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Button, Card, SuccessAnimation } from '../components';

interface PaymentConfirmScreenProps {
  navigation: any;
  route: {
    params: {
      paymentData: PaymentQRData;
      merchantDetails?: {
        business_name: string;
        category?: string;
        description?: string;
      };
    };
  };
}

export const PaymentConfirmScreen: React.FC<PaymentConfirmScreenProps> = ({
  navigation,
  route,
}) => {
  const { paymentData, merchantDetails } = route.params;
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [merchantInfo, setMerchantInfo] = useState(merchantDetails || null);

  // Fetch merchant details if not provided
  useEffect(() => {
    const loadMerchantDetails = async () => {
      if (merchantDetails) return; // Already have details

      try {
        // Try to get merchant info from DB (Invisible Rail)
        let merchant = null;
        
        // First try by merchantId if available
        if (paymentData.merchantId) {
          merchant = await getMerchantById(paymentData.merchantId);
        }
        
        // Fallback to address lookup
        if (!merchant && paymentData.merchant) {
          merchant = await getMerchantByAddress(paymentData.merchant);
        }

        if (merchant) {
          setMerchantInfo({
            business_name: merchant.business_name,
            category: merchant.category,
            description: merchant.description,
          });
        }
      } catch (error) {
        console.error('Error loading merchant details:', error);
      }
    };

    loadMerchantDetails();
  }, [paymentData, merchantDetails]);

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

      // Phase 4: Check rate limiting
      const rateLimitCheck = await checkRateLimit('payment');
      if (!rateLimitCheck.allowed) {
        Alert.alert(
          'Too Many Requests',
          'Please wait a moment before trying again.'
        );
        setLoading(false);
        return;
      }
      await recordAction('payment');

      // Phase 4: Check transaction limits
      const amount = parseFloat(paymentData.amount);
      const limitCheck = await checkTransactionLimit(amount);
      
      if (!limitCheck.allowed) {
        Alert.alert(
          'Transaction Limit Exceeded',
          limitCheck.message || 'This transaction exceeds your daily limits.'
        );
        setLoading(false);
        return;
      }

      // Step 1: Biometric authentication
      const authenticated = await authenticateWithBiometric();

      if (!authenticated) {
        Alert.alert('Authentication Failed', 'Payment cancelled');
        setLoading(false);
        return;
      }

      // Phase 2: Optimistic UX - Generate temporary transaction ID immediately
      const tempTxId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const submittedAt = new Date().toISOString();

      // Save transaction as "processing" (internal) but "success" (user-visible)
      await saveTransaction({
        tx_hash: tempTxId,
        to_address: paymentData.merchant,
        amount: paymentData.amount,
        status: 'pending',
        internal_status: 'processing',
        user_visible_status: 'success', // Show success to user immediately!
        merchant_name: merchantInfo?.business_name || paymentData.name,
        submitted_at: submittedAt,
      });

      // Step 2: Show success immediately (Invisible Rail - optimistic UX)
      setLoading(false);
      showSuccessAnimation();

      // Step 3: Execute blockchain transaction in background (don't await)
      (async () => {
        try {
          // Get stored PIN and retrieve wallet
          const storedPin = await AsyncStorage.getItem('user_pin');
          if (!storedPin) {
            throw new Error('PIN not found');
          }

          const wallet = await getWallet(storedPin);
          if (!wallet) {
            throw new Error('Failed to access wallet');
          }

          // Send payment transaction
          const txHash = await sendPayment(
            wallet,
            paymentData.merchant,
            paymentData.amount
          );

          console.log('✅ Transaction submitted to blockchain:', txHash);

          // Phase 4: Record successful transaction for limit tracking
          await recordTransaction(parseFloat(paymentData.amount));

          // Update transaction with real hash and status
          await saveTransaction({
            tx_hash: txHash,
            to_address: paymentData.merchant,
            amount: paymentData.amount,
            status: 'pending',
            internal_status: 'submitted',
            user_visible_status: 'success',
            merchant_name: merchantInfo?.business_name || paymentData.name,
            submitted_at: submittedAt,
          });

          // Start background monitoring for confirmation
          pollTransactionStatus(txHash, paymentData);

        } catch (backgroundError: any) {
          console.error('❌ Background payment error:', backgroundError);

          // Map error to user-friendly message
          let failureReason = 'Payment failed. Please try again.';
          if (backgroundError.message?.includes('insufficient funds')) {
            failureReason = 'Insufficient balance';
          } else if (backgroundError.message?.includes('INSUFFICIENT_GAS')) {
            failureReason = 'Network fee too high';
          } else if (backgroundError.message?.includes('gas')) {
            failureReason = 'Unable to process payment';
          }

          // Update transaction to failed
          await saveTransaction({
            tx_hash: tempTxId,
            to_address: paymentData.merchant,
            amount: paymentData.amount,
            status: 'failed',
            internal_status: 'failed',
            user_visible_status: 'failed',
            merchant_name: merchantInfo?.business_name || paymentData.name,
            submitted_at: submittedAt,
            failure_reason: failureReason,
          });

          // User already saw success animation, failure will show in transaction history
          console.log('Transaction marked as failed. User will see in history.');
        }
      })();

    } catch (error: any) {
      console.error('Payment error:', error);
      setLoading(false);

      // Only show error if biometric auth failed (before showing success)
      // User-friendly error messages (Invisible Rail - no blockchain jargon)
      let errorMessage = 'Unable to process payment. Please try again.';
      if (error.message?.includes('Authentication Failed')) {
        // User cancelled biometric - no need to show error
        return;
      }

      Alert.alert('Payment Failed', errorMessage);
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
          <Text style={styles.merchantName}>
            {merchantInfo?.business_name || paymentData.name}
          </Text>
          {merchantInfo?.category && (
            <Text style={styles.merchantCategory}>
              {merchantInfo.category}
            </Text>
          )}
          {merchantInfo?.description && (
            <Text style={styles.merchantDescription}>
              {merchantInfo.description}
            </Text>
          )}
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
          style={{ marginRight: SPACING.md }}
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
  merchantCategory: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  merchantDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
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
  },
  amountValue: {
    fontSize: FONT_SIZES.xxxl + 4,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: SPACING.sm,
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
    marginTop: SPACING.xl,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  securityText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
