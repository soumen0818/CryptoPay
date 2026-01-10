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
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { isMerchant, getMerchantProfile } from '../services/merchant';
import { supabase } from '../services/supabase';
import { isBiometricAvailable, getBiometricType } from '../utils/biometric';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, BLOCKCHAIN_CONFIG } from '../constants/theme';
import { Card, Button } from '../components';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [merchantStatus, setMerchantStatus] = useState<boolean>(false);
  const [businessName, setBusinessName] = useState<string>('');
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);

  useEffect(() => {
    loadWalletAddress();
    loadDisplayName();
    checkMerchantStatus();
    loadSettings();
    loadProfilePhoto();
  }, []);

  const loadWalletAddress = async () => {
    const address = await AsyncStorage.getItem('wallet_address');
    if (address) {
      setWalletAddress(address);
    }
  };

  const loadDisplayName = async () => {
    try {
      const address = await AsyncStorage.getItem('wallet_address');
      if (!address) return;

      // Fetch display name from database first
      const { data, error } = await supabase
        .from('users')
        .select('display_name')
        .eq('wallet_address', address)
        .single();

      if (!error && data?.display_name) {
        setDisplayName(data.display_name);
        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem('display_name', data.display_name);
      } else {
        // Fallback to local storage
        const localName = await AsyncStorage.getItem('display_name');
        if (localName) {
          setDisplayName(localName);
        }
      }
    } catch (error) {
      console.error('Error loading display name:', error);
      // Fallback to AsyncStorage
      const localName = await AsyncStorage.getItem('display_name');
      if (localName) {
        setDisplayName(localName);
      }
    }
  };

  const loadSettings = async () => {
    const biometricSetting = await AsyncStorage.getItem('biometric_enabled');
    setBiometricEnabled(biometricSetting === 'true');
    
    const available = await isBiometricAvailable();
    if (available) {
      const type = await getBiometricType();
      setBiometricType(type);
    }
    
    const notifSetting = await AsyncStorage.getItem('notifications_enabled');
    setNotificationsEnabled(notifSetting !== 'false');
  };

  const loadProfilePhoto = async () => {
    try {
      const address = await AsyncStorage.getItem('wallet_address');
      if (!address) return;

      // Fetch profile photo URL from database
      const { data, error } = await supabase
        .from('users')
        .select('profile_photo_url')
        .eq('wallet_address', address)
        .single();

      if (!error && data?.profile_photo_url) {
        setProfilePhoto(data.profile_photo_url);
      } else {
        // Fallback to local storage for backwards compatibility
        const localPhoto = await AsyncStorage.getItem('profile_photo');
        if (localPhoto) {
          setProfilePhoto(localPhoto);
        }
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
    }
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

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        // Show uploading state
        Alert.alert('Uploading', 'Uploading your profile photo...');
        
        // Upload to Supabase Storage
        const uploaded = await uploadProfilePhoto(photoUri);
        
        if (uploaded) {
          setProfilePhoto(uploaded);
          Alert.alert('Success', 'Profile photo updated and synced to cloud!');
        } else {
          // Fallback to local storage if upload fails
          setProfilePhoto(photoUri);
          await AsyncStorage.setItem('profile_photo', photoUri);
          Alert.alert('Saved Locally', 'Photo saved on device. Cloud sync unavailable.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile photo');
    }
  };

  const uploadProfilePhoto = async (photoUri: string): Promise<string | null> => {
    try {
      const address = await AsyncStorage.getItem('wallet_address');
      if (!address) {
        console.error('No wallet address found');
        return null;
      }

      console.log('Starting upload for:', photoUri);

      // Read file as base64 for React Native compatibility
      const base64 = await fetch(photoUri)
        .then(res => res.blob())
        .then(blob => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              // Remove data:image/xxx;base64, prefix
              resolve(base64data.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        });

      // Create unique filename
      const fileExt = photoUri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${address.substring(0, 8)}_${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      console.log('Uploading to path:', filePath);

      // Convert base64 to array buffer for upload
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, bytes.buffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        console.error('Error message:', uploadError.message);
        console.error('Error name:', uploadError.name);
        return null;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('Public URL:', publicUrl);

      // Update database with photo URL
      const { error: dbError } = await supabase
        .from('users')
        .update({ profile_photo_url: publicUrl })
        .eq('wallet_address', address);

      if (dbError) {
        console.error('Database update error:', dbError);
        // Still return URL even if DB update fails
      }

      // Also save locally for offline access
      await AsyncStorage.setItem('profile_photo', publicUrl);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return null;
    }
  };

  const handleCopyAddress = async () => {
    await Clipboard.setStringAsync(walletAddress);
    // Silent copy - no alert
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

  const handleShowQRCode = () => {
    setShowQRCode(!showQRCode);
  };

  const handleShareQRCode = async () => {
    try {
      await Share.share({
        message: `Send me money on CryptoPay!\n\nMy wallet: ${walletAddress}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
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
            await AsyncStorage.removeItem('pin_hash');
            await AsyncStorage.removeItem('biometric_enabled');
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('phone_verified');
            await AsyncStorage.removeItem('phone_number');
            
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.profilePhotoContainer} onPress={handlePickImage}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.defaultAvatarText}>
                {walletAddress.substring(2, 4).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.editIconContainer}>
            <Text style={styles.editIcon}>📷</Text>
          </View>
        </TouchableOpacity>
        
        {displayName && <Text style={styles.profileName}>{displayName}</Text>}
        <Text style={styles.profileAddress}>
          {walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}
        </Text>
        
        <View style={styles.profileActions}>
          <TouchableOpacity style={styles.profileActionButton} onPress={handleCopyAddress}>
            <Text style={styles.profileActionIcon}>📋</Text>
            <Text style={styles.profileActionText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileActionButton} onPress={handleShareAddress}>
            <Text style={styles.profileActionIcon}>📤</Text>
            <Text style={styles.profileActionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Code Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.qrCodeCard}
          onPress={handleShowQRCode}
          activeOpacity={0.8}
        >
          <View style={styles.qrCodeHeader}>
            <View style={styles.qrCodeHeaderLeft}>
              <Text style={styles.qrCodeIcon}>📱</Text>
              <Text style={styles.qrCodeTitle}>My QR Code</Text>
            </View>
            <Text style={styles.qrCodeToggle}>{showQRCode ? '▼' : '▶'}</Text>
          </View>
          
          {showQRCode && (
            <View style={styles.qrCodeContent}>
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={JSON.stringify({
                    type: 'cryptopay',
                    merchant: walletAddress,
                    amount: '0',
                    name: displayName || 'CryptoPay User',
                    note: '',
                  })}
                  size={200}
                  backgroundColor="white"
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.qrCodeDescription}>
                Let others scan this QR code to send you money
              </Text>
              <TouchableOpacity style={styles.shareQRButton} onPress={handleShareQRCode}>
                <Text style={styles.shareQRButtonText}>📤 Share QR Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Merchant Section */}
      {merchantStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Merchant</Text>
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
        </View>
      )}

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security & Privacy</Text>
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

          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={handleViewOnExplorer}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔍</Text>
              <View>
                <Text style={styles.settingLabel}>View on Explorer</Text>
                <Text style={styles.settingDescription}>Blockchain explorer</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* More Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More</Text>
        <View style={styles.settingsCard}>
          {!merchantStatus && (
            <>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => navigation.navigate('MerchantRegistration')}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingIcon}>🏪</Text>
                  <View>
                    <Text style={styles.settingLabel}>Become a Merchant</Text>
                    <Text style={styles.settingDescription}>Accept payments</Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>→</Text>
              </TouchableOpacity>
              <View style={styles.settingDivider} />
            </>
          )}
          
          <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Coming Soon', 'Help & Support will be available soon.')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>💬</Text>
              <View>
                <Text style={styles.settingLabel}>Help & Support</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Privacy Policy', 'Coming soon')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔒</Text>
              <View>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonIcon}>👋</Text>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.signOutHint}>
          Your wallet will be safe. Sign back in anytime.
        </Text>
      </View>

      {/* Footer */}
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
    paddingTop: Platform.OS === 'ios' ? 10 : SPACING.md,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  profilePhotoContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryDark,
  },
  defaultAvatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  editIcon: {
    fontSize: 14,
  },
  profileName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  profileAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: SPACING.md,
  },
  profileActions: {
    flexDirection: 'row',
    marginHorizontal: -SPACING.xs,
  },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.xs,
    ...SHADOWS.sm,
  },
  profileActionIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  profileActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
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
  qrCodeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  qrCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrCodeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrCodeIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  qrCodeTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  qrCodeToggle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  qrCodeContent: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  qrCodeWrapper: {
    padding: SPACING.lg,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.md,
  },
  qrCodeDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  shareQRButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  shareQRButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textInverse,
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
  },
  merchantButtonIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  merchantButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
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
  },
  settingIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
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
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '15',
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  signOutButtonIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
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
