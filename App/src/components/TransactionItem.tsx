import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface Transaction {
  id: string;
  merchant_name?: string;
  to_address?: string;
  from_address?: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
}

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  currentWallet?: string;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  currentWallet,
}) => {
  const isReceived = transaction.to_address?.toLowerCase() === currentWallet?.toLowerCase();
  const statusConfig = getStatusConfig(transaction.status);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[
        styles.iconContainer,
        { backgroundColor: isReceived ? COLORS.successBg : COLORS.infoBg }
      ]}>
        <Text style={styles.iconText}>
          {isReceived ? '↓' : '↑'}
        </Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.row}>
          <Text style={styles.title}>
            {transaction.merchant_name || formatAddress(
              isReceived ? transaction.from_address! : transaction.to_address!
            )}
          </Text>
          <Text style={[
            styles.amount,
            { color: isReceived ? COLORS.success : COLORS.text }
          ]}>
            {isReceived ? '+' : '-'}{transaction.amount} PAY
          </Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.date}>{formatDate(transaction.created_at)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.icon} {statusConfig.label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'success':
      return {
        label: 'Completed',
        icon: '✓',
        color: COLORS.successDark,
        bg: COLORS.successBg,
      };
    case 'pending':
      return {
        label: 'Pending',
        icon: '⏳',
        color: COLORS.warningDark,
        bg: COLORS.warningBg,
      };
    case 'failed':
      return {
        label: 'Failed',
        icon: '✕',
        color: COLORS.errorDark,
        bg: COLORS.errorBg,
      };
    default:
      return {
        label: 'Unknown',
        icon: '?',
        color: COLORS.textSecondary,
        bg: COLORS.background,
      };
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  details: {
    flex: 1,
    gap: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  amount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
  date: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
});
