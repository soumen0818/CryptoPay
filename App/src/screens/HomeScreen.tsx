import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import { LinearGradient } from 'expo-linear-gradient';
import { getWallet } from '../services/wallet';
import { getProvider, getTokenContract } from '../services/blockchain';
import { startTransactionPolling, stopTransactionPolling } from '../services/transactionMonitor';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { Card, Button, LoadingSpinner } from '../components';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [balance, setBalance] = useState<string>('0');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    loadWalletData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Start background polling for pending transactions
    startTransactionPolling(15000); // Poll every 15 seconds
    
    // Cleanup on unmount
    return () => {
      stopTransactionPolling();
    };
  }, []);

  const loadWalletData = async () => {
    try {
      const address = await AsyncStorage.getItem('wallet_address');
      if (address) {
        setWalletAddress(address);
        await loadBalance(address);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async (address: string) => {
    try {
      const provider = getProvider();
      const tokenContract = getTokenContract(provider);
      
      const balance = await tokenContract.balanceOf(address);
      const formatted = ethers.formatUnits(balance, 18);
      setBalance(parseFloat(formatted).toFixed(2));
    } catch (error) {
      console.error('Error loading balance:', error);
      setBalance('0.00');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBalance(walletAddress);
    setRefreshing(false);
  };

  const handleRequestTokens = async () => {
    if (!walletAddress) return;

    Alert.alert(
      'Request Tokens',
      'Get free PAY tokens from the faucet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              setLoading(true);
              const provider = getProvider();
              const tokenContract = getTokenContract(provider);

              // Check cooldown
              const canClaim = await tokenContract.canClaimFaucet(walletAddress);
              if (!canClaim) {
                const timeLeft = await tokenContract.timeUntilNextClaim(walletAddress);
                const hours = Math.floor(Number(timeLeft) / 3600);
                Alert.alert('Cooldown Active', `Wait ${hours} hours before claiming again`);
                return;
              }

              Alert.alert('Coming Soon', 'Faucet claim will be implemented with transaction signing');
            } catch (error: any) {
              console.error('Faucet error:', error);
              Alert.alert('Error', error.message || 'Failed to request tokens');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleScanToPay = () => {
    navigation.navigate('Scan');
  };

  if (loading && !walletAddress) {
    return (
      <LoadingSpinner fullScreen text="Loading your wallet..." />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Balance Card with Gradient */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          {/* Decorative circles */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          
          {/* Card Header */}
          <View style={styles.balanceHeader}>
            <View style={styles.balanceLabelContainer}>
              <Text style={styles.balanceIcon}>💰</Text>
              <Text style={styles.balanceLabel}>Total Balance</Text>
            </View>
            <View style={styles.networkBadge}>
              <View style={styles.networkDot} />
              <Text style={styles.networkText}>Polygon</Text>
            </View>
          </View>
          
          {/* Balance Amount */}
          <View style={styles.balanceAmountContainer}>
            <Text style={styles.balanceAmount}>{balance}</Text>
            <Text style={styles.balanceCurrency}>PAY</Text>
          </View>
          
          {/* Balance in INR (mock) */}
          <Text style={styles.balanceUsd}>≈ ₹{(parseFloat(balance) * 0.85).toFixed(2)} INR</Text>
          
          {/* Wallet Address */}
          <View style={styles.walletAddressContainer}>
            <TouchableOpacity 
              style={styles.walletAddressBadge}
              onPress={() => {
                Alert.alert('Wallet Address', walletAddress, [
                  { text: 'Copy', onPress: () => {} },
                  { text: 'Close' }
                ]);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.walletIcon}>🔗</Text>
              <Text style={styles.walletAddressText}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Text>
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleScanToPay}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: COLORS.primaryLight + '20' }]}>
            <Text style={styles.actionEmoji}>📷</Text>
          </View>
          <Text style={styles.actionTitle}>Scan QR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('TransactionHistory')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: COLORS.info + '20' }]}>
            <Text style={styles.actionEmoji}>📊</Text>
          </View>
          <Text style={styles.actionTitle}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleRequestTokens}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: COLORS.success + '20' }]}>
            <Text style={styles.actionEmoji}>💰</Text>
          </View>
          <Text style={styles.actionTitle}>Faucet</Text>
        </TouchableOpacity>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('MerchantRegistration')}
          activeOpacity={0.7}
        >
          <View style={styles.featureContent}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Text style={styles.featureEmoji}>🏪</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Become a Merchant</Text>
              <Text style={styles.featureDescription}>
                Accept payments for your business
              </Text>
            </View>
          </View>
          <Text style={styles.featureArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => Alert.alert('Coming Soon', 'Refer friends and earn rewards!')}
          activeOpacity={0.7}
        >
          <View style={styles.featureContent}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.secondary + '15' }]}>
              <Text style={styles.featureEmoji}>🎁</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Refer & Earn</Text>
              <Text style={styles.featureDescription}>
                Share CryptoPay with friends
              </Text>
            </View>
          </View>
          <Text style={styles.featureArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerIcon}>ℹ️</Text>
        <View style={styles.infoBannerContent}>
          <Text style={styles.infoBannerTitle}>Running on Testnet</Text>
          <Text style={styles.infoBannerText}>
            Polygon Amoy • Free to use • No real money
          </Text>
        </View>
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
    paddingTop: SPACING.md,
  },
  balanceCard: {
    borderRadius: 24,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.lg,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  balanceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  balanceIcon: {
    fontSize: 18,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    opacity: 0.9,
    fontWeight: '600',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D68F',
  },
  networkText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.textInverse,
    letterSpacing: -1,
  },
  balanceCurrency: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textInverse,
    opacity: 0.85,
    fontWeight: '700',
  },
  balanceUsd: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    opacity: 0.7,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  walletAddressContainer: {
    alignItems: 'flex-start',
  },
  walletAddressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  walletIcon: {
    fontSize: 12,
  },
  walletAddressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textInverse,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  copyIcon: {
    fontSize: 12,
    opacity: 0.8,
  },

  // Sections
  actionsSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },

  // Features Section
  featuresSection: {
    marginBottom: SPACING.lg,
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  featureArrow: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textTertiary,
    marginLeft: SPACING.sm,
  },

  // Info Banner
  infoBanner: {
    backgroundColor: COLORS.infoBg,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBannerIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.infoDark,
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
