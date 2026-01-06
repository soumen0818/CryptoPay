# CryptoPay Frontend

React Native mobile app for CryptoPay - UPI-like Web3 payment system.

## 🚀 Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure Supabase** (FREE!)

   - Go to https://supabase.com
   - Create free account (no credit card required)
   - Create new project
   - Copy Project URL and anon key

3. **Setup environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   EXPO_PUBLIC_TOKEN_ADDRESS=0xYourTokenAddress
   ```

4. **Run the app**

   ```bash
   npm start
   ```

   Scan QR code with Expo Go app on your phone!

## 📁 Project Structure

```
src/
├── screens/          # App screens
├── components/       # Reusable UI components
├── services/         # Core business logic
│   ├── supabase.ts   # Supabase client
│   ├── wallet.ts     # Wallet management
│   ├── blockchain.ts # Blockchain interactions
│   └── storage.ts    # Hybrid storage (local + cloud)
├── hooks/            # Custom React hooks
├── utils/            # Helper functions
├── types/            # TypeScript types
└── constants/        # Config & theme
```

## 🔧 Tech Stack

- **React Native (Expo)** - Cross-platform mobile framework
- **TypeScript** - Type safety
- **Ethers.js v6** - Blockchain interactions
- **Supabase** - Backend (database, auth, storage)
- **AsyncStorage** - Local caching

## 💡 Features

✅ PIN-based wallet creation  
✅ Biometric authentication  
✅ QR code scanning  
✅ Token payments  
✅ Transaction history  
✅ Real-time updates (Supabase)  
✅ Offline-first architecture

## 💰 Cost

**$0/month** - Everything uses free tiers!

## 📚 Next Steps

1. Complete Day 1-2 setup ✅
2. Follow MVP_ROADMAP.md for next steps
3. Deploy smart contract from Blockchain folder
4. Start building screens (Day 3-4)

## 🔗 Resources

- [Expo Docs](https://docs.expo.dev)
- [Ethers.js](https://docs.ethers.org/v6)
- [Supabase Docs](https://supabase.com/docs)
- [MVP Roadmap](../MVP_ROADMAP.md)

---

Built with ❤️ for CryptoPay
