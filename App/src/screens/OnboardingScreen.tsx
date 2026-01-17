import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

const FONT_SIZES = TYPOGRAPHY.sizes;
const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

interface OnboardingScreenProps {
  navigation: any;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const handleGetStarted = () => {
    navigation.navigate('PhoneVerification');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/cpay_logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>C-Pay</Text>
          <Text style={styles.subtitle}>Pay with crypto, simple as UPI</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem 
            icon="🔒" 
            title="Secure & Private" 
            description="Your wallet, your keys. All data encrypted locally."
          />
          <FeatureItem 
            icon="⚡" 
            title="Instant Payments" 
            description="Scan QR, tap pay. Transactions in seconds."
          />
          <FeatureItem 
            icon="🆓" 
            title="Gasless Payments" 
            description="We cover network fees. You just send money in ₹."
          />
          <FeatureItem 
            icon="📱" 
            title="Simple UX" 
            description="Scan, authenticate, done. Just like UPI."
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            ℹ️ Testnet • No real money
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <View style={{ flex: 1 }}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: isSmallDevice ? SPACING.lg : SPACING.xl,
    paddingBottom: SPACING.lg,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? SPACING.md : SPACING.lg,
  },
  logo: {
    width: isSmallDevice ? 80 : 100,
    height: isSmallDevice ? 80 : 100,
    borderRadius: isSmallDevice ? 40 : 50,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: isSmallDevice ? FONT_SIZES.xl : FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: isSmallDevice ? FONT_SIZES.xs : FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  featuresContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: isSmallDevice ? SPACING.md : SPACING.lg,
    marginBottom: isSmallDevice ? SPACING.sm : SPACING.md,
    ...SHADOWS.sm,
  },
  featureIcon: {
    fontSize: isSmallDevice ? 26 : 32,
    marginRight: SPACING.md,
  },
  featureTitle: {
    fontSize: isSmallDevice ? FONT_SIZES.sm : FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: isSmallDevice ? FONT_SIZES.xs : FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: isSmallDevice ? 16 : 18,
  },
  footer: {
    alignItems: 'center',
    marginTop: isSmallDevice ? SPACING.md : SPACING.lg,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: isSmallDevice ? SPACING.md : SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  buttonText: {
    color: COLORS.card,
    fontSize: isSmallDevice ? FONT_SIZES.md : FONT_SIZES.lg,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
