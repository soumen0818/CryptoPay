import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import { getWallet } from '../services/wallet';
import { getProvider, getTokenContract, transferTokens } from '../services/blockchain';
import { saveTransaction, getUserDisplayName } from '../services/storage';
import { authenticateWithBiometric, authenticateWithPIN } from '../utils/biometric';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Button, LoadingSpinner } from '../components';

interface SendMoneyScreenProps {
  navigation: any;
  route?: any;
}

export const SendMoneyScreen: React.FC<SendMoneyScreenProps> = ({ navigation, route }) => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [amountINR, setAmountINR] = useState<string>(''); // User enters INR
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [isMerchantPayment, setIsMerchantPayment] = useState<boolean>(false);
  const [isFromQR, setIsFromQR] = useState<boolean>(false);
  const [hasPresetAmount, setHasPresetAmount] = useState<boolean>(false);
  const [fetchingRecipient, setFetchingRecipient] = useState<boolean>(false);
  const [recipientFetched, setRecipientFetched] = useState<boolean>(false);
  const paymentInProgress = useRef<boolean>(false);
  const networkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Conversion rate: 1 PAY = 0.85 INR
  const INR_TO_PAY_RATE = 0.85;
  
  // Calculate PAY amount from INR
  const amountPAY = amountINR ? (parseFloat(amountINR) / INR_TO_PAY_RATE).toFixed(2) : '0';

  useEffect(() => {
    loadWalletData();
    
    // If coming from QR scan or deep link
    if (route?.params?.recipientAddress) {
      setRecipientAddress(route.params.recipientAddress);
    }
    if (route?.params?.recipientName) {
      setRecipientName(route.params.recipientName);
    }
    if (route?.params?.amount && parseFloat(route.params.amount) > 0) {
      // Convert PAY amount from QR to INR for display
      const payAmount = parseFloat(route.params.amount);
      const inrAmount = (payAmount * INR_TO_PAY_RATE).toFixed(2);
      setAmountINR(inrAmount);
      setHasPresetAmount(true);
    }
    if (route?.params?.note) {
      setNote(route.params.note);
    }
    if (route?.params?.hideBalance === true) {
      setHideBalance(true);
    }
    // Check if this is a merchant payment
    if (route?.params?.merchantId) {
      setMerchantId(route.params.merchantId);
    }
    // Check payment type flags
    if (route?.params?.isMerchantPayment) {
      setIsMerchantPayment(true);
    }
    if (route?.params?.isFromQR) {
      setIsFromQR(true);
    }
  }, [route?.params]);

  // Handle back button during payment
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (paymentInProgress.current) {
        Alert.alert(
          'Transaction Cancelled',
          'Payment was interrupted. If the transaction was submitted, it may still complete.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => {
      backHandler.remove();
      if (networkTimeoutRef.current) {
        clearTimeout(networkTimeoutRef.current);
      }
    };
  }, []);

  const loadWalletData = async () => {
    try {
      const address = await AsyncStorage.getItem('wallet_address');
      if (address) {
        setWalletAddress(address);
        await loadBalance(address);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const loadBalance = async (address: string) => {
    try {
      const provider = getProvider();
      const tokenContract = getTokenContract(provider);
      const balance = await tokenContract.balanceOf(address);
      const formatted = ethers.formatUnits(balance, 18);
      setBalance(parseFloat(formatted).toFixed(2));
    } catch (error) {
      console.error('Error loading balance:', error);
      setBalance('0.00');
    }
  };

  // Fetch recipient name when address is entered
  const fetchRecipientName = async (address: string) => {
    if (!address || !ethers.isAddress(address)) {
      setRecipientName('');
      setRecipientFetched(false);
      return;
    }

    // Don't fetch if same as user's wallet
    if (address.toLowerCase() === walletAddress.toLowerCase()) {
      setRecipientName('');
      setRecipientFetched(false);
      return;
    }

    setFetchingRecipient(true);
    try {
      const name = await getUserDisplayName(address);
      if (name) {
        setRecipientName(name);
        setRecipientFetched(true);
      } else {
        setRecipientName('');
        setRecipientFetched(false);
      }
    } catch (error) {
      console.log('Error fetching recipient name:', error);
      setRecipientName('');
      setRecipientFetched(false);
    } finally {
      setFetchingRecipient(false);
    }
  };

  // Handle address input change - auto-fetch when valid address is entered
  const handleAddressChange = (address: string) => {
    setRecipientAddress(address);
    
    // Clear previous recipient info when address changes
    if (!isFromQR) {
      setRecipientName('');
      setRecipientFetched(false);
    }
    
    // Auto-fetch when a complete valid Ethereum address is entered (42 chars: 0x + 40 hex)
    if (!isFromQR && address.length === 42 && ethers.isAddress(address)) {
      fetchRecipientName(address);
    }
  };

  const validateInputs = (): boolean => {
    if (!recipientAddress.trim()) {
      Alert.alert('Invalid Address', 'Please enter a recipient wallet address');
      return false;
    }

    if (!ethers.isAddress(recipientAddress.trim())) {
      Alert.alert('Invalid Address', 'Please enter a valid Ethereum address');
      return false;
    }

    if (recipientAddress.toLowerCase() === walletAddress.toLowerCase()) {
      Alert.alert('Invalid Address', 'You cannot send money to yourself');
      return false;
    }

    const amountNum = parseFloat(amountPAY);
    if (!amountINR || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return false;
    }

    const balanceNum = parseFloat(balance);
    if (amountNum > balanceNum) {
      Alert.alert('Insufficient Balance', `You only have ${balance} PAY (₹${(parseFloat(balance) * INR_TO_PAY_RATE).toFixed(2)} INR)`);
      return false;
    }

    return true;
  };

  const handleSendMoney = async () => {
    if (!validateInputs()) return;

    Alert.alert(
      'Confirm Payment',
      `Send ₹${amountINR} INR (${amountPAY} PAY) to\n${recipientAddress.substring(0, 10)}...${recipientAddress.substring(recipientAddress.length - 8)}${note ? `\n\nNote: ${note}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setLoading(true);
              paymentInProgress.current = true;

              // Set timeout for slow network detection (5 seconds)
              networkTimeoutRef.current = setTimeout(() => {
                if (paymentInProgress.current) {
                  Alert.alert(
                    'Slow Network Detected',
                    'Your network connection is slow. The payment is still processing...',
                    [{ text: 'OK' }]
                  );
                }
              }, 10000);

              // Get PIN and wallet
              const storedPin = await AsyncStorage.getItem('user_pin');
              if (!storedPin) {
                paymentInProgress.current = false;
                setLoading(false);
                if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current);
                Alert.alert('Error', 'PIN not found. Please sign in again.');
                return;
              }

              // Authenticate with biometric, fallback to PIN if not available
              let authenticated = await authenticateWithBiometric();
              
              // If biometric not available or failed, use PIN
              if (!authenticated) {
                authenticated = await authenticateWithPIN();
              }
              
              const wallet = await getWallet(storedPin);

              if (!authenticated) {
                paymentInProgress.current = false;
                setLoading(false);
                if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current);
                Alert.alert('Authentication Failed', 'Transaction cancelled');
                return;
              }

              if (!wallet) {
                paymentInProgress.current = false;
                setLoading(false);
                if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current);
                Alert.alert('Error', 'Failed to load wallet');
                return;
              }

              const connectedWallet = wallet.connect(getProvider());

              // Transfer tokens (in PAY)
              const txHash = await transferTokens(
                connectedWallet,
                recipientAddress.trim(),
                amountPAY
              );

              // Clear timeout on success
              if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current);
              paymentInProgress.current = false;

              // Save transaction locally and sync to Supabase
              // Get sender's name from AsyncStorage
              const senderName = await AsyncStorage.getItem('user_name');
              
              const transactionData = {
                tx_hash: txHash,
                to_address: recipientAddress.trim(),
                from_address: walletAddress,
                amount: amountPAY,
                status: 'pending' as const,
                // For merchant payments: merchant_name is business name, recipient_name is same
                // For personal payments: recipient_name is the person's name (if available)
                merchant_name: merchantId ? recipientName : undefined,
                recipient_name: recipientName || undefined,
                sender_name: senderName || undefined,
                note: note || undefined, // Separate note field
                created_at: new Date().toISOString(),
                transaction_type: merchantId ? 'merchant' as const : 'personal' as const,
                merchant_id: merchantId || undefined,
              };
              
              saveTransaction(transactionData)
                .then(() => console.log('✅ Transaction saved and synced'))
                .catch(err => console.error('❌ Transaction save/sync error:', err));

              setLoading(false);

              Alert.alert(
                '✅ Payment Sent!',
                `Successfully sent ₹${amountINR} INR (${amountPAY} PAY)\n\nTransaction will confirm shortly.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.goBack();
                      // Refresh balance in background
                      setTimeout(() => loadBalance(walletAddress), 2000);
                    },
                  },
                ]
              );
            } catch (error: any) {
              paymentInProgress.current = false;
              setLoading(false);
              if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current);
              console.error('Send money error:', error);
              Alert.alert('Transaction Failed', error.message || 'Failed to send payment');
            }
          },
        },
      ]
    );
  };

  const handlePasteAddress = async () => {
    try {
      const { default: Clipboard } = await import('expo-clipboard');
      const text = await Clipboard.getStringAsync();
      if (text && ethers.isAddress(text.trim())) {
        const address = text.trim();
        setRecipientAddress(address);
        // Automatically fetch recipient name after pasting
        fetchRecipientName(address);
      } else {
        Alert.alert('Invalid Address', 'Clipboard does not contain a valid address');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to paste from clipboard');
    }
  };

  const handleBackPress = () => {
    if (paymentInProgress.current) {
      Alert.alert(
        'Transaction Cancelled',
        'Payment was interrupted. If the transaction was submitted, it may still complete.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Processing payment..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Money</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Balance Card - Hidden when scanned from other places */}
        {!hideBalance && (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>{balance}</Text>
              <Text style={styles.balanceCurrency}>PAY</Text>
            </View>
            <Text style={styles.balanceUsd}>≈ ₹{(parseFloat(balance) * 0.85).toFixed(2)} INR</Text>
          </View>
        )}

        {/* Recipient Info Card - Show when from QR scan OR when name is fetched */}
        {((isFromQR && recipientName) || recipientFetched) && (
          <View style={styles.recipientCard}>
            <View style={styles.recipientCardHeader}>
              <Text style={styles.recipientCardIcon}>{isMerchantPayment ? '🏪' : '👤'}</Text>
              <Text style={styles.recipientCardTitle}>
                {isMerchantPayment ? 'Paying Merchant' : 'Sending To'}
              </Text>
            </View>
            <View style={styles.recipientCardContent}>
              <Text style={styles.recipientCardName}>{recipientName}</Text>
              <Text style={styles.recipientCardAddress} numberOfLines={1}>
                {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}
              </Text>
            </View>
          </View>
        )}

        {/* Recipient Address Input - Hide when recipient is fetched or from QR */}
        {!isFromQR && !recipientFetched && (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Recipient Wallet Address</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="0x..."
                placeholderTextColor={COLORS.textTertiary}
                value={recipientAddress}
                onChangeText={handleAddressChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.inputButton} onPress={handlePasteAddress}>
                <Text style={styles.inputButtonText}>📋</Text>
              </TouchableOpacity>
            </View>
            {fetchingRecipient && (
              <Text style={styles.fetchingText}>Looking up recipient...</Text>
            )}
          </View>
        )}

        {/* Change Recipient Button - Show when recipient is fetched (not from QR) */}
        {!isFromQR && recipientFetched && (
          <TouchableOpacity 
            style={styles.changeRecipientButton}
            onPress={() => {
              setRecipientAddress('');
              setRecipientName('');
              setRecipientFetched(false);
            }}
          >
            <Text style={styles.changeRecipientText}>Change Recipient</Text>
          </TouchableOpacity>
        )}

        {/* Amount Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={[styles.amountInput, hasPresetAmount && styles.inputDisabled]}
              placeholder="0.00"
              placeholderTextColor={COLORS.textTertiary}
              value={amountINR}
              onChangeText={setAmountINR}
              keyboardType="decimal-pad"
              editable={!hasPresetAmount}
            />
            <Text style={styles.currencyLabel}>INR</Text>
          </View>
          {amountINR && parseFloat(amountINR) > 0 && (
            <View style={styles.conversionInfo}>
              <Text style={styles.conversionText}>≈ {amountPAY} PAY</Text>
            </View>
          )}
          {/* Quick Amount Buttons - Hide when amount is preset from QR */}
          {!hasPresetAmount && (
            <View style={styles.quickAmountContainer}>
              {['10', '50', '100', '500'].map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={styles.quickAmountButton}
                  onPress={() => setAmountINR(quickAmount)}
                >
                  <Text style={styles.quickAmountText}>₹{quickAmount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Note Input (Optional) */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Add Note (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="e.g., Lunch payment, Rent, etc."
            placeholderTextColor={COLORS.textTertiary}
            value={note}
            onChangeText={setNote}
            maxLength={50}
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!recipientAddress || !amountINR || parseFloat(amountINR) <= 0) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMoney}
          disabled={!recipientAddress || !amountINR || parseFloat(amountINR) <= 0}
          activeOpacity={0.8}
        >
          <View style={styles.sendButtonContent}>
            <Text style={styles.sendButtonEmoji}>💸</Text>
            <Text style={styles.sendButtonText}>
              {amountINR && parseFloat(amountINR) > 0 
                ? `Send ₹${amountINR}` 
                : 'Enter Amount to Send'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Transactions are processed on the blockchain and typically confirm in 5-10 seconds.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    opacity: 0.8,
    marginBottom: SPACING.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textInverse,
    marginRight: SPACING.sm,
  },
  balanceCurrency: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textInverse,
    opacity: 0.9,
    fontWeight: '600',
  },
  balanceUsd: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    opacity: 0.7,
    marginTop: SPACING.xs,
  },
  recipientCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  recipientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  recipientCardIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  recipientCardTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recipientCardContent: {
    marginLeft: 36,
  },
  recipientCardName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  recipientCardAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fetchingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  changeRecipientButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  changeRecipientText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  inputSection: {
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputDisabled: {
    backgroundColor: COLORS.background,
    color: COLORS.textSecondary,
  },
  recipientNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  recipientNameIcon: {
    fontSize: 14,
    marginRight: SPACING.xs,
  },
  recipientNameText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
  },  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    padding: SPACING.md,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputButton: {
    padding: SPACING.md,
  },
  inputButtonText: {
    fontSize: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  scanButtonIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  scanButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.sm,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  currencyLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  conversionInfo: {
    backgroundColor: COLORS.successBg,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },
  conversionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    marginHorizontal: -SPACING.xs,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAmountText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  noteInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    ...SHADOWS.sm,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg + 4,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
    elevation: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    ...SHADOWS.sm,
    elevation: 2,
  },
  sendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonEmoji: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  sendButtonText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.textInverse,
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.infoBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
