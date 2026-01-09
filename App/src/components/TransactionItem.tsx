import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface Transaction {
  id: string;
  merchant_name?: string;
  to_address?: string;
  from_address?: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  // Phase 2: Invisible Rail - simplified status for UI
  user_visible_status?: 'success' | 'failed';
  internal_status?: 'processing' | 'submitted' | 'confirmed' | 'failed';
  failure_reason?: string;
  created_at: string;
}

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  currentWallet?: string;
}

// Helper function to get status configuration
const getStatusConfig = (status: string, internalStatus?: string) => {
  // Phase 2: Invisible Rail - Simplified status labels (no blockchain jargon)
  switch (status) {
    case 'success':
      // Show different text based on internal status
      if (internalStatus === 'confirmed') {
        return {
          label: 'Completed',
          icon: '✓',
          color: COLORS.successDark,
          bg: COLORS.successBg,
        };
      } else if (internalStatus === 'submitted' || internalStatus === 'processing') {
        return {
          label: 'Processing',
          icon: '⏳',
          color: COLORS.warningDark,
          bg: COLORS.warningBg,
        };
      }
      return {
        label: 'Completed',
        icon: '✓',
        color: COLORS.successDark,
        bg: COLORS.successBg,
      };
    case 'pending':
      return {
        label: 'Processing', // Changed from "Pending" to "Processing"
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

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  currentWallet,
}) => {
  const isReceived = transaction.to_address?.toLowerCase() === currentWallet?.toLowerCase();
  
  // Phase 2: Use user_visible_status if available, fallback to status
  const displayStatus = transaction.user_visible_status || transaction.status;
  const statusConfig = getStatusConfig(displayStatus, transaction.internal_status);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return address; // Show full address
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
            {transaction.merchant_name || (isReceived ? 'Received from' : 'Sent to')}
          </Text>
          <Text style={[
            styles.amount,
            { color: isReceived ? COLORS.success : COLORS.text }
          ]}>
            {isReceived ? '+' : '-'}{transaction.amount} PAY
          </Text>
        </View>
        
        <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
          {formatAddress(
            isReceived ? transaction.from_address! : transaction.to_address!
          )}
        </Text>
        
        <Text style={styles.inrAmount}>
          ≈ ₹{(parseFloat(transaction.amount) * 0.85).toFixed(2)} INR
        </Text>
        
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  address: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inrAmount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
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
