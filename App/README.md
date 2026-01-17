# 📱 C-Pay Mobile App

> React Native application for C-Pay - Making payments as simple as UPI

**💡 Note:** C-Pay is an **INR-first money app**. Users only see ₹ amounts - blockchain technology works silently behind the scenes using a 1:1 stablecoin approach. See [INR_FIRST_IMPLEMENTATION.md](docs/INR_FIRST_IMPLEMENTATION.md) for details.

[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy-purple.svg)](https://polygon.technology/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the App](#-running-the-app)
- [Project Structure](#-project-structure)
- [Screens](#-screens)
- [Services](#-services)
- [Building APK](#-building-apk)
- [Testing](#-testing)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

C-Pay Mobile App is a full-featured React Native application that provides a seamless, UPI-like experience for digital payments. Built with Expo, it offers both consumer and merchant functionality with biometric security and real-time transaction tracking.

**Core Philosophy:** Users think in INR (₹), blockchain moves digital money silently. The app uses a 1:1 stablecoin approach where 1 token = ₹1, providing a familiar experience without crypto complexity.

**Key Highlights:**

- 🔐 **Secure Wallet Management** - BIP-39/44 compliant HD wallets with PIN/Biometric protection
- 💸 **Instant Payments** - QR code scanning for fast, secure payments (shown in ₹)
- 🏪 **Merchant Mode** - Built-in merchant dashboard with QR code generation
- 📊 **Real-time Updates** - Live transaction history via Supabase
- 🎨 **Modern UI** - Clean, intuitive design with smooth animations
- 🔄 **Offline-First** - Works without constant internet connectivity
- 💰 **INR-First** - All amounts displayed in ₹, blockchain hidden from users

---

## ✨ Features

### User Features

- ✅ **Phone Authentication** - OTP-based login with rate limiting (3 attempts/24h)
- ✅ **Wallet Creation** - Automatic HD wallet generation (never exposed to user)
- ✅ **PIN Security** - 6-digit PIN with encrypted mnemonic storage
- ✅ **Biometric Auth** - Face ID / Fingerprint unlock
- ✅ **QR Payments** - Scan merchant QR codes to pay instantly
- ✅ **Balance Display** - View PAY token balance with INR equivalent
- ✅ **Transaction History** - Complete payment history with search/filter
- ✅ **Profile Management** - Update name, photo, and settings
- ✅ **Change PIN** - Secure 3-step PIN update flow
- ✅ **Sign Out** - Session management without losing wallet
- ✅ **Faucet Access** - Get test PAY tokens (100 PAY/24h)

### Merchant Features

- ✅ **Merchant Registration** - Sign up with business details
- ✅ **Merchant Dashboard** - View sales, transactions, and analytics
- ✅ **Global QR Code** - Generate reusable merchant QR code
- ✅ **Dynamic Pricing** - Create QR codes with specific amounts
- ✅ **Transaction Tracking** - Monitor incoming payments in real-time
- ✅ **Payment Notifications** - Instant alerts for received payments

### Security Features

- 🔒 **Local Key Storage** - Private keys never leave device (SecureStore)
- 🔒 **Encrypted Mnemonic** - AES-256 encryption with PIN-based decryption
- 🔒 **Biometric Protection** - Device credential fallback
- 🔒 **Session Management** - Secure sign-in/sign-out flow
- 🔒 **Rate Limiting** - Prevents brute force attacks
- 🔒 **Permission Handling** - Camera + Location with user consent

---

## 🛠 Tech Stack

### Core Framework

- **React Native** `0.81` - Cross-platform mobile development
- **Expo** `~54.0` - Build tooling and managed workflow
- **TypeScript** `~5.9` - Type safety and developer experience

### Blockchain & Crypto

- **Ethers.js** `v6.16` - Ethereum/Polygon interactions
- **ethers shims** - Polyfills for React Native compatibility
- **expo-crypto** - Cryptographic operations
- **buffer** - Node.js Buffer API for React Native

### Wallet & Security

- **expo-secure-store** - Encrypted key storage
- **expo-local-authentication** - Biometric authentication
- **react-native-get-random-values** - Secure random number generation

### UI & Navigation

- **React Navigation** `v7` - Stack and tab navigation
- **expo-linear-gradient** - Gradient backgrounds
- **react-native-svg** - SVG support for QR codes
- **react-native-qrcode-svg** - QR code generation
- **@expo/vector-icons** - Icon library

### Backend & Storage

- **Supabase** `v2.89` - Database, real-time subscriptions, storage
- **AsyncStorage** `v2.2` - Local data persistence

### Additional Features

- **expo-camera** - QR code scanning
- **expo-clipboard** - Copy/paste functionality
- **expo-image-picker** - Profile photo selection
- **expo-location** - Geolocation services
- **expo-sharing** - Share QR codes
- **react-native-device-info** - Device information

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0` or **yarn** `>= 1.22.0`
- **Expo CLI** (installed via `npx expo`)
- **Expo Go app** on your mobile device (iOS/Android)
- **Supabase Account** (free tier) - [Sign up here](https://supabase.com)
- **PayToken Contract Deployed** - See [Blockchain README](../Blockchain/README.md)

---

## 📥 Installation

### 1. Navigate to App Directory

```bash
cd C-Pay/App
```

### 2. Install Dependencies

```bash
npm install
```

**Common Issues:**

- If you encounter peer dependency warnings, use `npm install --legacy-peer-deps`
- For M1/M2 Macs, you may need to run `npx expo prebuild --clean` if you see architecture errors

---

## ⚙️ Configuration

### 1. Setup Supabase (FREE!)

1. Visit [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to you)
3. Wait 1-2 minutes for setup to complete
4. Go to **Settings** → **API** and copy:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **Anon Public Key** (starts with `eyJ...`)

### 2. Setup Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase_schema.sql` in this directory
3. Copy the entire content and paste into SQL Editor
4. Click **Run** to create tables

### 3. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Blockchain Configuration
EXPO_PUBLIC_TOKEN_ADDRESS=0xYourDeployedTokenAddress
EXPO_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
EXPO_PUBLIC_CHAIN_ID=80002

# Relayer Service (Optional - for gasless transactions)
EXPO_PUBLIC_RELAYER_URL=https://your-relayer.onrender.com
```

**Important:** Replace placeholder values with your actual credentials!

---

## 🚀 Running the App

### Development Mode

```bash
npm start
```

This will start the Expo development server. You'll see a QR code in your terminal.

### Run on Physical Device (Recommended)

1. Install **Expo Go** app from:
   - [iOS App Store](https://apps.apple.com/app/apple-store/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan the QR code:**
   - **iOS:** Open Camera app and scan QR code
   - **Android:** Open Expo Go app and scan QR code

### Run on Emulator

```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

**Note:** Emulators may not support biometric authentication. Use a physical device for full testing.

---

## 📁 Project Structure

```
App/
├── src/
│   ├── screens/              # Application screens (22 screens)
│   │   ├── SplashScreen.tsx              # App entry point
│   │   ├── OnboardingScreen.tsx          # Welcome carousel
│   │   ├── PhoneVerificationScreen.tsx   # OTP authentication
│   │   ├── CreatePINScreen.tsx           # PIN setup
│   │   ├── ConfirmPINScreen.tsx          # PIN confirmation
│   │   ├── BiometricSetupScreen.tsx      # Biometric enrollment
│   │   ├── ProfileSetupScreen.tsx        # User profile creation
│   │   ├── LoginScreen.tsx               # Returning user login
│   │   ├── HomeScreen.tsx                # Main dashboard
│   │   ├── ScanScreen.tsx                # QR code scanner
│   │   ├── PaymentConfirmScreen.tsx      # Payment review
│   │   ├── TransactionHistoryScreen.tsx  # Payment history
│   │   ├── SendMoneyScreen.tsx           # Manual send
│   │   ├── QRGeneratorScreen.tsx         # Request money
│   │   ├── ProfileScreen.tsx             # User settings
│   │   ├── ChangePINScreen.tsx           # Update PIN
│   │   ├── ForgotPINScreen.tsx           # PIN recovery
│   │   ├── MerchantRegistrationScreen.tsx # Business signup
│   │   ├── MerchantDashboardScreen.tsx   # Merchant home
│   │   ├── MerchantGlobalQRScreen.tsx    # Merchant QR display
│   │   ├── MerchantQRGeneratorScreen.tsx # Dynamic QR creation
│   │   └── MerchantTransactionsScreen.tsx # Merchant payments
│   │
│   ├── components/           # Reusable UI components
│   │   ├── Button.tsx                    # Custom button
│   │   ├── Card.tsx                      # Card container
│   │   ├── EmptyState.tsx                # Empty list placeholder
│   │   ├── LoadingSpinner.tsx            # Loading indicator
│   │   ├── PINDialog.tsx                 # PIN entry modal
│   │   ├── PINInput.tsx                  # 6-digit PIN input
│   │   ├── SuccessAnimation.tsx          # Success checkmark
│   │   ├── TransactionItem.tsx           # Transaction list item
│   │   ├── TransactionDetailModal.tsx    # Transaction details
│   │   └── index.ts                      # Barrel export
│   │
│   ├── services/             # Business logic & API clients
│   │   ├── supabase.ts       # Supabase client configuration
│   │   ├── wallet.ts         # Wallet creation, encryption
│   │   ├── blockchain.ts     # Smart contract interactions
│   │   ├── storage.ts        # Hybrid local + cloud storage
│   │   ├── auth.ts           # Phone OTP authentication
│   │   ├── merchant.ts       # Merchant API operations
│   │   └── relayer.ts        # Gasless transaction relayer
│   │
│   ├── utils/                # Helper functions
│   │   ├── biometric.ts      # Biometric auth helpers
│   │   ├── qr.ts             # QR code utilities
│   │   ├── format.ts         # Number/date formatting
│   │   └── validation.ts     # Input validation
│   │
│   ├── types/                # TypeScript type definitions
│   │   ├── index.ts          # Shared types
│   │   ├── navigation.ts     # Navigation params
│   │   └── database.ts       # Supabase schema types
│   │
│   ├── constants/            # Configuration & theme
│   │   ├── config.ts         # Blockchain config, API URLs
│   │   └── theme.ts          # Colors, spacing, fonts
│   │
│   └── navigation/           # Navigation structure
│       └── index.tsx         # Stack & tab navigators
│
├── assets/                   # Images, fonts, icons
│   ├── icon.png              # App icon
│   └── splash.png            # Splash screen
│
├── docs/                     # Documentation files
│   ├── SETUP_COMPLETE.md
│   ├── MVP_ROADMAP.md
│   ├── TESTING_GUIDE.md
│   └── ... (15+ docs)
│
├── Database-schema/          # SQL migration scripts
│   ├── ADD_MERCHANT_COLUMNS_MIGRATION.sql
│   ├── ADD_PHONE_COLUMN_MIGRATION.sql
│   └── ... (5 migrations)
│
├── App.tsx                   # Root component
├── index.ts                  # Entry point
├── app.json                  # Expo configuration
├── eas.json                  # Build configuration
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── supabase_schema.sql       # Database schema
└── README.md                 # This file
```

---

## 📱 Screens

### Authentication Flow

1. **SplashScreen** - Checks wallet/auth state
2. **OnboardingScreen** - First-time user welcome (3 slides)
3. **PhoneVerificationScreen** - Enter phone → Receive OTP → Verify
4. **CreatePINScreen** - Set 6-digit PIN
5. **ConfirmPINScreen** - Re-enter PIN for confirmation
6. **BiometricSetupScreen** - Enable Face/Touch ID (optional)
7. **ProfileSetupScreen** - Add name and profile photo
8. **LoginScreen** - Returning users enter PIN or use biometrics

### Main App Flow

9. **HomeScreen** - Dashboard with balance, quick actions, recent transactions
10. **ScanScreen** - QR code scanner with camera overlay
11. **PaymentConfirmScreen** - Review payment details before sending
12. **TransactionHistoryScreen** - Full transaction list with filters
13. **SendMoneyScreen** - Send PAY tokens to wallet address
14. **QRGeneratorScreen** - Generate QR code to request payment
15. **ProfileScreen** - Settings, security, merchant mode toggle

### Merchant Flow

16. **MerchantRegistrationScreen** - Business name, category, location
17. **MerchantDashboardScreen** - Sales analytics, recent payments
18. **MerchantGlobalQRScreen** - Display merchant QR code (reusable)
19. **MerchantQRGeneratorScreen** - Create QR with specific amount
20. **MerchantTransactionsScreen** - Detailed merchant payment history

### Additional Screens

21. **ChangePINScreen** - 3-step flow: Old PIN → New PIN → Confirm
22. **ForgotPINScreen** - Recovery via biometric + OTP verification

---

## 🔧 Services

### `wallet.ts` - Wallet Management

```typescript
createWallet(pin: string)          // Generate HD wallet, encrypt mnemonic
getWallet(pin: string)             // Decrypt and retrieve wallet
verifyPin(pin: string)             // Validate PIN without exposing keys
hasWallet()                        // Check if wallet exists
changePin(oldPin, newPin)          // Update PIN securely
```

### `blockchain.ts` - Smart Contract Interactions

```typescript
getBalance(address); // Get PAY token balance
sendPayment(to, amount, wallet); // Transfer tokens
claimFaucet(wallet); // Claim 100 PAY (24h cooldown)
getTransactionReceipt(hash); // Check transaction status
estimateGas(to, amount); // Calculate gas fees
```

### `supabase.ts` - Backend Client

```typescript
supabase; // Initialized Supabase client
uploadProfilePhoto(uri, userId); // Upload to Supabase Storage
createTransaction(data); // Insert transaction record
subscribeToTransactions(userId); // Real-time updates
```

### `auth.ts` - Authentication

```typescript
sendOTP(phone); // Send verification code
verifyOTP(phone, code); // Validate OTP
checkRateLimit(phone); // Prevent spam (3 attempts/24h)
createSession(userId); // Generate auth token
```

### `merchant.ts` - Merchant Operations

```typescript
registerMerchant(data)             // Create merchant account
getMerchantTransactions(id)        // Fetch merchant payments
generateMerchantQR(id, amount?)    // Create payment QR code
updateMerchantProfile(id, data)    // Update business details
```

### `relayer.ts` - Gasless Transactions (Optional)

```typescript
relayTransaction(from, to, amount, signature); // Submit via relayer
signMetaTransaction(wallet, to, amount); // Create EIP-712 signature
checkRelayerHealth(); // Verify relayer is online
```

---

## 📦 Building APK

### Using EAS Build (Recommended)

1. **Install EAS CLI**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**

   ```bash
   eas login
   ```

3. **Configure Build**

   ```bash
   eas build:configure
   ```

4. **Build APK**

   ```bash
   eas build --platform android --profile preview
   ```

5. **Download APK**
   - Check build status: `eas build:list`
   - Download from Expo dashboard or CLI link

### Local Build (Advanced)

```bash
npx expo prebuild
npx expo run:android --variant release
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🧪 Testing

### Manual Testing Checklist

See [COMPLETE_TESTING_GUIDE.md](docs/COMPLETE_TESTING_GUIDE.md) for comprehensive test scenarios.

**Quick Smoke Test:**

1. ✅ Phone verification (send OTP)
2. ✅ Create PIN (6 digits)
3. ✅ Enable biometrics
4. ✅ Setup profile (name + photo)
5. ✅ Claim faucet (100 PAY)
6. ✅ Scan merchant QR code
7. ✅ Confirm payment
8. ✅ View transaction history
9. ✅ Sign out & login with biometrics

### Testing Payments

**Option 1: Two Devices**

- Device A: Merchant mode → Generate QR
- Device B: Consumer mode → Scan & pay

**Option 2: One Device**

- Create merchant account
- Save merchant QR as image
- Switch to consumer mode
- Upload QR from gallery (if supported)

---

## 🌍 Environment Variables

| Variable                        | Required | Default                               | Description                           |
| ------------------------------- | -------- | ------------------------------------- | ------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | ✅       | -                                     | Supabase project URL                  |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅       | -                                     | Supabase anon public key              |
| `EXPO_PUBLIC_TOKEN_ADDRESS`     | ✅       | -                                     | Deployed PayToken contract address    |
| `EXPO_PUBLIC_RPC_URL`           | ❌       | `https://rpc-amoy.polygon.technology` | Polygon Amoy RPC endpoint             |
| `EXPO_PUBLIC_CHAIN_ID`          | ❌       | `80002`                               | Polygon Amoy Chain ID                 |
| `EXPO_PUBLIC_RELAYER_URL`       | ❌       | -                                     | Relayer service URL (for gasless txs) |

---

## 🐛 Troubleshooting

### Issue: "Network Error" when claiming faucet

**Solution:**

- Check TOKEN_ADDRESS in `.env` is correct
- Verify RPC_URL is accessible
- Ensure you have internet connection
- Try switching to mobile data

### Issue: "Biometric authentication failed"

**Solution:**

- Ensure device has biometrics enrolled (Settings → Security)
- Grant permissions when prompted
- Use PIN fallback if biometrics unavailable

### Issue: "Transaction pending forever"

**Solution:**

- Check Polygon Amoy network status
- View transaction on explorer: `https://amoy.polygonscan.com/tx/{hash}`
- Gas price may be too low (rare on testnets)

### Issue: "QR Scanner not working"

**Solution:**

- Grant camera permissions (Settings → Apps → C-Pay)
- Ensure good lighting
- Hold phone steady over QR code
- Try manual address entry

### Issue: "Supabase connection failed"

**Solution:**

- Verify `EXPO_PUBLIC_SUPABASE_URL` is correct
- Check `EXPO_PUBLIC_SUPABASE_ANON_KEY` is valid
- Ensure Supabase project is active (not paused)
- Check internet connectivity

### Issue: "Unable to resolve module"

**Solution:**

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

---

## 📚 Additional Resources

- 📖 [Complete Testing Guide](docs/COMPLETE_TESTING_GUIDE.md)
- 🛣 [MVP Roadmap](docs/MVP_ROADMAP.md)
- 🏗 [Invisible Rail Architecture](docs/INVISIBLE_RAIL_ARCHITECTURE.md)
- 🔐 [Biometric Recovery Flow](docs/BIOMETRIC_RECOVERY_FLOW.md)
- 🏪 [Merchant Guide](docs/MERCHANT_GUIDE.md)
- 🚀 [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md)

---

## 🤝 Support

For issues or questions:

1. Check [Troubleshooting](#-troubleshooting) section
2. Review documentation in `docs/` folder
3. Open an issue on GitHub repository

---

## 📄 License

This project is part of the C-Pay ecosystem. See main repository for license details.

---

**Built with ❤️ using React Native & Expo**
