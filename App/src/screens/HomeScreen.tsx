import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Platform,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getWallet } from '../services/wallet';
import { getProvider, getTokenContract, claimFromFaucet } from '../services/blockchain';
import { startTransactionPolling, stopTransactionPolling } from '../services/transactionMonitor';
import { authenticateWithBiometric, authenticateWithPIN } from '../utils/biometric';
import { getTransactions, Transaction } from '../services/storage';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { convertPAYtoINR } from '../utils/currency';
import { Card, Button, LoadingSpinner, EmptyState, TransactionItem, TransactionDetailModal } from '../components';
import type { TransactionDetail } from '../components/TransactionDetailModal';
import { AlertManager } from '../utils/alert';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [balance, setBalance] = useState<string>('0');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
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

  // Refresh transactions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 HomeScreen focused - refreshing transactions');
      loadTransactions();
      if (walletAddress) {
        loadBalance(walletAddress);
      }
    }, [walletAddress])
  );

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

  const loadTransactions = async () => {
    try {
      const txs = await getTransactions();
      // Get last 5 transactions
      setTransactions(txs.slice(0, 10));
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadBalance(walletAddress),
      loadTransactions(),
    ]);
    setRefreshing(false);
  };

  const handleSendMoney = () => {
    navigation.navigate('SendMoney');
  };

  const handleRequestTokens = async () => {
    if (!walletAddress) return;

    AlertManager.alert(
      'Request Tokens',
      'Get 100 free PAY tokens from the faucet?\n\n⏱️ One claim every 24 hours\n✨ Completely gasless!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim Tokens',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Try biometric first, fallback to PIN if not available
              let authenticated = await authenticateWithBiometric();
              
              if (!authenticated) {
                // Biometric not available or failed, use PIN
                authenticated = await authenticateWithPIN();
              }
              
              if (!authenticated) {
                setLoading(false);
                return; // User cancelled auth - no need to show alert
              }

              const storedPin = await AsyncStorage.getItem('user_pin');
              if (!storedPin) {
                setLoading(false);
                AlertManager.alert('PIN Required', 'Please sign in again to claim tokens.', undefined, { type: 'warning' });
                return;
              }

              let wallet = await getWallet(storedPin);
              if (!wallet) {
                setLoading(false);
                AlertManager.alert('Authentication Failed', 'Incorrect PIN. Please try signing in again.', undefined, { type: 'error' });
                await AsyncStorage.removeItem('user_pin');
                return;
              }

              wallet = wallet.connect(getProvider());
              const txHash = await claimFromFaucet(wallet);
              
              // Success - refresh balance automatically after 5 seconds
              setTimeout(() => loadBalance(walletAddress), 5000);
              
              AlertManager.alert(
                'Success!',
                '100 PAY tokens are being sent to your wallet. Your balance will update in a few seconds.',
                undefined,
                { type: 'success' }
              );
            } catch (error: any) {
              console.error('Faucet error:', error);
              
              let errorMessage = error.message || 'Failed to claim tokens';
              
              if (error.message?.includes('wait 24 hours')) {
                errorMessage = 'Please wait 24 hours between faucet claims.';
              } else if (error.message?.includes('network') || error.message?.includes('connection')) {
                errorMessage = 'Please check your internet connection and try again.';
              }
              
              AlertManager.alert('Faucet Error', errorMessage, undefined, { type: 'error' });
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { type: 'info' }
    );
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
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          
          <View style={styles.balanceHeader}>
            <View style={styles.balanceLabelContainer}>
              <Text style={styles.balanceIcon}>💰</Text>
              <Text style={styles.balanceLabel}>Total Balance</Text>
            </View>
          </View>
          
          <View style={styles.balanceAmountContainer}>
            <Text style={styles.balanceAmount}>{balance}</Text>
            <Text style={styles.balanceCurrency}>PAY</Text>
          </View>
          
          <Text style={styles.balanceUsd}>≈ ₹{convertPAYtoINR(parseFloat(balance)).toFixed(2)} INR</Text>
        </LinearGradient>
      </Animated.View>

      {/* Quick Actions - Updated */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleSendMoney}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: COLORS.primary + '20' }]}>
            <Text style={styles.actionEmoji}>💸</Text>
          </View>
          <Text style={styles.actionTitle}>Send Money</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleRequestTokens}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: COLORS.success + '20' }]}>
            <Text style={styles.actionEmoji}>💰</Text>
          </View>
          <Text style={styles.actionTitle}>Add money</Text>
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
      </View>

      {/* Recent Transactions Section */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {transactions.length === 0 ? (
          <View style={styles.emptyTransactions}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptyDescription}>
              Your transaction history will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map((transaction, index) => (
              <TransactionItem
                key={transaction.tx_hash || index}
                transaction={{
                  ...transaction,
                  id: transaction.id || transaction.tx_hash,
                  created_at: transaction.created_at || new Date().toISOString(),
                }}
                currentWallet={walletAddress}
                onPress={() => {
                  setSelectedTransaction({
                    ...transaction,
                    id: transaction.id || transaction.tx_hash,
                    created_at: transaction.created_at || new Date().toISOString(),
                  });
                  setShowTransactionModal(true);
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerIcon}>ℹ️</Text>
        <View style={styles.infoBannerContent}>
          <Text style={styles.infoBannerTitle}>Development Mode</Text>
          <Text style={styles.infoBannerText}>
            Test environment • Free to use • No real money
          </Text>
        </View>
      </View>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={showTransactionModal}
        transaction={selectedTransaction}
        onClose={() => {
          setShowTransactionModal(false);
          setSelectedTransaction(null);
        }}
        currentWallet={walletAddress}
      />
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
  },
  balanceIcon: {
    marginRight: SPACING.xs,
    fontSize: 18,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    opacity: 0.9,
    fontWeight: '600',
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceAmount: {
    marginRight: SPACING.sm,
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
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.xl,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
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
  transactionsSection: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  transactionsList: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  emptyTransactions: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptyDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
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
