// Professional Design System for CryptoPay
// Modern fintech-inspired theme (Stripe, Revolut, Cash App style)

export const COLORS = {
  // Primary Brand - Modern Purple
  primary: '#6C63FF',
  primaryDark: '#5548E8',
  primaryLight: '#8B85FF',
  primaryGradient: ['#6C63FF', '#8B85FF'],
  
  // Secondary - Complementary Blue
  secondary: '#00D4FF',
  accent: '#FF6B9D',
  
  // Status Colors - Optimized for clarity
  success: '#00D68F',
  successLight: '#B3FFE6',
  successDark: '#00A86B',
  successBg: '#E8FFF6',
  
  error: '#FF5C5C',
  errorLight: '#FFB3B3',
  errorDark: '#D32F2F',
  errorBg: '#FFE8E8',
  
  warning: '#FFC107',
  warningLight: '#FFD54F',
  warningDark: '#F57C00',
  warningBg: '#FFF8E1',
  
  info: '#00B8D4',
  infoLight: '#62EFFF',
  infoDark: '#00838F',
  infoBg: '#E0F7FA',
  
  // Neutral Palette - Sophisticated grays
  background: '#F8F9FA',
  backgroundDark: '#E9ECEF',
  
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  card: '#FFFFFF',
  cardHover: '#F5F6F7',
  
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  
  // Text Colors - High contrast for readability
  text: '#1A1A1A',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textDisabled: '#D1D5DB',
  textInverse: '#FFFFFF',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Shadows (iOS-style)
  shadow: '#000000',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const TYPOGRAPHY = {
  // Font sizes
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  
  // Font weights
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Alias for backward compatibility
export const FONT_SIZES = TYPOGRAPHY.sizes;

export const BORDER_RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  RPC_URL: process.env.EXPO_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology',
  TOKEN_ADDRESS: process.env.EXPO_PUBLIC_TOKEN_ADDRESS || '',
  CHAIN_ID: parseInt(process.env.EXPO_PUBLIC_CHAIN_ID || '80002'),
  CHAIN_NAME: 'Polygon Amoy Testnet',
  EXPLORER_URL: 'https://amoy.polygonscan.com',
  FAUCET_URL: 'https://faucet.polygon.technology/',
};

// Helper function for gradient backgrounds
export const getGradient = (colors: string[]) => {
  return {
    colors,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  };
};

// Export the design system
export const theme = {
  colors: COLORS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  animation: ANIMATION,
};

export default theme;
