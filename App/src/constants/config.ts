import Constants from 'expo-constants';

// Get environment variables with fallback to Constants.expoConfig.extra
const getEnvVar = (key: string, fallback: string = ''): string => {
  // Try process.env first (works in development)
  const processEnv = process.env[key];
  if (processEnv) return processEnv;
  
  // Try Constants.expoConfig.extra (works in production builds)
  const extraConfig = Constants.expoConfig?.extra?.[key];
  if (extraConfig) return extraConfig;
  
  return fallback;
};

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  RPC_URL: getEnvVar('EXPO_PUBLIC_RPC_URL', 'https://rpc-amoy.polygon.technology'),
  TOKEN_ADDRESS: getEnvVar('EXPO_PUBLIC_TOKEN_ADDRESS', '0x98BE2863435E05d9E6FF8A488A54Be9aA2a0469b'),
  RELAYER_URL: getEnvVar('EXPO_PUBLIC_RELAYER_URL', 'https://cryptopay-relayer.onrender.com'),
  CHAIN_ID: parseInt(getEnvVar('EXPO_PUBLIC_CHAIN_ID', '80002')),
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
