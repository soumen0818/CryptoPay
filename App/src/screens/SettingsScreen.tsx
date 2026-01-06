import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearWallet } from '../services/wallet';
import { COLORS, SPACING, FONT_SIZES, BLOCKCHAIN_CONFIG } from '../constants/config';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [walletAddress, setWalletAddress] = useState<string>('');

  useEffect(() => {
    loadWalletAddress();
  }, []);

  const loadWalletAddress = async () => {
    const address = await AsyncStorage.getItem('wallet_address');
    if (address) {
      setWalletAddress(address);
    }
  };

  const handleCopyAddress = async () => {
    await Clipboard.setStringAsync(walletAddress);
    Alert.alert('Copied!', 'Wallet address copied to clipboard');
  };

  const handleShareAddress = async () => {
    try {
      await Share.share({
        message: `My CryptoPay wallet address:\n${walletAddress}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewOnExplorer = () => {
    const explorerUrl = `${BLOCKCHAIN_CONFIG.EXPLORER_URL}/address/${walletAddress}`;
    Linking.openURL(explorerUrl);
  };

  const handleResetWallet = () => {
    Alert.alert(
      '⚠️ Reset Wallet',
      'This will delete your wallet permanently. Make sure you have backed up your recovery phrase!\n\n(For development: This is safe since wallets are generated randomly)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearWallet();
            await AsyncStorage.clear();
            Alert.alert('Wallet Reset', 'Please restart the app to create a new wallet.', [
              {
                text: 'OK',
                onPress: () => navigation.replace('Splash'),
              },
            ]);
          },
        },
      ]
    );
  };

  const handleOpenQRGenerator = () => {
    navigation.navigate('QRGenerator');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚙️</Text>
        </View>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Wallet Address Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallet Address</Text>
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Your Address</Text>
          <Text style={styles.address}>{walletAddress}</Text>
          <View style={styles.addressActions}>
            <TouchableOpacity
              style={styles.addressActionButton}
              onPress={handleCopyAddress}
            >
              <Text style={styles.addressActionIcon}>📋</Text>
              <Text style={styles.addressActionText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addressActionButton}
              onPress={handleShareAddress}
            >
              <Text style={styles.addressActionIcon}>📤</Text>
              <Text style={styles.addressActionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addressActionButton}
              onPress={handleViewOnExplorer}
            >
              <Text style={styles.addressActionIcon}>🔍</Text>
              <Text style={styles.addressActionText}>Explorer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Network Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Network</Text>
            <Text style={styles.infoValue}>Polygon Amoy Testnet</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chain ID</Text>
            <Text style={styles.infoValue}>{BLOCKCHAIN_CONFIG.CHAIN_ID}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>RPC</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {BLOCKCHAIN_CONFIG.RPC_URL}
            </Text>
          </View>
        </View>
      </View>

      {/* Developer Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer</Text>
        
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleOpenQRGenerator}
        >
          <Text style={styles.testButtonIcon}>🔲</Text>
          <Text style={styles.testButtonText}>QR Code Generator</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleResetWallet}
        >
          <Text style={styles.dangerButtonIcon}>🗑️</Text>
          <Text style={styles.dangerButtonText}>Reset Wallet</Text>
        </TouchableOpacity>
        <Text style={styles.warningText}>
          ⚠️ Development only - Deletes wallet and creates new one on restart
        </Text>
      </View>

      {/* About */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>CryptoPay v1.0.0</Text>
        <Text style={styles.footerSubtext}>Built with ❤️ for Web3</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addressCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  addressLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  address: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'monospace',
    marginBottom: SPACING.md,
  },
  addressActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addressActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  addressActionIcon: {
    fontSize: 16,
  },
  addressActionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '20',
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  testButtonIcon: {
    fontSize: 20,
  },
  testButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B3020',
    borderWidth: 2,
    borderColor: '#FF3B30',
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  dangerButtonIcon: {
    fontSize: 20,
  },
  dangerButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FF3B30',
  },
  warningText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingTop: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  footerSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
