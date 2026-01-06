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
  Platform,
  Switch,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearWallet } from '../services/wallet';
import { isMerchant, getMerchantProfile } from '../services/merchant';
import { isBiometricAvailable, getBiometricType } from '../utils/biometric';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, BLOCKCHAIN_CONFIG } from '../constants/theme';
import { Card, Button } from '../components';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [merchantStatus, setMerchantStatus] = useState<boolean>(false);
  const [businessName, setBusinessName] = useState<string>('');
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  useEffect(() => {
    loadWalletAddress();
    checkMerchantStatus();
    loadSettings();
  }, []);

  const loadWalletAddress = async () => {
    const address = await AsyncStorage.getItem('wallet_address');
    if (address) {
      setWalletAddress(address);
    }
  };

  const loadSettings = async () => {
    // Load biometric setting
    const biometricSetting = await AsyncStorage.getItem('biometric_enabled');
    setBiometricEnabled(biometricSetting === 'true');
    
    // Check biometric type
    const available = await isBiometricAvailable();
    if (available) {
      const type = await getBiometricType();
      setBiometricType(type);
    }
    
    // Load notification setting
    const notifSetting = await AsyncStorage.getItem('notifications_enabled');
    setNotificationsEnabled(notifSetting !== 'false');
  };

  const checkMerchantStatus = async () => {
    const address = await AsyncStorage.getItem('wallet_address');
    if (address) {
      const isMerch = await isMerchant(address);
      setMerchantStatus(isMerch);
      if (isMerch) {
        const profile = await getMerchantProfile(address);
        if (profile) {
          setBusinessName(profile.business_name);
        }
      }
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

  const handleSignOut = () => {
    Alert.alert(
      '👋 Sign Out',
      'Are you sure you want to sign out? You will need to verify your phone number again to access your wallet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // Clear session data (but keep wallet safe)
            await AsyncStorage.removeItem('pin_hash');
            await AsyncStorage.removeItem('biometric_enabled');
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('phone_verified');
            await AsyncStorage.removeItem('phone_number'); // Clear this so user must re-verify
            
            Alert.alert('Signed Out', 'You have been signed out successfully.', [
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

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const available = await isBiometricAvailable();
      if (!available) {
        Alert.alert('Not Available', `${biometricType} is not set up on this device. Please enable it in your device settings.`);
        return;
      }
    }
    setBiometricEnabled(value);
    await AsyncStorage.setItem('biometric_enabled', value.toString());
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notifications_enabled', value.toString());
  };

  const handleExportWallet = () => {
    Alert.alert(
      '🔐 Export Recovery Phrase',
      'Your recovery phrase is the only way to restore your wallet. Never share it with anyone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show Phrase',
          onPress: () => {
            Alert.alert(
              '⚠️ Security Warning',
              'Make sure no one is watching your screen. Your recovery phrase will be displayed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I Understand',
                  onPress: () => {
                    // In production, you would decrypt and show the mnemonic
                    Alert.alert('Recovery Phrase', 'This feature requires PIN verification. Coming soon!');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Coming Soon',
      'Help & Support feature is under development. We\'re working hard to bring you the best support experience!',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Coming Soon',
      'Privacy Policy will be available soon.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleTerms = () => {
    Alert.alert(
      'Coming Soon',
      'Terms of Service will be available soon.',
      [{ text: 'OK', style: 'default' }]
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

      {/* Merchant Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Merchant</Text>
        {merchantStatus ? (
          <View style={styles.merchantCard}>
            <View style={styles.merchantHeader}>
              <Text style={styles.merchantBadge}>✓ Merchant Account</Text>
              <Text style={styles.merchantName}>{businessName}</Text>
            </View>
            <TouchableOpacity
              style={styles.merchantButton}
              onPress={() => navigation.navigate('MerchantDashboard')}
            >
              <Text style={styles.merchantButtonIcon}>📊</Text>
              <Text style={styles.merchantButtonText}>Open Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.merchantPromo}>
            <Text style={styles.merchantPromoIcon}>🏪</Text>
            <Text style={styles.merchantPromoTitle}>Accept Payments</Text>
            <Text style={styles.merchantPromoText}>
              Become a merchant and start accepting CryptoPay payments
            </Text>
            <TouchableOpacity
              style={styles.merchantPromoButton}
              onPress={() => navigation.navigate('MerchantRegistration')}
            >
              <Text style={styles.merchantPromoButtonText}>Become a Merchant</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Network Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network</Text>
        <View style={styles.networkCard}>
          <View style={styles.networkHeader}>
            <View style={styles.networkStatusBadge}>
              <View style={styles.networkDotActive} />
              <Text style={styles.networkStatusText}>Connected</Text>
            </View>
          </View>
          <View style={styles.networkDetails}>
            <View style={styles.networkRow}>
              <Text style={styles.networkLabel}>Network</Text>
              <Text style={styles.networkValue}>Polygon Amoy Testnet</Text>
            </View>
            <View style={[styles.networkRow, styles.networkRowLast]}>
              <Text style={styles.networkLabel}>Chain ID</Text>
              <Text style={styles.networkValue}>{BLOCKCHAIN_CONFIG.CHAIN_ID}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔐</Text>
              <View>
                <Text style={styles.settingLabel}>{biometricType}</Text>
                <Text style={styles.settingDescription}>Quick unlock with {biometricType.toLowerCase()}</Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
              thumbColor={biometricEnabled ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={handleExportWallet}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>📝</Text>
              <View>
                <Text style={styles.settingLabel}>Backup Recovery Phrase</Text>
                <Text style={styles.settingDescription}>Export your 12-word phrase</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('ChangePIN')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔢</Text>
              <View>
                <Text style={styles.settingLabel}>Change PIN</Text>
                <Text style={styles.settingDescription}>Update your 6-digit PIN</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingDescription}>Transaction alerts</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
              thumbColor={notificationsEnabled ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('TransactionHistory')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>📊</Text>
              <View>
                <Text style={styles.settingLabel}>Transaction History</Text>
                <Text style={styles.settingDescription}>View all transactions</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingRow} onPress={handleSupport}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>💬</Text>
              <View>
                <Text style={styles.settingLabel}>Help & Support</Text>
                <Text style={styles.settingDescription}>Contact our team</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={handlePrivacyPolicy}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔒</Text>
              <View>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={handleTerms}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>📄</Text>
              <View>
                <Text style={styles.settingLabel}>Terms of Service</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonIcon}>👋</Text>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.signOutHint}>
          Your wallet will be safe. Sign back in anytime.
        </Text>
      </View>

      {/* About */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>CryptoPay v1.0.0</Text>
        <Text style={styles.footerSubtext}>Built with ❤️ for Web3</Text>
        <Text style={styles.footerSubtext}>Polygon Amoy Testnet</Text>
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
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  addressLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  address: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  addressActionIcon: {
    fontSize: 16,
  },
  addressActionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight + '20',
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
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
  settingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  settingIcon: {
    fontSize: 24,
  },
  settingLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingArrow: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorBg,
    borderWidth: 2,
    borderColor: COLORS.error,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  dangerButtonIcon: {
    fontSize: 20,
  },
  dangerButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.error,
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
  merchantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    ...SHADOWS.md,
  },
  merchantHeader: {
    marginBottom: SPACING.md,
  },
  merchantBadge: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  merchantName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  merchantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  merchantButtonIcon: {
    fontSize: 20,
  },
  merchantButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  merchantPromo: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  merchantPromoIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  merchantPromoTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  merchantPromoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  merchantPromoButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  merchantPromoButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Network Card Styles
  networkCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  networkHeader: {
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  networkStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  networkDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  networkStatusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
  },
  networkDetails: {
    padding: SPACING.lg,
  },
  networkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  networkRowLast: {
    borderBottomWidth: 0,
  },
  networkLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  networkValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // Sign Out Button Styles
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '15',
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  signOutButtonIcon: {
    fontSize: 20,
  },
  signOutButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.error,
  },
  signOutHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
