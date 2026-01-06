import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { hasWallet } from '../services/wallet';
import { COLORS, SPACING, FONT_SIZES } from '../constants/config';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  navigation: any;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  useEffect(() => {
    checkWalletAndNavigate();
  }, [navigation]);

  const checkWalletAndNavigate = async () => {
    try {
      // Wait 2 seconds to show splash
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if user has already created wallet
      const walletExists = await hasWallet();
      console.log('Wallet exists:', walletExists);
      
      if (walletExists) {
        // User has wallet, go to login
        navigation.replace('Login');
      } else {
        // New user, show onboarding
        navigation.replace('Onboarding');
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
      // On error, assume new user
      navigation.replace('Onboarding');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>₿</Text>
        </View>
        <Text style={styles.title}>CryptoPay</Text>
        <Text style={styles.subtitle}>Pay like UPI, powered by Web3</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  logoText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.card,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.card + 'CC',
  },
});
