# ⚡ CryptoPay - UPI for Web3

A UPI-like payment system built on blockchain that makes crypto payments as simple as scanning a QR code.

## 🎯 Vision

Make blockchain payments invisible. Users shouldn't need to know about gas, wallets, or private keys. Just scan, authenticate with fingerprint, and pay.

## 📁 Project Structure

```
CryptoPay/
├── Frontend/          # React Native mobile app
├── Blockchain/        # Smart contracts (Hardhat)
├── MVP_ROADMAP.md     # 4-6 week implementation plan
├── MVP_ROADMAP_24HR_FREE.md  # 24-hour sprint version
├── PRODUCTION_ROADMAP.md     # Full 12-month roadmap
└── TECH_STACK.md      # Technology decisions
```

## 🚀 Quick Start

### Day 1-2: Setup ✅ COMPLETE

**Frontend Setup:**

```bash
cd Frontend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm start
```

**Blockchain Setup:**

```bash
cd Blockchain
npm install
cp .env.example .env
# Get Mumbai MATIC from https://faucet.polygon.technology/
# Add your private key to .env
npx hardhat run scripts/deploy.js --network mumbai
```

### Next Steps (Day 3-4)

Follow the [MVP_ROADMAP.md](MVP_ROADMAP.md) for detailed implementation steps.

## 💰 Cost

**MVP: $0.00/month**

Everything uses free tiers:

- ✅ Supabase (database, auth, storage) - FREE
- ✅ Polygon Mumbai testnet - FREE
- ✅ Public RPC - FREE
- ✅ Expo development - FREE
- ✅ GitHub Pages hosting - FREE

## 🛠️ Tech Stack

### Frontend

- React Native (Expo) + TypeScript
- Ethers.js v6
- Supabase client
- AsyncStorage

### Backend

- Supabase (PostgreSQL, Auth, Storage, Realtime)
- No custom backend needed!

### Blockchain

- Polygon Mumbai Testnet
- Custom ERC-20 token with faucet
- Standard EOA wallets (no Account Abstraction in MVP)

## 📋 Features

### MVP (Week 1-4)

- ✅ PIN-based wallet creation
- ✅ Biometric authentication
- ✅ QR code scanning
- ✅ Token payments
- ✅ Transaction history
- ✅ Real-time updates
- ✅ Merchant QR generation

### Production (Month 6-12)

- Phone number authentication
- Account Abstraction
- Gas sponsorship
- Social recovery
- Multi-chain support
- Fiat on/off ramp

## 📖 Documentation

- **[MVP Roadmap](MVP_ROADMAP.md)** - 4-6 week implementation guide
- **[24HR Roadmap](MVP_ROADMAP_24HR_FREE.md)** - Ultra-fast sprint version
- **[Production Roadmap](PRODUCTION_ROADMAP.md)** - Full 12-month plan
- **[Tech Stack](TECH_STACK.md)** - Technology decisions

## 🎓 Learning Resources

- [Expo Documentation](https://docs.expo.dev)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6)
- [Supabase Docs](https://supabase.com/docs)
- [Hardhat Docs](https://hardhat.org/docs)
- [Polygon Wiki](https://wiki.polygon.technology)

## 🤝 Contributing

This is an educational/MVP project. Feel free to:

1. Fork the repo
2. Build your own version
3. Share feedback
4. Improve the roadmaps

## 📄 License

MIT License - Build whatever you want!

## 🙏 Acknowledgments

- Polygon for free testnet
- Supabase for generous free tier
- Expo for amazing DX
- OpenZeppelin for secure contracts

---

**Built with constraints, shipped with confidence.**

💰 Budget: $0  
⏱️ Timeline: 4-6 weeks  
🎯 Goal: Learn by building

🚀 **LET'S BUILD!**
