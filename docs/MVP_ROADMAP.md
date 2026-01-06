# ⚡ CryptoPay - MVP Roadmap (4-6 Weeks)

**Ship Fast, Learn Faster**

---

## 🎯 MVP Goal

Build a **working prototype** where a user can:

1. Sign up with PIN or phone (optional Supabase auth)
2. Receive test tokens from faucet
3. Scan a QR code
4. Pay a merchant using biometric auth
5. See transaction history

**No fancy features. Just the core payment flow.**

## 💰 Cost: $0.00

✅ **Supabase Free Tier**: 500MB database, 1GB storage, 2GB bandwidth/month
✅ All other tools are completely free
✅ Perfect for MVP with up to 50,000 monthly users

---

## MVP Scope (What's IN)

✅ PIN or email signup (Supabase auth - FREE!)  
✅ Biometric authentication  
✅ Standard wallet (ethers.js - no AA complexity)  
✅ QR code scanning  
✅ Test token payments (custom ERC-20)  
✅ Transaction history (Supabase DB + on-chain)  
✅ Merchant QR generation (Supabase Storage)  
✅ Self-funded gas (from faucet)  
✅ Optional: Realtime payment notifications  
✅ Optional: Edge Functions for QR generation

## What's OUT (Build Later)

❌ SMS/Phone verification (Twilio costs money)  
❌ Account Abstraction (requires paid ZeroDev)  
❌ Gas sponsorship (requires paymaster)  
❌ Social recovery  
❌ Advanced analytics dashboard  
❌ Push notifications (requires paid service)

## Tech Stack (100% FREE)

### Frontend

- **React Native (Expo)** + TypeScript - FREE
- **Supabase Client** - backend SDK - FREE
- **Ethers.js v6** - blockchain interactions - FREE
- **expo-local-authentication** - biometrics - FREE
- **expo-secure-store** - encrypted storage - FREE

### Backend (Supabase FREE Tier)

- **PostgreSQL Database** - 500MB storage - FREE
- **Supabase Auth** - email/magic link auth - FREE
- **Supabase Storage** - 1GB file storage - FREE
- **Edge Functions** - serverless functions - FREE
- **Realtime** - live updates - FREE
- **Row Level Security (RLS)** - built-in security - FREE

### Blockchain

- **Polygon Mumbai Testnet** - test network - FREE
- **Public RPC**: `https://rpc-mumbai.maticvigil.com` - FREE
- **Mumbai Faucet** - free test MATIC - FREE
- **Custom ERC-20** - your own test token - FREE

### Tools

- **Expo Go** - instant mobile testing - FREE
- **Hardhat** - smart contract deployment - FREE
- **Supabase Dashboard** - database management - FREE
- **VS Code** - code editor - FREE

**Total Monthly Cost: $0.00** 🎉

**Supabase Free Tier Limits:**

- 500MB database storage (plenty for MVP)
- 1GB file storage (for QR codes, receipts)
- 2GB bandwidth/month
- 50,000 monthly active users
- Unlimited API requests
- 500K Edge Function invocations/month

---

## 📅 4-Week Sprint Plan

---

## Week 1: Setup & Wallet Creation

**Goal**: User can create wallet and authenticate

### Day 1-2: Project Setup

**Tasks:**

1. Create Expo project (15 min)

   ```bash
   npx create-expo-app@latest cryptopay-mobile --template blank-typescript
   cd cryptopay-mobile
   npm install ethers@6 @supabase/supabase-js
   npm install @react-native-async-storage/async-storage
   npx expo install expo-camera expo-local-authentication expo-secure-store expo-barcode-scanner
   ```

2. Setup Supabase (FREE!) (30 min)

   - Go to https://supabase.com
   - Create free account (no credit card required!)
   - Create new project (free tier)
   - Note: Project URL and anon key
   - Save in `.env`:
     ```
     EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
     ```

3. Deploy test token contract (2 hours)

   ```bash
   # Separate folder for contracts
   mkdir cryptopay-contracts && cd cryptopay-contracts
   npm init -y
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   npm install @openzeppelin/contracts
   npx hardhat init
   ```

   Create ERC-20 token with faucet function:

   ```solidity
   // contracts/PayToken.sol
   pragma solidity ^0.8.20;
   import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

   contract PayToken is ERC20 {
       constructor() ERC20("PayToken", "PAY") {
           _mint(msg.sender, 1000000 * 10**18);
       }

       function faucet() external {
           _mint(msg.sender, 100 * 10**18); // Free tokens!
       }
   }
   ```

4. Get Mumbai MATIC from faucet (10 min)

   - Visit: https://faucet.polygon.technology/
   - Get free test MATIC for gas

5. Deploy to Mumbai testnet (20 min)

   ```javascript
   // hardhat.config.js
   module.exports = {
     networks: {
       mumbai: {
         url: "https://rpc-mumbai.maticvigil.com",
         accounts: [process.env.PRIVATE_KEY],
       },
     },
   };
   ```

6. Create folder structure
   ```
   src/
   ├── screens/
   ├── components/
   ├── services/
   │   ├── supabase.ts      (NEW!)
   │   ├── wallet.ts
   │   ├── blockchain.ts
   │   └── storage.ts
   ├── hooks/
   ├── utils/
   └── types/
   ```

**Checkpoint:** ✅ Project setup complete + Supabase connected (Cost: $0)

---

### Day 3-4: Phone Authentication

**Tasks:**

1. Create Supabase database tables

   ```sql
   -- Run in Supabase SQL Editor
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     phone_number TEXT UNIQUE NOT NULL,
     smart_wallet_address TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. Create phone auth screen
   - Phone number input
   - OTP verification (use Supabase auth)
3. Integrate Twilio (or use Supabase's built-in phone auth)

4. Create onboarding flow
   - Splash screen
   - Phone entry
   - OTP verification
   - Success screen

**Checkpoint:** ✅ User can sign up with phone number

---

### Day 5: Biometric Authentication

**Tasks:**

1. Biometric setup (already installed from Day 1!)

   ```typescript
   // src/utils/biometric.ts
   import * as LocalAuthentication from "expo-local-authentication";

   export async function authenticateWithBiometric() {
     const hasHardware = await LocalAuthentication.hasHardwareAsync();
     if (!hasHardware) return true; // Skip if unavailable

     const result = await LocalAuthentication.authenticateAsync({
       promptMessage: "Confirm Payment",
       fallbackLabel: "Use PIN",
     });

     return result.success;
   }
   ```

2. Create unlock flow (2 hours)
   - Biometric prompt on payment
   - Fallback to PIN
   - No seed phrase exposure!

**Checkpoint:** ✅ Biometric auth works (Cost: $0)

---

### Day 6-7: Core UI Screens

**Tasks:**

1. Home Screen (3 hours)

   - Display token balance
   - "Scan to Pay" button
   - "Request Tokens" button (calls faucet)
   - Recent transactions
   - Pull to refresh

2. Onboarding Screen (2 hours)

   - Welcome message
   - Create wallet button
   - PIN setup
   - Wallet created automatically
   - No seed phrase shown!

3. Settings Screen (1 hour)
   - Display wallet address
   - Copy to clipboard
   - View on PolygonScan
   - Reset wallet (dev only)

**Checkpoint:** ✅ Basic screens built (Cost: $0)

---

## Week 2: Payment Flow

**Goal**: User can scan QR and make payment

### Day 8-9: QR Scanner

**Tasks:**

1. Camera already installed from Day 1! ✅

2. Create scanner screen (3 hours)

   ```typescript
   // src/screens/ScanScreen.tsx
   import { Camera } from "expo-camera";
   import { BarCodeScanner } from "expo-barcode-scanner";

   // Features:
   // - Request camera permission
   // - Show camera view with overlay
   // - Scan and parse QR data
   // - Navigate to confirm screen
   ```

3. Define QR format (30 min)
   ```json
   {
     "type": "cryptopay",
     "merchant": "0xMerchantAddress",
     "amount": "10.00",
     "name": "Tea Stall"
   }
   ```

**Checkpoint:** ✅ QR scanning works (Cost: $0)

---

### Day 10-11: Payment Confirmation Flow

**Tasks:**

1. Create payment review screen (3 hours)

   ```typescript
   // src/screens/ConfirmPaymentScreen.tsx
   // Features:
   // - Show merchant name/address
   // - Show amount in PAY tokens
   // - Confirm button
   // - Cancel button
   // - Biometric prompt before sending
   ```

2. Implement payment logic (4 hours)

   ```typescript
   const handlePayment = async () => {
     // 1. Biometric auth
     const authenticated = await authenticateWithBiometric();
     if (!authenticated) return;

     // 2. Send transaction using ethers.js
     const txHash = await sendPayment(merchantAddress, amount);

     // 3. Save to local storage
     await saveTransaction({
       hash: txHash,
       to: merchantAddress,
       amount,
       status: "pending",
     });

     // 4. Show success
     showSuccessAnimation();
   };
   ```

**Checkpoint:** ✅ Payment confirmation works (Cost: $0)

---

### Day 12-13: Transaction Execution

**Tasks:**

1. No Alchemy needed - use public RPC! ✅

2. No paymaster - user pays gas from faucet MATIC ✅

3. Send test transaction (3 hours)

   ```typescript
   // Uses ethers.js + free public RPC
   const provider = new ethers.JsonRpcProvider(RPC_URL);
   const wallet = await getWallet();
   const signer = wallet.connect(provider);
   const contract = new ethers.Contract(TOKEN_ADDRESS, ABI, signer);

   const tx = await contract.transfer(to, ethers.parseEther(amount));
   await tx.wait(); // Wait for confirmation
   ```

4. Handle transaction states (2 hours)
   - Pending → loading spinner
   - Success → success animation
   - Failed → error message
   - Background status polling

**Checkpoint:** ✅ First successful payment! (Cost: $0)

---

### Day 14: Transaction History with Supabase

**Tasks:**

1. Update storage service to use Supabase (already done in Day 3-4!) ✅

2. Create history screen with Supabase (3 hours)

   ```typescript
   // src/screens/HistoryScreen.tsx
   import { supabase } from "../services/supabase";
   import { getTransactions } from "../services/storage";

   const HistoryScreen = () => {
     const [transactions, setTransactions] = useState([]);

     // Load from Supabase (with local fallback)
     const loadTransactions = async () => {
       const txs = await getTransactions(); // Uses hybrid approach!
       setTransactions(txs);
     };

     // Subscribe to real-time updates (Supabase FREE feature!)
     useEffect(() => {
       loadTransactions();

       // Listen for new transactions
       const subscription = supabase
         .channel("transactions")
         .on(
           "postgres_changes",
           { event: "INSERT", schema: "public", table: "transactions" },
           (payload) => {
             setTransactions((prev) => [payload.new, ...prev]);
           }
         )
         .subscribe();

       return () => subscription.unsubscribe();
     }, []);

     // ... render UI
   };
   ```

3. Add real-time transaction updates (1 hour)
   ```typescript
   // Poll blockchain + update Supabase
   const checkStatus = async (txHash) => {
     const receipt = await provider.getTransactionReceipt(txHash);
     if (receipt) {
       const status = receipt.status ? "success" : "failed";

       // Update in Supabase (triggers Realtime!)
       await supabase
         .from("transactions")
         .update({ status })
         .eq("tx_hash", txHash);
     }
   };
   ```

**Checkpoint:** ✅ Transaction history with real-time updates (Cost: $0)

---

## Week 3: Merchant Features & Supabase Polish

**Goal**: Leverage Supabase Storage, Edge Functions, and Realtime

### Day 15-16: Merchant QR Generator with Supabase

**Tasks:**

1. Enable Supabase Storage (5 min)

   - Go to Supabase Dashboard → Storage
   - Create bucket: `merchant-qr-codes` (public)
   - FREE 1GB storage!

2. Create QR generator with storage (2 hours)

   **Option A: Edge Function (serverless)**

   ```typescript
   // supabase/functions/generate-qr/index.ts
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
   import QRCode from "https://esm.sh/qrcode@1.5.3";

   serve(async (req) => {
     const { merchant, amount, name } = await req.json();

     const qrData = {
       type: "cryptopay",
       merchant,
       amount,
       name,
     };

     // Generate QR code
     const qrImage = await QRCode.toBuffer(JSON.stringify(qrData));

     // Upload to Supabase Storage
     const fileName = `${merchant}.png`;
     const { data } = await supabase.storage
       .from("merchant-qr-codes")
       .upload(fileName, qrImage, { upsert: true });

     // Get public URL
     const {
       data: { publicUrl },
     } = supabase.storage.from("merchant-qr-codes").getPublicUrl(fileName);

     return new Response(JSON.stringify({ url: publicUrl }));
   });
   ```

   **Option B: Simple HTML page (easier)**

   ```html
   <!-- qr-generator.html -->
   <!DOCTYPE html>
   <html>
     <head>
       <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
     </head>
     <body>
       <h1>Merchant QR Generator</h1>
       <input id="name" placeholder="Business Name" />
       <input id="address" placeholder="Wallet Address" />
       <input id="amount" placeholder="Amount (optional)" />
       <button onclick="generateQR()">Generate</button>
       <div id="qr"></div>

       <script>
         function generateQR() {
           const data = {
             type: "cryptopay",
             merchant: document.getElementById("address").value,
             amount: document.getElementById("amount").value,
             name: document.getElementById("name").value,
           };
           QRCode.toDataURL(JSON.stringify(data), (err, url) => {
             document.getElementById(
               "qr"
             ).innerHTML = `<img src="${url}" /><br><a href="${url}" download>Download</a>`;
           });
         }
       </script>
     </body>
   </html>
   ```

3. **Supabase Storage Benefits** (optional enhancement):

   - ✅ 1GB free storage for QR codes
   - ✅ CDN delivery (fast worldwide)
   - ✅ Can save merchant data in database

   ```typescript
   // Optional: Save merchant to Supabase
   await supabase.from("merchants").insert({
     name: businessName,
     wallet_address: walletAddress,
     qr_code_url: staticQRData,
   });
   ```

4. Host on GitHub Pages (FREE!) (30 min)
   - Create GitHub repo
   - Upload HTML file
   - Enable GitHub Pages
   - Access at: `https://yourusername.github.io/cryptopay-qr`

**Checkpoint:** ✅ QR generator live (Cost: $0, Supabase enhances but not required!)

### Day 17-18: UI/UX Polish

**Tasks:**

1. Design system (2 hours)

   ```typescript
   // src/constants/theme.ts
   export const colors = {
     primary: "#667eea",
     success: "#00C853",
     error: "#FF1744",
     background: "#F5F5F5",
     card: "#FFFFFF",
     text: "#212121",
   };
   ```

2. Create reusable components (3 hours)

   - Button.tsx
   - Card.tsx
   - TransactionItem.tsx
   - LoadingSpinner.tsx
   - EmptyState.tsx

3. Add animations (2 hours)

   - Use built-in Animated API (FREE!)
   - Fade in/out
   - Success checkmark
   - No need for Lottie files

4. Test on real devices (1 hour)
   - Use Expo Go (FREE!)
   - Test on iOS/Android
   - Fix any issues

**Checkpoint:** ✅ App looks professional (Cost: $0)

---

### Day 19-20: Balance & Token Faucet

**Tasks:**

1. Get test MATIC from faucet (10 min)

   - Visit: https://faucet.polygon.technology/
   - FREE test MATIC for gas!

2. Create balance display (2 hours)

   ```typescript
   // Fetch PAY token balance
   const balance = await contract.balanceOf(walletAddress);
   // Show on home screen
   // Auto-refresh every 10s
   ```

3. Add "Request Tokens" button (2 hours)
   ```typescript
   // Calls your token's faucet() function
   const requestTokens = async () => {
     const tx = await contract.faucet();
     await tx.wait();
     // User gets 100 PAY tokens for FREE!
   };
   ```

**Checkpoint:** ✅ Users can get free tokens (Cost: $0)

---

### Day 21: Final Integration

**Tasks:**

1. No Edge Functions needed! ✅

2. Transaction verification works client-side (2 hours)

   ```typescript
   // Poll blockchain for receipt
   const checkStatus = async (txHash) => {
     const receipt = await provider.getTransactionReceipt(txHash);
     if (receipt) {
       await updateTransactionStatus(
         txHash,
         receipt.status ? "success" : "failed"
       );
     }
   };
   ```

3. No webhooks needed - use polling! (1 hour)

   - Check status every 5 seconds
   - Update AsyncStorage
   - Notify user when confirmed

4. Test complete flow (2 hours)
   - Create wallet → Get tokens → Scan → Pay → History
   - Fix any bugs

**Checkpoint:** ✅ Everything works end-to-end (Cost: $0)

---

## Week 4: Testing & Demo Prep

**Goal**: Polish, test, and prepare demo

### Day 22-23: Testing

**Tasks:**

1. Write critical tests

   - Auth flow test
   - Payment flow test
   - QR scanner test

2. Manual testing

   - Complete user journey 10 times
   - Test edge cases
   - Test on slow network
   - Test with no internet

3. Fix bugs
   - Prioritize P0 (crashes)
   - Fix P1 (broken flows)
   - Document P2 (nice to have)

**Checkpoint:** ✅ App is stable

---

### Day 24-25: Demo Preparation

**Tasks:**

1. Create demo script

   - Step-by-step walkthrough
   - Talking points
   - FAQs

2. Prepare demo environment

   - 2 test accounts (payer + merchant)
   - Funded wallets
   - Printed QR code

3. Record demo video
   - Screen recording
   - Voiceover
   - Upload to YouTube

**Checkpoint:** ✅ Demo ready

---

### Day 26-27: Documentation

**Tasks:**

1. Write README

   - What is CryptoPay
   - How it works
   - Setup instructions
   - Architecture diagram

2. Create user guide

   - How to sign up
   - How to pay
   - How to check history
   - Troubleshooting

3. Create pitch deck
   - Problem
   - Solution
   - Demo
   - Traction (if any)
   - Ask

**Checkpoint:** ✅ Documentation complete

---

### Day 28: Buffer & Launch

**Tasks:**

1. Final polish

   - Fix any remaining bugs
   - Improve copy/text
   - Add splash screen

2. No production deployment needed! ✅

   - Everything runs client-side
   - Just update contract address if needed
   - Test end-to-end on testnet

3. Soft launch
   - Share with friends
   - Get feedback
   - Iterate

**Checkpoint:** ✅ MVP SHIPPED 🚀 (Cost: $0)

---

## 📦 Deliverables (End of Week 4)

✅ **Working mobile app** (iOS + Android)  
✅ **User can sign up** (PIN or email via Supabase)  
✅ **User can pay** (scan QR + confirm with biometric)  
✅ **Transaction history** (Supabase + local cache)  
✅ **Real-time updates** (Supabase Realtime)  
✅ **Merchant can generate QR** (Supabase Storage)  
✅ **Supabase backend** (database, auth, storage, realtime)  
✅ **Demo video** recorded  
✅ **Documentation** complete

**💰 Total Cost: $0.00** (Supabase free tier!)

## 🔧 FREE MVP Tech Setup (Quick Reference)

### 1. Create Expo App (FREE)

```bash
npx create-expo-app@latest cryptopay-mobile --template blank-typescript
cd cryptopay-mobile
npm install ethers@6 @react-native-async-storage/async-storage
npx expo install expo-camera expo-local-authentication expo-secure-store expo-barcode-scanner
```

### 2. Deploy Smart Contract (FREE)

```bash
# In separate folder
mkdir cryptopay-contracts && cd cryptopay-contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
npx hardhat init

# Get free MATIC from https://faucet.polygon.technology/
# Deploy to Mumbai testnet
npx hardhat run scripts/deploy.js --network mumbai
```

### 3. Configuration (FREE)

```typescript
// src/constants/config.ts
export const CONFIG = {
  RPC_URL: "https://rpc-mumbai.maticvigil.com", // FREE public RPC
  TOKEN_ADDRESS: "0xYourDeployedTokenAddress",
  CHAIN_ID: 80001, // Mumbai testnet
  EXPLORER: "https://mumbai.polygonscan.com",
};
```

### 4. Folder Structure

```
cryptopay-mobile/
├── src/
│   ├── screens/
│   │   ├── OnboardingScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ScanScreen.tsx
│   │   ├── ConfirmPaymentScreen.tsx
│   │   └── HistoryScreen.tsx
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── TransactionItem.tsx
│   ├── services/
│   │   ├── wallet.ts        (Ethers.js wallet)
│   │   ├── blockchain.ts    (Contract interactions)
│   │   └── storage.ts       (AsyncStorage)
│   ├── utils/
│   │   └── biometric.ts
│   ├── constants/
│   │   ├── config.ts
│   │   └── theme.ts
│   └── types/
│       └── index.ts
├── app.json
├── package.json
└── README.md
```

---

## 🎯 Success Criteria for FREE MVP

**User Flow Works:**

1. ✅ User creates wallet in <30 seconds
2. ✅ Wallet created automatically (PIN-based)
3. ✅ User requests free tokens from faucet
4. ✅ User scans QR code
5. ✅ User confirms with biometric (or PIN)
6. ✅ Payment settles on Mumbai testnet
7. ✅ Transaction appears in history

**Technical Requirements:**

- ✅ App doesn't crash
- ✅ Biometric auth works (with PIN fallback)
- ✅ Transactions succeed >90% of time
- ✅ Gas paid by user (from free faucet MATIC)
- ✅ Uses only free services

**User Experience:**

- ✅ No "wallet", "gas", "private key" words visible
- ✅ Feels like UPI
- ✅ Simple, clean UI
- ✅ <5 taps from scan to payment

**Cost:**

- ✅ **$0.00** - Everything is FREE!

---

## ⚠️ Common Pitfalls (Avoid These)

❌ **Over-engineering**: Don't build features you don't need  
❌ **Perfecting UI**: Ship ugly but working MVP first  
❌ **Using paid services**: Everything can be done FREE  
❌ **Scope creep**: Say NO to new features during MVP  
❌ **Testing too late**: Test as you build  
❌ **No feedback**: Show to users ASAP

---

## 🚀 After MVP (Next Steps)

Once MVP is working:

1. **Get 10 users** to test
2. **Collect feedback** ruthlessly
3. **Fix critical bugs** only
4. **Iterate** on UX based on feedback
5. **Add one feature** users ask for most
6. **Repeat** until product feels magical

**When you have traction and need to scale:**

- Add phone verification (costs money)
- Implement Account Abstraction
- Add proper backend
- Move to mainnet
- Follow the full Production Roadmap

---

## 💡 Pro Tips for FREE MVP

1. **Use Expo Go** - test instantly, no build needed (FREE!)
2. **Use public RPC** - no API keys required (FREE!)
3. **Use AsyncStorage** - no database needed (FREE!)
4. **GitHub Pages** - free static hosting (FREE!)
5. **Mumbai testnet** - free transactions forever (FREE!)
6. **Hard-code values** - skip config UIs for now
7. **Test on real devices** - Expo Go works great
8. **Keep it simple** - complexity costs money

---

## 📞 FREE Resources

- **Expo Docs**: https://docs.expo.dev
- **Ethers.js**: https://docs.ethers.org/v6
- **Hardhat**: https://hardhat.org/docs
- **Polygon Wiki**: https://wiki.polygon.technology
- **Mumbai Faucet**: https://faucet.polygon.technology
- **GitHub Pages**: https://pages.github.com
- **Free Icons**: https://icons.expo.fyi

---

## 💰 Cost Comparison

| Feature    | Paid Approach             | FREE Approach (with Supabase)    | Savings     |
| ---------- | ------------------------- | -------------------------------- | ----------- |
| Phone Auth | Twilio $10+/mo            | Supabase email magic link (FREE) | $10/mo      |
| Database   | PostgreSQL hosting $25/mo | Supabase (FREE tier)             | $25/mo      |
| RPC        | Alchemy $49/mo            | Public RPC (FREE)                | $49/mo      |
| AA Wallet  | ZeroDev $99/mo            | Standard wallet (FREE)           | $99/mo      |
| Storage    | AWS S3 $10/mo             | Supabase Storage (FREE)          | $10/mo      |
| Hosting    | Vercel $20/mo             | GitHub Pages (FREE)              | $20/mo      |
| **Total**  | **$213/mo**               | **$0/mo**                        | **$213/mo** |

**Supabase Free Tier Includes:**

- ✅ 500MB PostgreSQL database
- ✅ 1GB file storage
- ✅ 2GB bandwidth/month
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests
- ✅ 500K Edge Function invocations/month
- ✅ Real-time database subscriptions
- ✅ Authentication (email magic links, social OAuth)
- ✅ Row Level Security (RLS) built-in

**Perfect for MVP!** Only upgrade when you exceed limits.

---

**You have 4-6 weeks. Zero budget. Just code and creativity.**

**The best MVPs are built with constraints. $0 budget forces you to focus on what matters: solving the problem.**

🚀 **LET'S BUILD FOR FREE!**
