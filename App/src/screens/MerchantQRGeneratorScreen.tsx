import React, { useState, useEffect, useRef } from 'react';
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
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system/next';
import { Ionicons } from '@expo/vector-icons';
import { getMerchantProfile } from '../services/merchant';
import { formatPAY, convertINRtoPAY } from '../utils/currency';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;

interface MerchantQRGeneratorScreenProps {
  navigation: any;
}

export const MerchantQRGeneratorScreen: React.FC<MerchantQRGeneratorScreenProps> = ({
  navigation,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [generatedQR, setGeneratedQR] = useState<boolean>(false);
  const [qrValue, setQRValue] = useState('');
  const qrRef = useRef<any>(null);

  useEffect(() => {
    loadMerchantInfo();
  }, []);

  const loadMerchantInfo = async () => {
    try {
      const walletAddress = await AsyncStorage.getItem('wallet_address');
      if (walletAddress) {
        const profile = await getMerchantProfile(walletAddress);
        if (profile) {
          setBusinessName(profile.business_name);
        }
      }
    } catch (error) {
      console.error('Error loading merchant info:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!businessName.trim()) {
      AlertManager.alert('Error', 'Business name not found. Please try again.');
      return;
    }

    const amountNum = amount ? parseFloat(amount) : undefined;
    if (amount && (isNaN(amountNum!) || amountNum! <= 0)) {
      AlertManager.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Convert INR to PAY for the QR code
    const payAmount = amountNum ? convertINRtoPAY(amountNum) : undefined;

    try {
      setLoading(true);

      const merchantId = await AsyncStorage.getItem('merchant_id');
      const walletAddress = await AsyncStorage.getItem('wallet_address');

      if (!merchantId || !walletAddress) {
        AlertManager.alert('Error', 'Merchant information not found');
        return;
      }

      // Generate QR code data directly (no database storage needed)
      const qrData = JSON.stringify({
        type: 'cryptopay',
        merchant: walletAddress,
        merchantId: merchantId,
        amount: payAmount ? payAmount.toFixed(2) : '0',
        name: businessName,
        note: '',
      });

      setQRValue(qrData);
      setGeneratedQR(true);
    } catch (error: any) {
      AlertManager.alert('Error', error.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setGeneratedQR(false);
    setQRValue('');
  };

  const handleDownload = async () => {
    if (!qrRef.current) return;
    
    try {
      qrRef.current.toDataURL(async (dataURL: string) => {
        try {
          const fileName = `payment-qr-${Date.now()}.png`;
          const filePath = Paths.cache + '/' + fileName;
          const file = new File(filePath);
          
          // Write base64 data to file
          await file.write(dataURL, { encoding: 'base64' });
          
          AlertManager.alert('Downloaded', `QR code saved to ${fileName}`);
        } catch (error) {
          console.error('Error saving file:', error);
          AlertManager.alert('Error', 'Failed to save QR code');
        }
      });
    } catch (error) {
      console.error('Error generating QR image:', error);
      AlertManager.alert('Error', 'Failed to generate QR image');
    }
  };

  const handleShare = async () => {
    if (!qrRef.current) return;
    
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        AlertManager.alert('Error', 'Sharing is not available on this device');
        return;
      }

      qrRef.current.toDataURL(async (dataURL: string) => {
        try {
          const fileName = `payment-qr-${Date.now()}.png`;
          const filePath = Paths.cache + '/' + fileName;
          const file = new File(filePath);
          
          // Write base64 data to file
          await file.write(dataURL, { encoding: 'base64' });
          
          // Share the file
          await Sharing.shareAsync(filePath, {
            mimeType: 'image/png',
            dialogTitle: 'Share Payment QR Code',
          });
        } catch (error) {
          console.error('Error sharing file:', error);
          AlertManager.alert('Error', 'Failed to share QR code');
        }
      });
    } catch (error) {
      console.error('Error generating QR image:', error);
      AlertManager.alert('Error', 'Failed to generate QR image');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generate QR Code</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📱</Text>
          <Text style={styles.title}>Create Payment QR</Text>
          <Text style={styles.subtitle}>
            Generate a QR code for your customers to scan
          </Text>
        </View>

        {!generatedQR ? (
          <View style={styles.form}>
            {initialLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <View style={styles.businessNameCard}>
                  <Text style={styles.businessNameLabel}>Business Name</Text>
                  <Text style={styles.businessNameValue}>{businessName}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Amount (₹ INR) *</Text>
                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="Enter amount in INR"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {amount && parseFloat(amount) > 0 && (
                    <Text style={styles.payEquivalent}>
                      ≈ {formatPAY(convertINRtoPAY(parseFloat(amount)))} (1 PAY = ₹0.85)
                    </Text>
                  )}
                  <Text style={styles.hint}>
                    The exact amount customers will pay
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
              </>
            )}
          </View>
        ) : (
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <QRCode 
                value={qrValue} 
                size={250} 
                getRef={(ref) => (qrRef.current = ref)}
              />
            </View>

            <Text style={styles.qrLabel}>{businessName}</Text>
            {amount && (
              <>
                <Text style={styles.qrAmount}>₹{amount}</Text>
                <Text style={styles.qrPayAmount}>{formatPAY(convertINRtoPAY(parseFloat(amount)))}</Text>
              </>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDownload}
              >
                <Ionicons name="download-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={resetForm}
              >
                <Ionicons name="add-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>New QR</Text>
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl * 2,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.lg,
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
  businessNameCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  businessNameLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.card,
    opacity: 0.9,
    marginBottom: SPACING.xs,
  },
  businessNameValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.card,
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    padding: SPACING.md,
    paddingLeft: 0,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  payEquivalent: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
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
    marginBottom: SPACING.xs,
  },
  qrAmount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  qrPayAmount: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.xs,
    gap: 6,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.sm,
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
