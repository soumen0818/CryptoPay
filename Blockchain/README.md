# ⛓ CryptoPay Blockchain

> Smart contracts powering the CryptoPay payment ecosystem on Polygon Amoy Testnet

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.28-yellow.svg)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.4-blue.svg)](https://openzeppelin.com/)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy-purple.svg)](https://polygon.technology/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Smart Contracts](#-smart-contracts)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contract Verification](#-contract-verification)
- [Integration](#-integration)
- [Network Information](#-network-information)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

The CryptoPay blockchain layer consists of Ethereum-compatible smart contracts deployed on Polygon Amoy testnet. The primary contract is **PayToken**, an ERC-20 token with enhanced features for testing and gasless transactions.

**Key Components:**

- 🪙 **PayToken (PAY)** - ERC-20 token with faucet functionality
- 🚀 **Meta-Transactions** - EIP-2771 compatible for gasless payments
- 🧪 **Testing Suite** - Comprehensive contract tests
- 📝 **Deployment Scripts** - Automated deployment to testnets

---

## 📜 Smart Contracts

### PayToken.sol

**Location:** `contracts/PayToken.sol`

A feature-rich ERC-20 token designed for the CryptoPay ecosystem.

#### Inheritance

```solidity
PayToken is ERC20, Ownable
```

#### Key Features

1. **Standard ERC-20 Functionality**

   - Transfer tokens
   - Approve spending
   - TransferFrom for delegated transfers

2. **Faucet System**

   - Users can claim 100 PAY tokens
   - 24-hour cooldown between claims
   - Perfect for testing without needing airdrops

3. **Meta-Transactions (EIP-2771)**

   - Execute transfers without gas fees
   - User signs message, relayer pays gas
   - Prevents replay attacks with nonces

4. **Access Control**
   - Owner can update relayer address
   - Ownable pattern for admin functions

#### Constructor Parameters

```solidity
constructor(address _relayer)
```

- `_relayer`: Address of the trusted relayer service (can be updated later)

#### Initial Supply

- **1,000,000 PAY** tokens minted to deployer on contract creation

---

## ✨ Features

### 🎁 Faucet Function

```solidity
function faucet() external
```

**Behavior:**

- Awards **100 PAY** tokens to caller
- Enforces 24-hour cooldown per address
- Emits `FaucetClaimed` event
- Free to call (only gas fees apply)

**Example Usage:**

```javascript
const tx = await payToken.faucet();
await tx.wait();
console.log("Claimed 100 PAY tokens!");
```

**Error Cases:**

- `"Faucet cooldown not met"` - Must wait 24 hours between claims

### ⚡ Meta-Transactions

```solidity
function executeMetaTransaction(
    address from,
    address to,
    uint256 amount,
    uint256 nonce,
    bytes calldata signature
) external
```

**Parameters:**

- `from` - Sender's wallet address
- `to` - Recipient's wallet address
- `amount` - Amount in wei (18 decimals)
- `nonce` - Current nonce for sender (prevents replay)
- `signature` - EIP-712 signature from sender

**Requirements:**

- Only callable by trusted relayer
- Signature must be valid
- Nonce must match current nonce
- Sender must have sufficient balance

**Emits:** `MetaTransactionExecuted` event

**Use Case:**
Users sign payment requests off-chain. The relayer service submits the transaction on-chain, paying gas fees on behalf of users. This enables a "gasless" UX where users never need MATIC.

### 🔐 Relayer Management

```solidity
function setRelayer(address _newRelayer) external onlyOwner
```

Update the trusted relayer address. Only contract owner can call.

**Emits:** `RelayerUpdated` event

---

## 📋 Prerequisites

- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`
- **Wallet with Private Key** (MetaMask, etc.)
- **Test MATIC** for gas fees ([Get from faucet](https://faucet.polygon.technology/))

---

## 📥 Installation

### 1. Navigate to Blockchain Directory

```bash
cd CryptoPay/Blockchain
```

### 2. Install Dependencies

```bash
npm install
```

This installs:

- Hardhat development environment
- OpenZeppelin contract libraries
- Ethers.js v6 for blockchain interactions
- Testing utilities (Chai, Mocha)
- TypeChain for type-safe contract interfaces

---

## ⚙️ Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your settings:

```env
# Deployer wallet private key (NEVER commit this!)
PRIVATE_KEY=your_wallet_private_key_here

# RPC URLs
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# Polygon Chain IDs
AMOY_CHAIN_ID=80002
MUMBAI_CHAIN_ID=80001

# Relayer address (can be same as deployer for testing)
RELAYER_ADDRESS=0xYourRelayerAddressHere

# Optional: For contract verification
POLYGONSCAN_API_KEY=your_api_key_here
```

**⚠️ Security Warning:**

- **NEVER** commit `.env` to version control
- Keep your `PRIVATE_KEY` secure
- Use a dedicated wallet for testnet deployments

### 3. Fund Your Wallet

Get test MATIC from the Polygon faucet:

- Visit: [https://faucet.polygon.technology/](https://faucet.polygon.technology/)
- Select **Polygon Amoy Testnet**
- Enter your wallet address
- Request tokens (0.1-0.5 MATIC should be enough)
- Wait 1-2 minutes for confirmation

---

## 🚀 Deployment

### Deploy to Polygon Amoy

```bash
npx hardhat run scripts/deploy.js --network amoy
```

**Expected Output:**

```
Deploying PayToken...
Relayer address: 0x123...
PayToken deployed to: 0xabc123...
Transaction hash: 0xdef456...
✅ Deployment successful!
```

### Deploy to Local Network (Testing)

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.js --network localhost
```

### Deployment Script Breakdown

**File:** `scripts/deploy.js`

```javascript
1. Load environment variables
2. Get deployer wallet and relayer address
3. Deploy PayToken with relayer parameter
4. Wait for deployment confirmation
5. Log contract address and transaction hash
6. Return deployed contract instance
```

### Post-Deployment Steps

1. **Copy Contract Address**

   ```
   PayToken deployed to: 0xabc123...
   ```

2. **Update App Configuration**

   Edit `App/.env`:

   ```env
   EXPO_PUBLIC_TOKEN_ADDRESS=0xabc123...
   ```

3. **Update Relayer Configuration**

   Edit `relayer-service/.env`:

   ```env
   PAY_TOKEN_ADDRESS=0xabc123...
   ```

4. **Verify Deployment**

   Check on Polygonscan:

   ```
   https://amoy.polygonscan.com/address/0xabc123...
   ```

---

## 🧪 Testing

### Run All Tests

```bash
npx hardhat test
```

### Run Specific Test

```bash
npx hardhat test test/PayToken.test.js
```

### Test Coverage

```bash
npx hardhat coverage
```

### Expected Test Results

```
PayToken Contract Tests

  Deployment
    ✓ Should set the correct name and symbol (45ms)
    ✓ Should mint initial supply to owner (52ms)
    ✓ Should set the deployer as owner (38ms)
    ✓ Should have 18 decimals (21ms)
    ✓ Should set the relayer address correctly (29ms)

  Faucet Functionality
    ✓ Should allow users to claim faucet tokens (89ms)
    ✓ Should emit FaucetClaimed event (76ms)
    ✓ Should prevent claiming twice within 24 hours (95ms)
    ✓ Should allow claiming after cooldown period (412ms)
    ✓ Should transfer correct amount (100 PAY) (68ms)

  Meta-Transactions
    ✓ Should execute meta-transaction with valid signature (234ms)
    ✓ Should emit MetaTransactionExecuted event (187ms)
    ✓ Should increment nonce after execution (156ms)
    ✓ Should reject invalid signature (92ms)
    ✓ Should reject incorrect nonce (78ms)
    ✓ Should only allow relayer to execute (67ms)
    ✓ Should prevent replay attacks (145ms)

  Relayer Management
    ✓ Should allow owner to update relayer (89ms)
    ✓ Should emit RelayerUpdated event (72ms)
    ✓ Should reject non-owner relayer update (45ms)
    ✓ Should reject zero address as relayer (38ms)

  Standard ERC-20 Transfers
    ✓ Should transfer tokens between accounts (112ms)
    ✓ Should fail transfer with insufficient balance (56ms)
    ✓ Should update balances correctly (98ms)
    ✓ Should approve and transferFrom (178ms)

  25 passing (2.8s)
```

### Test File Structure

**File:** `test/PayToken.test.js`

```javascript
describe("PayToken", () => {
  // Test deployment
  // Test faucet functionality
  // Test meta-transactions
  // Test relayer management
  // Test standard ERC-20 operations
});
```

---

## ✅ Contract Verification

Verify your contract on Polygonscan for transparency and to enable web interactions.

### Automatic Verification

```bash
npx hardhat verify --network amoy 0xYourContractAddress "0xRelayerAddress"
```

### Manual Verification

1. Go to [https://amoy.polygonscan.com/](https://amoy.polygonscan.com/)
2. Search for your contract address
3. Click **Contract** → **Verify and Publish**
4. Select:
   - Compiler: `v0.8.20+commit.a1b79de6`
   - License: `MIT`
5. Upload `contracts/PayToken.sol`
6. Constructor ABI: `["address"]`
7. Constructor Arguments: (auto-encoded relayer address)
8. Submit

**Verification allows:**

- Read contract data without RPC calls
- Write functions via Polygonscan UI
- Source code transparency
- Better debugging

---

## 🔗 Integration

### Using Ethers.js v6

```javascript
import { ethers } from "ethers";
import PayTokenABI from "./artifacts/contracts/PayToken.sol/PayToken.json";

// Setup provider
const provider = new ethers.JsonRpcProvider(
  "https://rpc-amoy.polygon.technology"
);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Connect to contract
const payToken = new ethers.Contract(TOKEN_ADDRESS, PayTokenABI.abi, wallet);

// Get balance
const balance = await payToken.balanceOf(wallet.address);
console.log(`Balance: ${ethers.formatUnits(balance, 18)} PAY`);

// Transfer tokens
const tx = await payToken.transfer(
  recipientAddress,
  ethers.parseUnits("10", 18)
);
await tx.wait();
console.log("Transfer complete!");

// Claim faucet
const faucetTx = await payToken.faucet();
await faucetTx.wait();
console.log("Claimed 100 PAY tokens!");
```

### Contract ABI Location

After compilation:

```
artifacts/contracts/PayToken.sol/PayToken.json
```

Import in your app:

```javascript
const PayTokenABI = require("./artifacts/contracts/PayToken.sol/PayToken.json");
const abi = PayTokenABI.abi;
```

---

## 🌐 Network Information

### Polygon Amoy Testnet (Current)

| Property           | Value                               |
| ------------------ | ----------------------------------- |
| **Network Name**   | Polygon Amoy Testnet                |
| **Chain ID**       | 80002                               |
| **Currency**       | MATIC                               |
| **RPC URL**        | https://rpc-amoy.polygon.technology |
| **Block Explorer** | https://amoy.polygonscan.com        |
| **Faucet**         | https://faucet.polygon.technology/  |

### Mumbai Testnet (Legacy - Deprecated)

⚠️ **Mumbai is being phased out. Use Amoy for new deployments.**

| Property           | Value                             |
| ------------------ | --------------------------------- |
| **Network Name**   | Polygon Mumbai Testnet            |
| **Chain ID**       | 80001                             |
| **RPC URL**        | https://rpc-mumbai.maticvigil.com |
| **Block Explorer** | https://mumbai.polygonscan.com    |

### Add Network to MetaMask

1. Open MetaMask → Networks → Add Network
2. Fill in Amoy details from table above
3. Click Save
4. Switch to Polygon Amoy network

---

## 📊 Contract Details

### PayToken (PAY)

| Property          | Value                   |
| ----------------- | ----------------------- |
| **Token Name**    | PayToken                |
| **Symbol**        | PAY                     |
| **Decimals**      | 18                      |
| **Total Supply**  | 1,000,000 PAY (initial) |
| **Faucet Amount** | 100 PAY                 |
| **Cooldown**      | 24 hours                |
| **Standard**      | ERC-20 + EIP-2771       |

### Gas Estimates

| Operation        | Estimated Gas | Cost (at 30 gwei) |
| ---------------- | ------------- | ----------------- |
| Deploy Contract  | ~2,000,000    | ~0.06 MATIC       |
| Transfer         | ~50,000       | ~0.0015 MATIC     |
| Claim Faucet     | ~80,000       | ~0.0024 MATIC     |
| Meta-Transaction | ~90,000       | ~0.0027 MATIC     |
| Approve          | ~46,000       | ~0.0014 MATIC     |

**Note:** Polygon testnet gas prices are very low. Actual costs may vary.

---

## 🐛 Troubleshooting

### Issue: "Insufficient funds for gas"

**Solution:**

- Get more test MATIC from faucet
- Check wallet balance: `npx hardhat run scripts/checkBalance.js --network amoy`
- Ensure you're using the correct network

### Issue: "Nonce too high" or "already known"

**Solution:**

```bash
# Reset Hardhat cache
npx hardhat clean

# Or reset MetaMask nonce (Settings → Advanced → Reset Account)
```

### Issue: "Contract deployment failed"

**Solution:**

- Verify RPC URL is accessible
- Check PRIVATE_KEY is valid (64 hex characters)
- Ensure wallet has MATIC for gas
- Try again with higher gas limit

### Issue: "Cannot find module './artifacts/...'"

**Solution:**

```bash
# Compile contracts first
npx hardhat compile
```

### Issue: "HH8: Invalid account private key"

**Solution:**

- Check `.env` file exists and has correct PRIVATE_KEY
- Private key should NOT have `0x` prefix
- Ensure no extra spaces or newlines

### Issue: "Faucet cooldown not met"

**Solution:**

- Wait 24 hours between faucet claims
- Or use a different wallet address
- Check last claim time:
  ```javascript
  const lastClaim = await payToken.lastFaucetClaim(address);
  console.log(new Date(lastClaim * 1000));
  ```

---

## 📝 Scripts

### Available Hardhat Scripts

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Start local node
npx hardhat node

# Deploy
npx hardhat run scripts/deploy.js --network <network>

# Verify contract
npx hardhat verify --network <network> <address> <constructor-args>

# Clean artifacts
npx hardhat clean

# Check account balance
npx hardhat run scripts/checkBalance.js --network <network>
```

---

## 🗂 Project Structure

```
Blockchain/
├── contracts/
│   └── PayToken.sol           # Main ERC-20 token contract
│
├── scripts/
│   └── deploy.js              # Deployment script
│
├── test/
│   └── PayToken.test.js       # Comprehensive test suite
│
├── artifacts/                 # Compiled contracts (auto-generated)
│   └── contracts/
│       └── PayToken.sol/
│           └── PayToken.json  # ABI + bytecode
│
├── cache/                     # Hardhat cache (auto-generated)
│
├── hardhat.config.js          # Hardhat configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

---

## 🔮 Future Enhancements

- [ ] Upgradeable contracts (UUPS pattern)
- [ ] Multi-token support (USDC, DAI)
- [ ] Gasless approval (Permit - EIP-2612)
- [ ] Batch transfers for merchants
- [ ] Staking/rewards mechanism
- [ ] Mainnet deployment

---

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [EIP-2771: Meta Transactions](https://eips.ethereum.org/EIPS/eip-2771)
- [ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20)
- [Polygon Developer Docs](https://docs.polygon.technology/)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6/)

---

## 🤝 Support

For blockchain-specific issues:

1. Check [Troubleshooting](#-troubleshooting) section
2. Review Hardhat documentation
3. Inspect transaction on Polygonscan
4. Open an issue on GitHub repository

---

## 📄 License

This project is part of the CryptoPay ecosystem. See main repository for license details.

---

**Built with ⚡ Hardhat & OpenZeppelin**
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
```
