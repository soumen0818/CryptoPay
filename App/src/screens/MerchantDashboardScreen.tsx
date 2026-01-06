import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMerchantProfile,
  getMerchantAnalytics,
  getMerchantQRCodes,
  updateQRCodeStatus,
  type MerchantQRCode,
} from '../services/merchant';
import { COLORS, SPACING, FONT_SIZES } from '../constants/config';

interface MerchantDashboardScreenProps {
  navigation: any;
}

export const MerchantDashboardScreen: React.FC<
  MerchantDashboardScreenProps
> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('0');
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [qrCodes, setQRCodes] = useState<MerchantQRCode[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const walletAddress = await AsyncStorage.getItem('wallet_address');
      if (!walletAddress) return;

      // Load merchant profile
      const profile = await getMerchantProfile(walletAddress);
      if (profile) {
        setBusinessName(profile.business_name);
      }

      // Load analytics
      const merchantId = await AsyncStorage.getItem('merchant_id');
      if (merchantId) {
        const analytics = await getMerchantAnalytics(merchantId);
        setTotalRevenue(analytics.totalRevenue);
        setTotalTransactions(analytics.totalTransactions);
        setPendingCount(analytics.pendingTransactions);

        // Load QR codes
        const codes = await getMerchantQRCodes(merchantId);
        setQRCodes(codes);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleToggleQR = async (qrCodeId: string, currentStatus: boolean) => {
    try {
      await updateQRCodeStatus(qrCodeId, !currentStatus);
      // Update local state
      setQRCodes((prev) =>
        prev.map((qr) =>
          qr.id === qrCodeId ? { ...qr, is_active: !currentStatus } : qr
        )
      );
      Alert.alert(
        'Success',
        !currentStatus ? 'QR Code activated' : 'QR Code deactivated'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.businessName}>{businessName}</Text>
      </View>

      {/* Analytics Cards */}
      <View style={styles.analyticsGrid}>
        <View style={[styles.analyticsCard, { backgroundColor: '#10b981' }]}>
          <Text style={styles.analyticsLabel}>Total Revenue</Text>
          <Text style={styles.analyticsValue}>{parseFloat(totalRevenue).toFixed(2)} PAY</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: '#3b82f6' }]}>
          <Text style={styles.analyticsLabel}>Transactions</Text>
          <Text style={styles.analyticsValue}>{totalTransactions}</Text>
        </View>
        <View style={[styles.analyticsCard, { backgroundColor: '#f59e0b' }]}>
          <Text style={styles.analyticsLabel}>Pending</Text>
          <Text style={styles.analyticsValue}>{pendingCount}</Text>
        </View>
      </View>

      {/* QR Codes Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My QR Codes</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('MerchantQRGenerator')}
          >
            <Text style={styles.addButtonText}>+ New QR</Text>
          </TouchableOpacity>
        </View>

        {qrCodes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📱</Text>
            <Text style={styles.emptyText}>No QR codes yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first QR code to start accepting payments
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('MerchantQRGenerator')}
            >
              <Text style={styles.createButtonText}>Create QR Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.qrList}>
            {qrCodes.map((qr) => (
              <View key={qr.id} style={styles.qrCard}>
                <View style={styles.qrCardHeader}>
                  <View style={styles.qrInfo}>
                    <Text style={styles.qrName}>{qr.qr_name}</Text>
                    <Text style={styles.qrAmount}>
                      {qr.amount ? `${qr.amount} PAY` : 'Variable amount'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      qr.is_active
                        ? styles.toggleButtonActive
                        : styles.toggleButtonInactive,
                    ]}
                    onPress={() => qr.id && handleToggleQR(qr.id, qr.is_active ?? false)}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        qr.is_active
                          ? styles.toggleTextActive
                          : styles.toggleTextInactive,
                      ]}
                    >
                      {qr.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.qrStats}>
                  <Text style={styles.qrStat}>
                    📊 {qr.scan_count || 0} scans
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('QRView', { qrCodeId: qr.id })
                    }
                  >
                    <Text style={styles.viewLink}>View →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('TransactionHistory')}
        >
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>View All Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('MerchantSettings')}
        >
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionText}>Merchant Settings</Text>
        </TouchableOpacity>
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
    paddingTop: SPACING.xl * 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  businessName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  analyticsGrid: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  analyticsCard: {
    padding: SPACING.lg,
    borderRadius: 12,
  },
  analyticsLabel: {
    fontSize: FONT_SIZES.sm,
    color: '#fff',
    opacity: 0.9,
  },
  analyticsValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.card,
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  createButtonText: {
    color: COLORS.card,
    fontWeight: '600',
  },
  qrList: {
    gap: SPACING.md,
  },
  qrCard: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  qrCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  qrInfo: {
    flex: 1,
  },
  qrName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  qrAmount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  toggleButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#10b981',
  },
  toggleButtonInactive: {
    backgroundColor: COLORS.border,
  },
  toggleText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  toggleTextInactive: {
    color: COLORS.textSecondary,
  },
  qrStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrStat: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  viewLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  actionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
});
