# CryptoPay - Blockchain

Smart contracts for CryptoPay payment system built on Polygon Mumbai testnet.

## 🎯 What's Inside

- **PayToken.sol** - ERC-20 token with built-in faucet for testing
- **Deploy script** - Automated deployment to Mumbai testnet
- **Tests** - Comprehensive test suite

## 📦 Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add:

   - `PRIVATE_KEY` - Your wallet private key
   - `MUMBAI_RPC_URL` - RPC endpoint (default: public RPC)
   - `POLYGONSCAN_API_KEY` - For contract verification (optional)

3. **Get test MATIC**
   - Visit: https://faucet.polygon.technology/
   - Get free MATIC for gas fees
   - Wait ~1 minute for confirmation

## 🚀 Deploy

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

**After deployment:**

1. Copy the contract address
2. Update `Frontend/.env`:
   ```
   EXPO_PUBLIC_TOKEN_ADDRESS=0xYourContractAddress
   ```

## 🧪 Test

Run tests locally:

```bash
npx hardhat test
```

Expected output:

```
PayToken
  Deployment
    ✓ Should set the right name and symbol
    ✓ Should mint initial supply to owner
    ✓ Should have 18 decimals
  Faucet
    ✓ Should allow user to claim faucet
    ✓ Should emit FaucetClaimed event
    ✓ Should not allow claiming twice within 24 hours
    ✓ Should allow claiming after cooldown
  Transfers
    ✓ Should transfer tokens between accounts
```

## 📝 Contract Details

### PayToken (PAY)

- **Name:** PayToken
- **Symbol:** PAY
- **Decimals:** 18
- **Network:** Polygon Mumbai Testnet
- **Chain ID:** 80001

### Faucet Function

Users can claim **100 PAY tokens** for free:

- Cooldown: 24 hours between claims
- No cost (just gas fees)
- Perfect for testing

```solidity
function faucet() external;
```

### Key Functions

```solidity
// Claim free tokens (100 PAY)
function faucet() external;

// Check if can claim
function canClaimFaucet(address account) external view returns (bool);

// Time until next claim
function timeUntilNextClaim(address account) external view returns (uint256);

// Standard ERC-20 functions
function transfer(address to, uint256 amount) external returns (bool);
function balanceOf(address account) external view returns (uint256);
```

## 🔗 Useful Links

- **Mumbai Explorer:** https://mumbai.polygonscan.com/
- **Mumbai Faucet:** https://faucet.polygon.technology/
- **Hardhat Docs:** https://hardhat.org/docs

## 💰 Cost

**Total Cost: $0.00**

- Mumbai testnet is FREE
- Get MATIC from faucet
- No deployment fees

---

Built for CryptoPay MVP 🚀
