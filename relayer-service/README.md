# 🚀 CryptoPay Relayer Service

> Backend service enabling gasless blockchain transactions for CryptoPay users

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![Ethers.js](https://img.shields.io/badge/Ethers-6.9-purple.svg)](https://docs.ethers.org/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [How It Works](#-how-it-works)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Service](#-running-the-service)
- [API Endpoints](#-api-endpoints)
- [Security](#-security)
- [Monitoring](#-monitoring)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

The CryptoPay Relayer Service is a backend Node.js application that enables **gasless transactions** (meta-transactions) for CryptoPay users. Instead of users paying gas fees in MATIC, they sign payment messages off-chain. The relayer service then submits these signed messages as blockchain transactions, subsidizing the gas costs.

**This implements Path B (Advanced) of the payment flow:**

- Users never need to hold MATIC
- Platform pays gas fees on behalf of users
- Seamless UPI-like experience
- Backend cost: ~$0.001 per transaction on testnets

---

## 💡 How It Works

### Transaction Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Meta-Transaction Flow                        │
└─────────────────────────────────────────────────────────────────────┘

   User's Phone              Relayer Service           PayToken Contract
        │                           │                          │
        │  1. Create payment        │                          │
        │     (to, amount)          │                          │
        │                           │                          │
        │  2. Get current nonce     │                          │
        │  ─────────────────────>  │                          │
        │  <─────────────────────  │                          │
        │     { nonce: 5 }          │                          │
        │                           │                          │
        │  3. Sign EIP-712 message  │                          │
        │     (from, to, amount,    │                          │
        │      nonce, signature)    │                          │
        │                           │                          │
        │  4. POST /relay           │                          │
        │  ─────────────────────>  │                          │
        │                           │  5. Verify signature     │
        │                           │     Recover signer       │
        │                           │     Check nonce          │
        │                           │                          │
        │                           │  6. executeMetaTransaction()
        │                           │  ──────────────────────> │
        │                           │     (Relayer pays gas)   │
        │                           │                          │
        │                           │  7. Transaction mined     │
        │                           │  <────────────────────── │
        │                           │                          │
        │  8. Return tx hash        │                          │
        │  <─────────────────────  │                          │
        │     { txHash: "0x..." }   │                          │
        │                           │                          │
        │  9. Poll for receipt      │                          │
        │  ─────────────────────>  │                          │
        │  <─────────────────────  │                          │
        │     { status: "success" } │                          │
        │                           │                          │
```

### Key Points

1. **User Never Pays Gas**: User only signs a message (free operation)
2. **Signature Verification**: Relayer verifies the signature matches the sender
3. **Nonce Protection**: Prevents replay attacks
4. **Platform Subsidizes**: Relayer wallet pays MATIC gas fees
5. **Cost-Effective**: Testnet gas is negligible; mainnet ~$0.01/tx

---

## ✨ Features

### Core Functionality

- ✅ **Meta-Transaction Relay** - Execute signed transactions on-chain
- ✅ **Signature Verification** - EIP-712 compliant signature recovery
- ✅ **Nonce Management** - Track and validate transaction nonces
- ✅ **Transaction Status** - Check pending/confirmed transaction status

### Security Features

- 🔒 **Rate Limiting** - Prevent abuse (100 requests/minute)
- 🔒 **CORS Protection** - Restrict cross-origin requests
- 🔒 **Helmet.js** - Security headers (XSS, clickjacking protection)
- 🔒 **Input Validation** - Sanitize all inputs
- 🔒 **Signature Verification** - Cryptographic proof of authorization

### Monitoring & Alerts

- 📊 **Health Checks** - `/health` endpoint for uptime monitoring
- 📊 **Balance Monitoring** - Track relayer MATIC balance
- 📊 **Low Balance Alerts** - Email notifications when balance < 0.1 MATIC
- 📊 **Transaction Logging** - Console logs for debugging

### Developer Experience

- 🛠 **Hot Reload** - Nodemon for development
- 🛠 **Environment Variables** - Flexible configuration
- 🛠 **Error Handling** - Descriptive error messages
- 🛠 **CORS Enabled** - Easy frontend integration

---

## 📋 Prerequisites

- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`
- **Deployed PayToken Contract** (see [Blockchain README](../Blockchain/README.md))
- **Relayer Wallet with MATIC** (for gas fees)
- **(Optional) Gmail Account** for email alerts

---

## 📥 Installation

### 1. Navigate to Relayer Service Directory

```bash
cd CryptoPay/relayer-service
```

### 2. Install Dependencies

```bash
npm install
```

This installs:

- **express** - Web server framework
- **ethers** - Blockchain interactions
- **cors** - Cross-origin resource sharing
- **helmet** - Security middleware
- **express-rate-limit** - API rate limiting
- **nodemailer** - Email notifications
- **dotenv** - Environment variable management

---

## ⚙️ Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env`:

```env
# Blockchain Network
RPC_URL=https://rpc-amoy.polygon.technology
CHAIN_ID=80002

# Smart Contract
PAY_TOKEN_ADDRESS=0xYourDeployedTokenAddress

# Relayer Wallet (KEEP SECRET!)
RELAYER_PRIVATE_KEY=your_relayer_private_key_without_0x_prefix

# Server Configuration
PORT=3000
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000        # 1 minute
RATE_LIMIT_MAX_REQUESTS=100       # 100 requests per window

# Balance Monitoring
MIN_BALANCE_THRESHOLD=0.1         # Alert when < 0.1 MATIC

# Email Alerts (Optional)
ALERT_EMAIL=your-email@gmail.com  # Recipient for alerts
EMAIL_USER=your-email@gmail.com   # Gmail account
EMAIL_PASS=your-app-password      # Gmail App Password (not regular password!)
```

### 3. Setup Relayer Wallet

**Option A: Use Existing Wallet**

- Export private key from MetaMask (Account → ... → Export Private Key)
- Remove `0x` prefix and add to `.env`

**Option B: Create New Wallet**

```javascript
// In Node.js console
const { ethers } = require("ethers");
const wallet = ethers.Wallet.createRandom();
console.log("Address:", wallet.address);
console.log("Private Key:", wallet.privateKey.slice(2)); // Remove 0x
```

**Important:** Keep this wallet separate from your personal wallet!

### 4. Fund Relayer Wallet

Get test MATIC from Polygon faucet:

1. Visit [https://faucet.polygon.technology/](https://faucet.polygon.technology/)
2. Select **Polygon Amoy Testnet**
3. Enter your relayer wallet address
4. Request tokens (0.5-1 MATIC recommended)
5. Wait for confirmation

**Estimate:** 1 MATIC = ~1000 transactions on testnet

### 5. Update Smart Contract (If Not Done)

Ensure the relayer address is set in the PayToken contract:

```javascript
// Using Hardhat console or Ethers.js
const payToken = await ethers.getContractAt("PayToken", TOKEN_ADDRESS);
await payToken.setRelayer(RELAYER_ADDRESS);
```

Or if you deployed with relayer address in constructor, you're all set!

---

## 🚀 Running the Service

### Development Mode (with auto-reload)

```bash
npm run dev
```

**Output:**

```
🚀 Relayer service starting...
📧 Email alerts enabled
🔗 Connected to Polygon Amoy (Chain ID: 80002)
📍 PayToken address: 0xabc123...
💰 Relayer balance: 0.85 MATIC
✅ Relayer service running on port 3000
```

### Production Mode

```bash
npm start
```

### Test Health Endpoint

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "healthy",
  "relayer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balance": "0.85 MATIC",
  "lowBalance": false,
  "timestamp": "2026-01-11T10:30:00.000Z"
}
```

---

## 📡 API Endpoints

### 1. Health Check

```http
GET /health
```

**Description:** Check if relayer service is running and has sufficient balance.

**Response:**

```json
{
  "status": "healthy",
  "relayer": "0x...",
  "balance": "0.85 MATIC",
  "lowBalance": false,
  "timestamp": "2026-01-11T10:30:00.000Z"
}
```

**Status Codes:**

- `200 OK` - Service healthy
- `500 Internal Server Error` - Service error

---

### 2. Relay Meta-Transaction

```http
POST /relay
Content-Type: application/json
```

**Description:** Submit a signed meta-transaction for on-chain execution.

**Request Body:**

```json
{
  "from": "0x1234567890123456789012345678901234567890",
  "to": "0x0987654321098765432109876543210987654321",
  "amount": "1000000000000000000",
  "nonce": 5,
  "signature": "0xabcdef..."
}
```

**Parameters:**

- `from` _(string)_ - Sender's wallet address (must match signature)
- `to` _(string)_ - Recipient's wallet address
- `amount` _(string)_ - Amount in wei (e.g., "1000000000000000000" = 1 PAY)
- `nonce` _(number)_ - Current nonce for sender (get from `/nonce/:address`)
- `signature` _(string)_ - EIP-712 signature (hex string with 0x prefix)

**Success Response (202 Accepted):**

```json
{
  "success": true,
  "txHash": "0xdef456...",
  "message": "Transaction submitted successfully"
}
```

**Error Responses:**

**400 Bad Request** - Invalid input

```json
{
  "error": "Invalid signature"
}
```

**403 Forbidden** - Verification failed

```json
{
  "error": "Signature verification failed"
}
```

**500 Internal Server Error** - Blockchain error

```json
{
  "error": "Transaction failed: insufficient funds"
}
```

---

### 3. Get Nonce

```http
GET /nonce/:address
```

**Description:** Get the current nonce for an address (required for signing).

**Parameters:**

- `address` _(path)_ - Ethereum address (e.g., `0x123...`)

**Response:**

```json
{
  "nonce": 5
}
```

**Example:**

```bash
curl http://localhost:3000/nonce/0x1234567890123456789012345678901234567890
```

---

### 4. Get Transaction Status

```http
GET /transaction/:txHash
```

**Description:** Check the status of a relayed transaction.

**Parameters:**

- `txHash` _(path)_ - Transaction hash (e.g., `0xdef456...`)

**Response (Pending):**

```json
{
  "status": "pending",
  "txHash": "0xdef456..."
}
```

**Response (Confirmed):**

```json
{
  "status": "success",
  "txHash": "0xdef456...",
  "blockNumber": 12345678,
  "gasUsed": "85432",
  "from": "0x...",
  "to": "0x..."
}
```

**Response (Failed):**

```json
{
  "status": "failed",
  "txHash": "0xdef456...",
  "error": "Transaction reverted"
}
```

---

## 🔒 Security

### Rate Limiting

**Default Configuration:**

- **Window:** 1 minute (60,000 ms)
- **Max Requests:** 100 per window

Exceeding rate limit returns:

```json
{
  "error": "Too many requests, please try again later"
}
```

**Adjust in `.env`:**

```env
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Signature Verification Process

1. **Recover Signer**: Extract Ethereum address from signature
2. **Match Sender**: Verify recovered address === `from` parameter
3. **Check Nonce**: Ensure nonce matches on-chain nonce (prevents replay)
4. **Validate Balance**: Sender must have sufficient PAY tokens
5. **Execute**: Submit to blockchain only if all checks pass

### Private Key Protection

⚠️ **NEVER commit `.env` to version control!**

- Add `.env` to `.gitignore`
- Use environment variables in production
- Rotate keys periodically
- Use separate wallets for dev/prod

### CORS Configuration

Current: **Allows all origins** (`*`)

**Production Recommendation:**

```javascript
// In server.js
app.use(
  cors({
    origin: "https://your-frontend-domain.com",
    methods: ["GET", "POST"],
  })
);
```

---

## 📊 Monitoring

### Health Monitoring

**Endpoint:** `GET /health`

Use this endpoint with uptime monitoring services:

- [UptimeRobot](https://uptimerobot.com/)
- [Pingdom](https://www.pingdom.com/)
- [Render Health Checks](https://render.com/docs/health-checks)

**Alert Conditions:**

- HTTP status !== 200
- `lowBalance === true`
- No response within 10 seconds

### Email Alerts

When relayer balance drops below `MIN_BALANCE_THRESHOLD`:

**Email Content:**

```
Subject: ⚠️ CryptoPay Relayer Low Balance Alert

Your relayer service is running low on MATIC!

Current Balance: 0.08 MATIC
Threshold: 0.1 MATIC
Relayer Address: 0x742d35Cc...

Please fund the relayer wallet to avoid service interruption.
```

**Setup Gmail App Password:**

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to **App Passwords**
4. Generate password for "Mail"
5. Use generated password in `EMAIL_PASS` (not your Gmail password!)

### Console Logging

Development mode logs all activity:

```
[2026-01-11 10:30:15] POST /relay
  From: 0x123...
  To: 0x456...
  Amount: 10 PAY
  Signature: 0xabc...

[2026-01-11 10:30:17] ✅ Transaction submitted: 0xdef456...
[2026-01-11 10:30:19] ⛏ Transaction mined in block 12345678
```

---

## 🌐 Deployment

### Option 1: Render (Recommended)

**Render offers free tier for backend services!**

1. **Push code to GitHub**

   ```bash
   git init
   git add .
   git commit -m "CryptoPay Relayer Service"
   git remote add origin https://github.com/yourusername/cryptopay-relayer
   git push -u origin main
   ```

2. **Create Render Account**

   - Visit [https://render.com](https://render.com)
   - Sign up (free)

3. **Deploy Service**

   - Click **New** → **Web Service**
   - Connect GitHub repository
   - **Settings:**
     - Name: `cryptopay-relayer`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Instance Type: `Free`

4. **Add Environment Variables**

   - Go to **Environment** tab
   - Add all variables from `.env`:
     - `RPC_URL`
     - `CHAIN_ID`
     - `PAY_TOKEN_ADDRESS`
     - `RELAYER_PRIVATE_KEY` (mark as secret!)
     - `PORT` (use `10000`)
     - All other variables

5. **Deploy**

   - Click **Create Web Service**
   - Wait 2-3 minutes for deployment
   - Your URL: `https://cryptopay-relayer.onrender.com`

6. **Test Deployment**
   ```bash
   curl https://cryptopay-relayer.onrender.com/health
   ```

**Free Tier Limits:**

- 750 hours/month (enough for 24/7 uptime)
- Spins down after 15 min of inactivity (first request wakes it up)
- 512 MB RAM
- More than enough for relayer service!

### Option 2: Railway

Similar to Render, also offers free tier:

1. Visit [https://railway.app](https://railway.app)
2. Deploy from GitHub
3. Add environment variables
4. Deploy

### Option 3: Heroku

1. Install Heroku CLI
2. Create `Procfile`:
   ```
   web: npm start
   ```
3. Deploy:
   ```bash
   heroku create cryptopay-relayer
   heroku config:set RPC_URL=...
   # (set all env vars)
   git push heroku main
   ```

### Option 4: VPS (DigitalOcean, AWS EC2)

**More control, requires management:**

```bash
# SSH into server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/yourusername/cryptopay-relayer
cd cryptopay-relayer

# Install dependencies
npm install --production

# Setup environment
nano .env
# (paste your configuration)

# Install PM2 (process manager)
sudo npm install -g pm2

# Start service
pm2 start server.js --name cryptopay-relayer

# Setup auto-restart on reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs cryptopay-relayer
```

### Update App Configuration

After deployment, update `App/.env`:

```env
EXPO_PUBLIC_RELAYER_URL=https://your-relayer.onrender.com
```

---

## 🐛 Troubleshooting

### Issue: "Insufficient funds for gas"

**Solution:**

- Check relayer balance: `curl http://localhost:3000/health`
- Fund relayer wallet from faucet
- Verify wallet address is correct

### Issue: "Invalid signature"

**Solutions:**

1. **Check EIP-712 domain separator matches:**

   ```javascript
   // Frontend must use exact same domain
   const domain = {
     name: "PayToken",
     version: "1",
     chainId: 80002,
     verifyingContract: TOKEN_ADDRESS,
   };
   ```

2. **Verify signature format:**

   - Must start with `0x`
   - Must be 132 characters long (0x + 130 hex chars)

3. **Check nonce is correct:**
   - Get from `/nonce/:address` before signing
   - Don't reuse old signatures

### Issue: "Transaction failed: nonce has already been used"

**Solution:**

- Replay attack detected (expected behavior)
- Get fresh nonce from API
- Sign new message
- Submit new request

### Issue: "Only relayer can execute"

**Solution:**

- Check `RELAYER_PRIVATE_KEY` in `.env` matches contract's relayer address
- Verify contract was deployed with correct relayer address
- Update relayer in contract:
  ```javascript
  await payToken.setRelayer(newRelayerAddress);
  ```

### Issue: "Cannot connect to RPC"

**Solutions:**

- Verify `RPC_URL` in `.env` is correct and accessible
- Try alternative RPC:
  - `https://rpc-amoy.polygon.technology`
  - `https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY`
- Check firewall/network restrictions

### Issue: "Email alerts not working"

**Solutions:**

1. **Gmail requires App Password:**

   - Regular password won't work
   - Enable 2FA first
   - Generate App Password in Google Account

2. **Check email configuration:**

   ```env
   ALERT_EMAIL=recipient@gmail.com
   EMAIL_USER=sender@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx  # App Password
   ```

3. **Verify console output:**
   - Should show: `📧 Email alerts enabled`
   - If not: Missing env vars

### Issue: "Port already in use"

**Solution:**

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in .env
PORT=3001
```

---

## 📝 Scripts

```json
{
  "start": "node server.js", // Production
  "dev": "nodemon server.js", // Development (auto-reload)
  "test": "jest" // Run tests
}
```

---

## 🗂 Project Structure

```
relayer-service/
├── server.js            # Main Express server
├── package.json         # Dependencies and scripts
├── .env.example         # Example environment variables
├── .env                 # Your configuration (DO NOT COMMIT!)
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

---

## 🔮 Future Enhancements

- [ ] Database for transaction history
- [ ] Gas price optimization
- [ ] Multiple relayer wallets (load balancing)
- [ ] Prometheus metrics
- [ ] Admin dashboard
- [ ] Automatic wallet top-up
- [ ] Multi-chain support

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Ethers.js v6 Documentation](https://docs.ethers.org/v6/)
- [EIP-2771: Meta Transactions](https://eips.ethereum.org/EIPS/eip-2771)
- [EIP-712: Typed Structured Data](https://eips.ethereum.org/EIPS/eip-712)
- [Render Deployment Guide](https://render.com/docs/deploy-node-express-app)

---

## 🤝 Support

For relayer-specific issues:

1. Check [Troubleshooting](#-troubleshooting) section
2. Review server logs (`pm2 logs` or console output)
3. Test health endpoint
4. Verify environment variables
5. Open an issue on GitHub repository

---

## 📄 License

This project is part of the CryptoPay ecosystem. See main repository for license details.

---

**Built with ⚡ Node.js & Express**

````

**Request Body:**

```json
{
  "from": "0xUSER_ADDRESS",
  "to": "0xMERCHANT_ADDRESS",
  "amount": "50",
  "nonce": "0",
  "signature": "0x..."
}
````

**Response:**

```json
{
  "success": true,
  "txHash": "0x...",
  "from": "0xUSER_ADDRESS",
  "to": "0xMERCHANT_ADDRESS",
  "amount": "50",
  "nonce": "0",
  "relayer": "0xRELAYER_ADDRESS",
  "timestamp": "2024-12-20T10:30:00Z"
}
```

---

### Get Nonce

```http
GET /nonce/:address
```

**Response:**

```json
{
  "address": "0xUSER_ADDRESS",
  "nonce": "5"
}
```

---

### Transaction Status

```http
GET /tx/:hash
```

**Response:**

```json
{
  "status": "confirmed",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "50000"
}
```

---

### Relayer Stats

```http
GET /stats
```

**Response:**

```json
{
  "relayer": "0x...",
  "balance": "10.5",
  "currentBlock": 12345,
  "chainId": "80002",
  "uptime": 3600,
  "timestamp": "2024-12-20T10:30:00Z"
}
```

## Security Features

### 1. Signature Verification

- Every meta-transaction requires a valid user signature
- Prevents unauthorized transactions

### 2. Nonce Management

- Each user has an incrementing nonce
- Prevents replay attacks (same signature used twice)

### 3. Rate Limiting

- Max 100 requests per minute per IP
- Prevents abuse and DDoS

### 4. Balance Checks

- Verifies user has sufficient PAY tokens
- Checks relayer has sufficient MATIC for gas

### 5. Address Validation

- All addresses validated before processing
- Prevents invalid transaction attempts

## Gas Cost Estimation

### Per Transaction

- Gas used: ~50,000 units
- Gas price: ~30 Gwei
- Cost per tx: ~0.0015 MATIC (~$0.0012 at $0.80/MATIC)

### Monthly Costs

| Transactions/Day | MATIC/Month | USD/Month (@ $0.80) |
| ---------------- | ----------- | ------------------- |
| 100              | 4.5         | $3.60               |
| 1,000            | 45          | $36                 |
| 10,000           | 450         | $360                |

### Revenue Offset

With 2% merchant fees:

- Average transaction: $20
- Fee revenue: $0.40
- Gas cost: $0.0012
- **Net profit: $0.3988 per transaction**

## Monitoring

### Check Relayer Balance

```bash
curl http://localhost:3000/health
```

### Low Balance Alert

When relayer balance < 1 MATIC, the service:

1. Returns 503 error for new transactions
2. Logs warning to console
3. (Optional) Sends email alert

### Transaction Logs

```bash
# View real-time logs
tail -f logs/relayer.log
```

## Deployment

### Option 1: VPS (DigitalOcean, AWS EC2)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <repo>
cd Blockchain/relayer-service
npm install --production

# Run with PM2
npm install -g pm2
pm2 start server.js --name cryptopay-relayer
pm2 save
pm2 startup
```

### Option 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t cryptopay-relayer .
docker run -d -p 3000:3000 --env-file .env cryptopay-relayer
```

### Option 3: Cloud Run (Google Cloud)

```bash
gcloud run deploy cryptopay-relayer \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Troubleshooting

### Issue: "Only relayer can execute meta-transactions"

**Cause**: Contract's relayer address doesn't match service wallet  
**Fix**: Update contract relayer address:

```solidity
contract.setRelayer("0xNEW_RELAYER_ADDRESS")
```

---

### Issue: "Invalid nonce"

**Cause**: User's nonce out of sync  
**Fix**: Get fresh nonce from `/nonce/:address` endpoint

---

### Issue: "Insufficient PAY balance"

**Cause**: User doesn't have enough tokens  
**Fix**: User claims from faucet or receives tokens

---

### Issue: Service returns 503

**Cause**: Relayer out of MATIC for gas  
**Fix**: Send MATIC to relayer wallet

## Testing

```bash
# Run tests
npm test

# Manual test relay endpoint
curl -X POST http://localhost:3000/relay \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0xUSER_ADDRESS",
    "to": "0xMERCHANT_ADDRESS",
    "amount": "50",
    "nonce": "0",
    "signature": "0x..."
  }'
```

## License

MIT
