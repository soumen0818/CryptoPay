import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
  Image,
  Share,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { isMerchant, getMerchantProfile, merchantEvents } from '../services/merchant';
import { supabase } from '../services/supabase';
import { isBiometricAvailable, getBiometricType } from '../utils/biometric';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, BLOCKCHAIN_CONFIG } from '../constants/theme';
import { Card, Button } from '../components';
import { AlertManager } from '../utils/alert';
import { getCurrentUserCPayId } from '../utils/cpayId';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [cpayId, setCpayId] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [merchantStatus, setMerchantStatus] = useState<boolean>(false);
  const [businessName, setBusinessName] = useState<string>('');
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const qrCodeRef = useRef<any>(null);

  useEffect(() => {
    loadWalletAddress();
    loadCPayId();
    loadDisplayName();
    checkMerchantStatus();
    loadSettings();
    loadProfilePhoto();
    
    // Listen for merchant registration events (real-time updates)
    const merchantListener = () => {
      console.log('📡 Received merchantRegistered event, refreshing status...');
      checkMerchantStatus();
    };
    
    merchantEvents.on('merchantRegistered', merchantListener);
    console.log('🎯 Subscribed to merchantRegistered events');
    
    // Cleanup on unmount
    return () => {
      merchantEvents.off('merchantRegistered', merchantListener);
      console.log('🚫 Unsubscribed from merchantRegistered events');
    };
  }, []);

  // Refresh all profile data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 ProfileScreen focused - refreshing all data');
      loadCPayId();
      loadDisplayName();
      checkMerchantStatus();
      loadProfilePhoto();
      loadSettings();
    }, [])
  );

  const loadWalletAddress = async () => {
    const address = await AsyncStorage.getItem('wallet_address');
    if (address) {
      setWalletAddress(address);
    }
  };

  const loadCPayId = async () => {
    const id = await getCurrentUserCPayId();
    if (id) {
      setCpayId(id);
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
        AlertManager.alert('Permission Required', 'Please allow access to your photos to change your profile picture.');
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
        AlertManager.alert('Uploading', 'Uploading your profile photo...');
        
        // Upload to Supabase Storage
        const uploaded = await uploadProfilePhoto(photoUri);
        
        if (uploaded) {
          setProfilePhoto(uploaded);
          AlertManager.alert('Success', 'Profile photo updated and synced to cloud!');
        } else {
          // Fallback to local storage if upload fails
          setProfilePhoto(photoUri);
          await AsyncStorage.setItem('profile_photo', photoUri);
          AlertManager.alert('Saved Locally', 'Photo saved on device. Cloud sync unavailable.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      AlertManager.alert('Error', 'Failed to update profile photo');
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
    await Clipboard.setStringAsync(cpayId || walletAddress);
    // Silent copy - no alert
  };

  const handleShareAddress = async () => {
    try {
      await Share.share({
        message: `My C-Pay ID:\n${cpayId || walletAddress}`,
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
      if (qrCodeRef.current) {
        // Capture QR code as image
        const uri = await qrCodeRef.current.capture();
        
        const message = 'Scan this QR code to send me money on C-Pay!';
        
        // Use expo-sharing for reliable image sharing on both platforms
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: message,
            UTI: 'public.png', // For iOS
          });
        } else {
          AlertManager.alert('Not Available', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      AlertManager.alert('Error', 'Failed to share QR code');
    }
  };

  const handleDownloadQRCode = async () => {
    try {
      // Request media library permissions (write only, not read)
      const { status } = await MediaLibrary.requestPermissionsAsync(false);
      
      if (status !== 'granted') {
        AlertManager.alert('Permission Required', 'Please allow access to save the QR code to your gallery.');
        return;
      }

      if (qrCodeRef.current) {
        // Capture QR code as image
        const uri = await qrCodeRef.current.capture();
        
        // Save directly to media library
        const asset = await MediaLibrary.createAssetAsync(uri);
        
        AlertManager.alert('Success', 'QR code saved to gallery!');
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
      AlertManager.alert('Error', 'Failed to save QR code');
    }
  };

  const handleSignOut = () => {
    AlertManager.alert(
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
            
            AlertManager.alert('Signed Out', 'You have been signed out successfully.', [
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
        AlertManager.alert('Not Available', `${biometricType} is not set up on this device. Please enable it in your device settings.`);
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
          <Image 
            source={profilePhoto ? { uri: profilePhoto } : require('../../assets/default-profile-image-cryptopay.png')} 
            style={styles.profilePhoto} 
          />
          <View style={styles.editIconContainer}>
            <Text style={styles.editIcon}>📷</Text>
          </View>
        </TouchableOpacity>
        
        {displayName && <Text style={styles.profileName}>{displayName}</Text>}
        <TouchableOpacity 
          style={styles.addressContainer}
          onPress={handleCopyAddress}
          activeOpacity={0.7}
        >
          <Text style={styles.profileAddress}>
            {cpayId || `${walletAddress.substring(0, 10)}...${walletAddress.substring(walletAddress.length - 8)}`}
          </Text>
          <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
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
              <ViewShot ref={qrCodeRef} options={{ format: 'png', quality: 1.0 }}>
                <View style={styles.shareableQRCard}>
                  {/* Header with Logo */}
                  <View style={styles.shareCardHeader}>
                    <Image 
                      source={require('../../assets/cpay_logo.png')} 
                      style={styles.shareCardLogo}
                      resizeMode="contain"
                    />
                    <Text style={styles.shareCardTitle}>C-Pay</Text>
                  </View>
                  
                  {/* Profile Section */}
                  <View style={styles.shareCardProfile}>
                    <Image 
                      source={profilePhoto ? { uri: profilePhoto } : require('../../assets/default-profile-image-cryptopay.png')} 
                      style={styles.shareCardProfilePhoto} 
                    />
                    {displayName && <Text style={styles.shareCardName}>{displayName}</Text>}
                    <Text style={styles.shareCardAddress}>
                      {cpayId || `${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}`}
                    </Text>
                  </View>
                  
                  {/* QR Code */}
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={JSON.stringify({
                        type: 'cryptopay',
                        merchant: walletAddress,
                        amount: '0',
                        name: displayName || 'C-Pay User',
                        note: '',
                      })}
                      size={220}
                      backgroundColor="white"
                      color={COLORS.primary}
                      logo={require('../../assets/cpay_logo.png')}
                      logoSize={45}
                      logoBackgroundColor="white"
                      logoMargin={2}
                    />
                  </View>
                  
                  {/* Footer */}
                  <View style={styles.shareCardFooter}>
                    <Text style={styles.shareCardFooterText}>Scan to send money</Text>
                  </View>
                </View>
              </ViewShot>
              <Text style={styles.qrCodeDescription}>
                Let others scan this QR code to send you money
              </Text>
              
              {/* Action Buttons */}
              <View style={styles.qrActionButtons}>
                <TouchableOpacity style={styles.qrActionButton} onPress={handleDownloadQRCode}>
                  <Ionicons name="download-outline" size={20} color={COLORS.text} />
                  <Text style={styles.qrActionButtonText}>Download</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.qrActionButton, styles.qrShareButton]} onPress={handleShareQRCode}>
                  <Ionicons name="share-social-outline" size={20} color={COLORS.textInverse} />
                  <Text style={[styles.qrActionButtonText, styles.shareButtonText]}>Share</Text>
                </TouchableOpacity>
              </View>
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
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingRow} onPress={() => AlertManager.alert('Coming Soon', 'Backup wallet feature will be available soon.')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>💾</Text>
              <View>
                <Text style={styles.settingLabel}>Backup Wallet</Text>
                <Text style={styles.settingDescription}>Export private key</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={() => AlertManager.alert('Coming Soon', 'Recovery phrase feature will be available soon.')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔑</Text>
              <View>
                <Text style={styles.settingLabel}>Recovery Phrase</Text>
                <Text style={styles.settingDescription}>View seed phrase</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={() => AlertManager.alert('Coming Soon', 'Transaction limits feature will be available soon.')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>⚖️</Text>
              <View>
                <Text style={styles.settingLabel}>Transaction Limits</Text>
                <Text style={styles.settingDescription}>Daily & monthly limits</Text>
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
          
          <TouchableOpacity style={styles.settingRow} onPress={() => AlertManager.alert('Coming Soon', 'Help & Support will be available soon.')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>💬</Text>
              <View>
                <Text style={styles.settingLabel}>Help & Support</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={() => AlertManager.alert('Privacy Policy', 'Coming soon')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔒</Text>
              <View>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={() => AlertManager.alert('Terms of Service', 'Coming soon')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>📄</Text>
              <View>
                <Text style={styles.settingLabel}>Terms of Service</Text>
              </View>
            </View>
            <Text style={styles.settingArrow}>→</Text>
          </TouchableOpacity>
          
          <View style={styles.settingDivider} />
          
          <TouchableOpacity style={styles.settingRow} onPress={() => AlertManager.alert('About C-Pay', 'Version 1.0.0\n\nC-Pay is a modern INR-first digital payment app built on blockchain technology.\n\nNetwork: Polygon Amoy Testnet\n\n© 2026 C-Pay')}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <View>
                <Text style={styles.settingLabel}>About</Text>
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
        <Text style={styles.footerText}>C-Pay v1.0.0</Text>
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
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  profileAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
    marginRight: SPACING.sm,
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
  shareableQRCard: {
    backgroundColor: '#ffffff',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    width: 320,
  },
  shareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  shareCardLogo: {
    width: 40,
    height: 40,
    marginRight: SPACING.sm,
  },
  shareCardTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  shareCardProfile: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  shareCardProfilePhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  shareCardName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  shareCardAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  shareCardFooter: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  shareCardFooterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
  qrActionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    paddingHorizontal: SPACING.md,
  },
  qrActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  qrShareButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  qrActionButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  shareButtonText: {
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
