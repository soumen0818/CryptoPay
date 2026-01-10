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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerAsMerchant } from '../services/merchant';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

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
  { value: 'technology', label: '💻 Technology' },
  { value: 'automotive', label: '🚗 Automotive' },
  { value: 'beauty', label: '💄 Beauty & Salon' },
  { value: 'other', label: '📦 Other' },
];

export const MerchantRegistrationScreen: React.FC<
  MerchantRegistrationScreenProps
> = ({ navigation }) => {
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!businessName.trim()) {
      Alert.alert('Error', 'Please enter your business name');
      return;
    }

    if (!ownerName.trim()) {
      Alert.alert('Error', 'Please enter the owner/contact person name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter a business email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a contact phone number');
      return;
    }

    if (!businessAddress.trim()) {
      Alert.alert('Error', 'Please enter your business address');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a business category');
      return;
    }

    if (category === 'other' && !customCategory.trim()) {
      Alert.alert('Error', 'Please specify your business category');
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

      // Determine final category
      const finalCategory = category === 'other' ? customCategory : category;

      // Register as merchant
      const result = await registerAsMerchant({
        business_name: businessName,
        wallet_address: walletAddress,
        description: description || undefined,
        category: finalCategory,
        owner_name: ownerName,
        email: email,
        phone_number: phoneNumber,
        business_address: businessAddress,
        business_registration_number: businessRegistrationNumber || undefined,
        is_active: true,
      });

      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          'Your merchant application has been submitted. You can now access the merchant dashboard.',
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
      {/* Header with Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButtonTop}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Merchant Registration</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🏪</Text>
          <Text style={styles.title}>Become a Merchant</Text>
          <Text style={styles.subtitle}>
            Fill in your business details to start accepting payments
          </Text>
        </View>

        <View style={styles.form}>
          {/* Business Name */}
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

          {/* Owner/Contact Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Owner/Contact Person *</Text>
            <TextInput
              style={styles.input}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="Full name of owner or manager"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="contact@yourbusiness.com"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+1234567890"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          {/* Business Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={businessAddress}
              onChangeText={setBusinessAddress}
              placeholder="Street address, City, State, ZIP"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Business Registration Number (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Registration Number (Optional)</Text>
            <TextInput
              style={styles.input}
              value={businessRegistrationNumber}
              onChangeText={setBusinessRegistrationNumber}
              placeholder="Tax ID or Business License Number"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Category Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Category *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowCategoryDropdown(true)}
            >
              <Text style={[styles.dropdownText, !category && styles.dropdownPlaceholder]}>
                {category 
                  ? CATEGORIES.find(c => c.value === category)?.label || customCategory
                  : 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Custom Category Input (if "Other" selected) */}
          {category === 'other' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specify Your Category *</Text>
              <TextInput
                style={styles.input}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="e.g., Pet Services, Agriculture, etc."
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          )}

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell customers about your business and services..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={3}
            />
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
        </View>
      </ScrollView>

      {/* Category Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryList}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryOption,
                    category === cat.value && styles.categoryOptionSelected,
                  ]}
                  onPress={() => {
                    setCategory(cat.value);
                    if (cat.value !== 'other') {
                      setCustomCategory('');
                    }
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.categoryOptionText}>{cat.label}</Text>
                  {category === cat.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  backButtonTop: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  scrollContent: {
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
    paddingHorizontal: SPACING.lg,
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
  dropdown: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: COLORS.textSecondary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.card,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryOptionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  categoryOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
  },
});
