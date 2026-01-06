# ⚡ CryptoPay - UPI for Web3

> A mobile-first blockchain payment app that makes crypto as simple as UPI. Scan, authenticate, pay.

[![React Native](https://img.shields.io/badge/React%20Native-0.73-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-50-black.svg)](https://expo.dev/)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy-purple.svg)](https://polygon.technology/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## 📥 Download APK

**Latest Release: v1.0.0**

[![Download APK](https://img.shields.io/badge/Download-APK-green.svg?style=for-the-badge&logo=android)](YOUR_APK_LINK_HERE)

> 📱 Android 8.0+ required | 📦 Size: ~50MB | 🔒 Test version (Polygon Amoy)

**To build the APK yourself**, see the [Build APK](#-build-apk) section below.

---

## 🎯 Vision

Make blockchain payments **invisible**. Users shouldn't need to know about gas, wallets, or private keys. Just scan, authenticate with biometrics, and pay.

**Like UPI, but on blockchain:**

- ✅ 6-digit PIN instead of mnemonic phrases
- ✅ QR code payments
- ✅ Face ID / Fingerprint authentication
- ✅ Instant settlement (~2 seconds)
- ✅ No gas fee complexity for users

---

## 📱 App Features

### ✅ Completed (MVP v1.0)

| Feature                 | Status | Description                                 |
| ----------------------- | ------ | ------------------------------------------- |
| **Phone Verification**  | ✅     | OTP-based authentication with rate limiting |
| **Wallet Creation**     | ✅     | BIP-39/44 compliant HD wallet generation    |
| **PIN Security**        | ✅     | 6-digit PIN with encrypted mnemonic storage |
| **Biometric Auth**      | ✅     | Face ID / Fingerprint unlock                |
| **QR Payments**         | ✅     | Scan & pay with merchant QR codes           |
| **Transaction History** | ✅     | Real-time updates via Supabase              |
| **Merchant Mode**       | ✅     | Generate payment QR codes                   |
| **Balance Display**     | ✅     | PAY token + INR equivalent                  |
| **Sign Out**            | ✅     | Session management without losing wallet    |
| **Change PIN**          | ✅     | 3-step PIN update flow                      |

### 🔐 Security Features

- **Local Key Storage**: Private keys never leave device (SecureStore)
- **Encrypted Mnemonic**: AES encryption with PIN-based decryption
- **Biometric Protection**: Device credential fallback
- **Session Management**: Sign out without deleting wallet
- **Rate Limiting**: 3 OTP attempts per 24 hours
- **Permission Handling**: Camera + Location with user consent

---

## 📁 Project Structure

```
CryptoPay/
├── App/                      # React Native mobile app
│   ├── src/
│   │   ├── screens/         # All app screens (17 screens)
│   │   ├── services/        # Blockchain, wallet, auth services
│   │   ├── components/      # Reusable UI components
│   │   ├── navigation/      # Stack & tab navigation
│   │   ├── constants/       # Theme, config, blockchain settings
│   │   └── utils/           # Helpers, QR code, biometric
│   ├── assets/              # Logo, icons
│   └── app.json             # Expo configuration
├── Blockchain/              # Smart contracts (Hardhat)
├── docs/                    # Documentation
└── README.md               # This file
```

---

## 🚀 Quick Start

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
expo-cli
```

### 1. Clone & Install

```bash
cd CryptoPay/App
npm install
```

### 2. Environment Setup

Create `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
EXPO_PUBLIC_CHAIN_ID=80002
EXPO_PUBLIC_TOKEN_ADDRESS=your_deployed_token_address
EXPO_PUBLIC_DEV_PHONE=+911234567890
EXPO_PUBLIC_DEV_OTP=123456
```

### 3. Run Development Build

```bash
# Start Expo dev server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

### 4. Test Authentication

Use test credentials:

- **Phone**: `+911234567890`
- **OTP**: `123456`
- **PIN**: Any 6 digits

---

## 🏗️ Architecture

### Blockchain Layer

```
┌─────────────────────────────────────────┐
│     Polygon Amoy Testnet (Chain 80002)  │
│  ┌─────────────────────────────────┐    │
│  │   PAY Token (ERC-20)            │    │
│  │   - balanceOf()                 │    │
│  │   - transfer()                  │    │
│  │   - faucet() [testnet only]     │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
              ▲
              │ RPC (ethers.js v6)
              │
┌─────────────┴───────────────────────────┐
│          Mobile App (React Native)       │
│  ┌─────────────────────────────────┐    │
│  │  Wallet Service                 │    │
│  │  - HD Wallet (BIP-39/44)        │    │
│  │  - SecureStore encryption       │    │
│  │  - PIN-based unlock             │    │
│  └─────────────────────────────────┘    │
└──────────────────────────────────────────┘
              ▲
              │ Real-time sync
              │
┌─────────────┴───────────────────────────┐
│          Supabase (Backend)              │
│  - User profiles                         │
│  - Transaction history                   │
│  - Merchant data                         │
│  - Real-time subscriptions               │
└──────────────────────────────────────────┘
```

### Wallet Generation Flow

```
User Creates PIN (6 digits)
        │
        ▼
ethers.Wallet.createRandom()
        │
        ├─► 12-word mnemonic (BIP-39)
        ├─► Private key (BIP-44: m/44'/60'/0'/0/0)
        └─► Wallet address (0x...)
        │
        ▼
Mnemonic → Encrypt with PIN → SecureStore
PIN → Hash → SecureStore
```

### Payment Flow

```
1. User scans merchant QR code
2. QR contains: {merchant, amount, ref}
3. App shows confirmation screen
4. User enters PIN
5. PIN decrypts mnemonic → derives wallet
6. ethers.js signs transaction
7. Sent to Polygon RPC
8. Transaction hash returned
9. Stored in Supabase
10. Real-time update to UI
```

---

## 🛠️ Tech Stack

### Frontend

| Technology                | Version | Purpose                |
| ------------------------- | ------- | ---------------------- |
| React Native              | 0.73    | Mobile framework       |
| Expo                      | 50      | Build & deployment     |
| TypeScript                | 5.3     | Type safety            |
| ethers.js                 | 6.10    | Blockchain interaction |
| expo-camera               | Latest  | QR code scanning       |
| expo-local-authentication | Latest  | Biometrics             |
| expo-secure-store         | Latest  | Encrypted storage      |

### Backend

| Service      | Purpose                                      |
| ------------ | -------------------------------------------- |
| Supabase     | PostgreSQL database, real-time subscriptions |
| Polygon Amoy | Testnet blockchain (Chain ID: 80002)         |

### Smart Contracts

| Contract  | Standard | Features                            |
| --------- | -------- | ----------------------------------- |
| PAY Token | ERC-20   | Transfer, balance, faucet (testnet) |

---

## 💰 Cost Breakdown

### MVP (Current): **$0.00/month**

| Service          | Tier    | Cost   |
| ---------------- | ------- | ------ |
| Supabase         | Free    | $0     |
| Polygon Amoy     | Testnet | $0     |
| Expo Development | Free    | $0     |
| GitHub           | Free    | $0     |
| **Total**        |         | **$0** |

### Production (Future)

| Service             | Tier       | Cost              |
| ------------------- | ---------- | ----------------- |
| Supabase            | Pro        | $25/mo            |
| Polygon Mainnet     | Gas fees   | Variable          |
| Expo EAS            | Production | $29/mo            |
| **Estimated Total** |            | **~$60/mo + gas** |

---

## 📱 Build APK

### Using EAS (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build APK
eas build -p android --profile preview
```

### Local Build

```bash
# Prebuild native code
npx expo prebuild

# Build APK
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🧪 Testing

### Reset App (Test Full Flow)

To test complete onboarding from scratch:

**Option 1: Clear storage**

```bash
npx expo start --clear
```

**Option 2: Use utility function**

```typescript
import { resetApp } from "./src/utils/resetApp";
await resetApp(); // Clears all data
// Restart app manually
```

### Test Credentials

- Phone: `+911234567890`
- OTP: `123456`
- PIN: Any 6 digits (e.g., `111111`)

---

## 📖 Documentation

- [MVP Roadmap](MVP_ROADMAP.md) - 4-6 week implementation guide
- [24HR Roadmap](MVP_ROADMAP_24HR_FREE.md) - Sprint version
- [Production Roadmap](PRODUCTION_ROADMAP.md) - 12-month plan
- [Tech Stack](TECH_STACK.md) - Technology decisions

---

## 🔧 Configuration Files

### app.json

```json
{
  "expo": {
    "name": "CryptoPay",
    "slug": "cryptopay",
    "version": "1.0.0",
    "android": {
      "package": "com.cryptopay.app",
      "permissions": [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "USE_BIOMETRIC",
        "INTERNET"
      ]
    }
  }
}
```

### Blockchain Config

```typescript
export const BLOCKCHAIN_CONFIG = {
  RPC_URL: "https://rpc-amoy.polygon.technology",
  CHAIN_ID: 80002,
  CHAIN_NAME: "Polygon Amoy Testnet",
  EXPLORER_URL: "https://amoy.polygonscan.com",
};
```

---

## 🚧 Known Limitations (Testnet MVP)

| Limitation         | Impact                 | Production Fix         |
| ------------------ | ---------------------- | ---------------------- |
| Test tokens only   | No real value          | Deploy on mainnet      |
| Manual faucet      | User needs test MATIC  | Gas sponsorship (AA)   |
| Testnet RPC        | Slower, less reliable  | Paid RPC provider      |
| No social recovery | Lost PIN = lost wallet | Social recovery module |
| Single chain       | Only Polygon           | Multi-chain support    |

---

## 🛣️ Roadmap

### Phase 1: MVP (Completed ✅)

- [x] Wallet creation & management
- [x] Phone + PIN authentication
- [x] QR code payments
- [x] Transaction history
- [x] Merchant mode
- [x] Biometric authentication

### Phase 2: Production Ready (Next)

- [ ] Deploy PAY token on Polygon mainnet
- [ ] Implement gas sponsorship
- [ ] Add social recovery
- [ ] Real OTP service (Twilio/Firebase)
- [ ] Push notifications
- [ ] App store deployment

### Phase 3: Scale (Future)

- [ ] Multi-chain support
- [ ] Fiat on/off ramp
- [ ] Merchant dashboard
- [ ] Analytics & reporting
- [ ] White-label solution

---

## 🤝 Contributing

This is an educational/MVP project. Contributions welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

MIT License - Build whatever you want!

---

## 🙏 Acknowledgments

- **Polygon** for free testnet infrastructure
- **Supabase** for generous free tier
- **Expo** for amazing developer experience
- **ethers.js** for robust web3 library
- **OpenZeppelin** for secure contract standards

---

## 📧 Contact & Support

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check `/docs` folder for detailed guides

---

<div align="center">

**Built with constraints, shipped with confidence.**

💰 Budget: **$0**  
⏱️ Timeline: **6 weeks**  
🎯 Goal: **Production-ready MVP**

### 🚀 Status: READY FOR PRODUCTION

_Last Updated: January 2026_

</div>
