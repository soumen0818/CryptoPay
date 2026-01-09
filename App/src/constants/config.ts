// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  RPC_URL: process.env.EXPO_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology',
  TOKEN_ADDRESS: process.env.EXPO_PUBLIC_TOKEN_ADDRESS || '',
  RELAYER_URL: process.env.EXPO_PUBLIC_RELAYER_URL || 'http://localhost:3000', // Path B - Advanced
  CHAIN_ID: parseInt(process.env.EXPO_PUBLIC_CHAIN_ID || '80002'),
  CHAIN_NAME: 'Polygon Amoy Testnet',
  EXPLORER_URL: 'https://amoy.polygonscan.com',
  FAUCET_URL: 'https://faucet.polygon.technology/',
};

// Legacy export for backward compatibility
export const CONFIG = BLOCKCHAIN_CONFIG;

// Theme
export const COLORS = {
  primary: '#667eea',
  success: '#00C853',
  error: '#FF1744',
  warning: '#FFB300',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};
