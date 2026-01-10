import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { getMerchantProfile } from '../services/merchant';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;

interface MerchantGlobalQRScreenProps {
  navigation: any;
}

export const MerchantGlobalQRScreen: React.FC<MerchantGlobalQRScreenProps> = ({
  navigation,
}) => {
  const [loading, setLoading] = useState(true);
  const [qrValue, setQRValue] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const qrRef = useRef<any>(null);

  useEffect(() => {
    loadMerchantQR();
  }, []);

  const loadMerchantQR = async () => {
    try {
      const address = await AsyncStorage.getItem('wallet_address');
      if (!address) {
        Alert.alert('Error', 'Wallet address not found');
        return;
      }

      const profile = await getMerchantProfile(address);
      if (profile) {
        setBusinessName(profile.business_name);
        setWalletAddress(address);

        // Create QR code data in the correct format for scanning
        // Using type 'cryptopay' with amount '0' for variable amount payments
        const qrData = JSON.stringify({
          type: 'cryptopay',
          merchant: address,
          merchantId: profile.id,
          amount: '0', // Variable amount - user will enter when paying
          name: profile.business_name,
          note: '',
        });

        setQRValue(qrData);
      }
    } catch (error) {
      console.error('Error loading merchant QR:', error);
      Alert.alert('Error', 'Failed to load merchant QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    await Clipboard.setStringAsync(walletAddress);
    // Silent copy - no alert
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Pay ${businessName}\nWallet: ${walletAddress}\n\nScan my QR code in CryptoPay app to send payment instantly!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownloadQR = async () => {
    try {
      if (qrRef.current) {
        qrRef.current.toDataURL(async (data: string) => {
          const filename = `${businessName.replace(/\s+/g, '_')}_QR.png`;
          const file = new File(Paths.cache, filename);
          
          // Convert base64 to Uint8Array and write
          const binaryString = atob(data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await file.write(bytes);
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri);
          } else {
            Alert.alert('Success', 'QR Code saved successfully!');
          }
        });
      }
    } catch (error) {
      console.error('Error downloading QR:', error);
      Alert.alert('Error', 'Failed to download QR code');
    }
  };

  const handleShareQRImage = async () => {
    try {
      if (qrRef.current) {
        qrRef.current.toDataURL(async (data: string) => {
          const filename = `${businessName.replace(/\s+/g, '_')}_QR.png`;
          const file = new File(Paths.cache, filename);
          
          // Convert base64 to Uint8Array and write
          const binaryString = atob(data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await file.write(bytes);
          
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri, {
              mimeType: 'image/png',
              dialogTitle: `Share ${businessName} QR Code`,
            });
          }
        });
      }
    } catch (error) {
      console.error('Error sharing QR image:', error);
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Payment QR</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.businessIcon}>🏪</Text>
          <Text style={styles.businessName}>{businessName}</Text>
          <Text style={styles.subtitle}>
            Show this QR code to receive payments
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <View style={styles.qrBox}>
            {qrValue && (
              <QRCode
                value={qrValue}
                size={220}
                getRef={(ref) => (qrRef.current = ref)}
              />
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShareQRImage}
          >
            <Ionicons name="share-social-outline" size={22} color={COLORS.card} />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDownloadQR}
          >
            <Ionicons name="download-outline" size={22} color={COLORS.card} />
            <Text style={styles.actionBtnText}>Download</Text>
          </TouchableOpacity>
        </View>

        {/* Wallet Address */}
        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>Wallet Address</Text>
          <TouchableOpacity
            style={styles.walletAddressContainer}
            onPress={handleCopyAddress}
          >
            <Text style={styles.walletAddress} numberOfLines={1}>
              {walletAddress}
            </Text>
            <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl * 2,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  shareButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  infoCard: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  businessIcon: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  businessName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  qrBox: {
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    gap: SPACING.xs,
  },
  actionBtnText: {
    color: COLORS.card,
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  walletCard: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  walletLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontFamily: 'monospace',
    flex: 1,
    marginRight: SPACING.sm,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  shareButtonFull: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.card,
    marginLeft: SPACING.sm,
  },
});
