import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Button, LoadingSpinner } from '../components';
import { AlertManager } from '../utils/alert';

interface ProfileSetupScreenProps {
  navigation: any;
  route: any;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ navigation, route }) => {
  const { walletAddress, phoneNumber } = route.params;
  const [fullName, setFullName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      // Request permission - system will show dialog automatically
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        return; // User denied permission - system already showed dialog
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const uploadProfilePhoto = async (photoUri: string, address: string): Promise<string | null> => {
    try {
      console.log('Uploading profile photo...');

      // Read file as base64
      const base64 = await fetch(photoUri)
        .then(res => res.blob())
        .then(blob => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              resolve(base64data.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        });

      const fileExt = photoUri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${address.substring(0, 8)}_${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      // Convert base64 to array buffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, bytes.buffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleComplete = async () => {
    if (!fullName.trim()) {
      AlertManager.alert('Name Required', 'Please enter your full name to continue.', undefined, { type: 'warning' });
      return;
    }

    try {
      setLoading(true);

      let photoUrl = null;

      // Upload photo if provided
      if (profilePhoto) {
        photoUrl = await uploadProfilePhoto(profilePhoto, walletAddress);
        if (!photoUrl) {
          // Save locally if upload fails
          await AsyncStorage.setItem('profile_photo', profilePhoto);
        }
      }

      // Check if phone number is development number
      const devPhoneNumber = process.env.EXPO_PUBLIC_DEV_PHONE || '+911234567890';
      const isDevPhone = phoneNumber === devPhoneNumber;
      
      // Only save phone number if it's not the development number
      const phoneToSave = isDevPhone ? null : phoneNumber;

      // Update user profile in database
      const { error: dbError } = await supabase
        .from('users')
        .update({
          display_name: fullName.trim(),
          phone_number: phoneToSave, // Will be null for dev phone
          profile_photo_url: photoUrl,
        })
        .eq('wallet_address', walletAddress);

      if (dbError) {
        console.error('Database error:', dbError);
        // Continue anyway - save locally
      }

      // Save locally
      await AsyncStorage.setItem('display_name', fullName.trim());
      if (photoUrl) {
        await AsyncStorage.setItem('profile_photo', photoUrl);
      }
      
      // Only save phone locally if it's not dev number
      if (!isDevPhone) {
        await AsyncStorage.setItem('phone_number', phoneNumber);
      }

      // Mark profile as complete
      await AsyncStorage.setItem('profile_complete', 'true');

      // Navigate directly without alert - profile is auto-saved
      navigation.replace('BiometricSetup');
    } catch (error) {
      console.error('Profile setup error:', error);
      AlertManager.alert('Error', 'Failed to save profile. Please try again.', undefined, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Setting up your profile..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerEmoji}>👤</Text>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Just one more step to get started!
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Profile Photo Section */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Profile Photo <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>📷</Text>
                  <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {profilePhoto && (
              <TouchableOpacity
                onPress={() => setProfilePhoto(null)}
                style={styles.removePhotoButton}
              >
                <Text style={styles.removePhotoText}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Full Name Section */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
            />
            <Text style={styles.hint}>
              This name will be visible to merchants and other users
            </Text>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Your Information is Secure</Text>
              <Text style={styles.infoText}>
                Your profile details are encrypted and stored securely. We never share your personal information.
              </Text>
            </View>
          </View>

          <Button
            title="Complete Setup"
            onPress={handleComplete}
            disabled={loading}
          />

          <Text style={styles.footer}>
            By continuing, you agree to our Terms of Service and Privacy Policy
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xl,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textInverse,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textInverse,
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  optional: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  photoPlaceholderText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  removePhotoButton: {
    alignSelf: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  removePhotoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  infoCard: {
    backgroundColor: COLORS.infoBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    marginBottom: SPACING.xl,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.infoDark,
    marginBottom: 2,
  },
  infoText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  footer: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
});
