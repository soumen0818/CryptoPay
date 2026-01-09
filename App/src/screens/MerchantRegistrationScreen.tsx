import React, { useState } from 'react';
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
import { registerAsMerchant } from '../services/merchant';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;

interface MerchantRegistrationScreenProps {
  navigation: any;
}

const CATEGORIES = [
  { value: 'food', label: '🍔 Food & Beverage' },
  { value: 'retail', label: '🛍️ Retail' },
  { value: 'services', label: '⚙️ Services' },
  { value: 'entertainment', label: '🎮 Entertainment' },
  { value: 'education', label: '📚 Education' },
  { value: 'health', label: '💊 Health & Wellness' },
  { value: 'other', label: '📦 Other' },
];

export const MerchantRegistrationScreen: React.FC<
  MerchantRegistrationScreenProps
> = ({ navigation }) => {
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Please enter your business name');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a business category');
      return;
    }

    try {
      setLoading(true);

      // Get wallet address
      const walletAddress = await AsyncStorage.getItem('wallet_address');
      if (!walletAddress) {
        Alert.alert('Error', 'Wallet address not found');
        return;
      }

      // Register as merchant
      const result = await registerAsMerchant({
        business_name: businessName,
        wallet_address: walletAddress,
        description: description || undefined,
        category,
        is_active: true,
      });

      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          'You are now registered as a merchant. You can now create QR codes for your business.',
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('MerchantDashboard'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to register as merchant');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🏪</Text>
          <Text style={styles.title}>Become a Merchant</Text>
          <Text style={styles.subtitle}>
            Accept payments from CryptoPay users
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g., Joe's Coffee Shop"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell customers about your business..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryCard,
                    category === cat.value && styles.categoryCardSelected,
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>What you'll get:</Text>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                Generate unlimited QR codes
              </Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>
                Real-time payment notifications
              </Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>Transaction analytics</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>No monthly fees - FREE forever</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.card} />
            ) : (
              <Text style={styles.buttonText}>Register as Merchant</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
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
    padding: SPACING.lg,
    paddingTop: SPACING.xl * 3,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginVertical: -SPACING.xs,
  },
  categoryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    minWidth: '48%',
    margin: SPACING.xs,
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  categoryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
  },
  features: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  featuresTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureIcon: {
    fontSize: 16,
    color: '#10b981',
    marginRight: SPACING.sm,
  },
  featureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
  backButton: {
    alignItems: 'center',
    padding: SPACING.sm,
  },
  backButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
