import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import { getWallet } from '../services/wallet';
import { getProvider, getTokenContract, transferTokens } from '../services/blockchain';
import { saveTransaction } from '../services/storage';
import { authenticateWithBiometric } from '../utils/biometric';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Button, LoadingSpinner } from '../components';

interface SendMoneyScreenProps {
  navigation: any;
  route?: any;
}

export const SendMoneyScreen: React.FC<SendMoneyScreenProps> = ({ navigation, route }) => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<string>('0');

  useEffect(() => {
    loadWalletData();
    
    // If coming from QR scan or deep link
    if (route?.params?.recipientAddress) {
      setRecipientAddress(route.params.recipientAddress);
    }
    if (route?.params?.amount) {
      setAmount(route.params.amount);
    }
  }, [route?.params]);

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

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return false;
    }

    const balanceNum = parseFloat(balance);
    if (amountNum > balanceNum) {
      Alert.alert('Insufficient Balance', `You only have ${balance} PAY`);
      return false;
    }

    return true;
  };

  const handleSendMoney = async () => {
    if (!validateInputs()) return;

    Alert.alert(
      'Confirm Payment',
      `Send ${amount} PAY to\n${recipientAddress.substring(0, 10)}...${recipientAddress.substring(recipientAddress.length - 8)}${note ? `\n\nNote: ${note}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setLoading(true);

              // Authenticate with biometric/PIN
              const authenticated = await authenticateWithBiometric();
              if (!authenticated) {
                setLoading(false);
                Alert.alert('Authentication Failed', 'Transaction cancelled');
                return;
              }

              // Get PIN and wallet
              const storedPin = await AsyncStorage.getItem('user_pin');
              if (!storedPin) {
                setLoading(false);
                Alert.alert('Error', 'PIN not found. Please sign in again.');
                return;
              }

              let wallet = await getWallet(storedPin);
              if (!wallet) {
                setLoading(false);
                Alert.alert('Error', 'Failed to load wallet');
                return;
              }

              wallet = wallet.connect(getProvider());

              // Transfer tokens
              const txHash = await transferTokens(
                wallet,
                recipientAddress.trim(),
                amount
              );

              // Save transaction locally
              await saveTransaction({
                tx_hash: txHash,
                to_address: recipientAddress.trim(),
                from_address: walletAddress,
                amount: amount,
                status: 'pending',
                merchant_name: note || undefined,
              });

              setLoading(false);

              Alert.alert(
                '✅ Payment Sent!',
                `Successfully sent ${amount} PAY\n\nTransaction will confirm shortly.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.goBack();
                      setTimeout(() => loadBalance(walletAddress), 6000);
                    },
                  },
                ]
              );
            } catch (error: any) {
              setLoading(false);
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
        setRecipientAddress(text.trim());
      } else {
        Alert.alert('Invalid Address', 'Clipboard does not contain a valid address');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to paste from clipboard');
    }
  };

  const handleScanQR = () => {
    navigation.navigate('Scan', { returnTo: 'SendMoney' });
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
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Money</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>{balance}</Text>
            <Text style={styles.balanceCurrency}>PAY</Text>
          </View>
          <Text style={styles.balanceUsd}>≈ ₹{(parseFloat(balance) * 0.85).toFixed(2)} INR</Text>
        </View>

        {/* Recipient Address Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Recipient Wallet Address</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="0x..."
              placeholderTextColor={COLORS.textTertiary}
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.inputButton} onPress={handlePasteAddress}>
              <Text style={styles.inputButtonText}>📋</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.scanButton} onPress={handleScanQR}>
            <Text style={styles.scanButtonIcon}>📷</Text>
            <Text style={styles.scanButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Amount (PAY)</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountContainer}>
            {['10', '50', '100', '500'].map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => setAmount(quickAmount)}
              >
                <Text style={styles.quickAmountText}>₹{quickAmount}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
            (!recipientAddress || !amount || parseFloat(amount) <= 0) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMoney}
          disabled={!recipientAddress || !amount || parseFloat(amount) <= 0}
        >
          <Text style={styles.sendButtonText}>💸 Send Money</Text>
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
  inputSection: {
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
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
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.sm,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    padding: SPACING.md,
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
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textInverse,
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
