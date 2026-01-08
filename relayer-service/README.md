# CryptoPay Relayer Service

**Path B - Advanced**: Platform-Subsidized Gasless Transactions

## Overview

This backend service enables **gasless payments** for CryptoPay users. Users sign messages, and the relayer submits them as blockchain transactions, paying gas fees on their behalf.

## How It Works

```
User's Phone                 Relayer Service              Blockchain
     │                              │                          │
     │  1. Sign payment message     │                          │
     │────────────────────────────>│                          │
     │                              │                          │
     │                              │  2. Verify signature     │
     │                              │     Check nonce          │
     │                              │                          │
     │                              │  3. Wrap in transaction  │
     │                              │────────────────────────>│
     │                              │     (Relayer pays gas)   │
     │                              │                          │
     │  4. Return tx hash           │  5. Confirm transaction  │
     │<─────────────────────────────│<────────────────────────│
     │                              │                          │
```

## Installation

```bash
cd Blockchain/relayer-service
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Fill in your configuration:

   ```env
   RPC_URL=https://rpc-amoy.polygon.technology
   CHAIN_ID=80002
   PAY_TOKEN_ADDRESS=0xfC2f2614dF998f9b07075A5a02939825E6cde04a
   RELAYER_PRIVATE_KEY=your_private_key_here
   PORT=3000
   ```

3. **Fund the relayer wallet with MATIC** (for gas fees):
   ```bash
   # Get MATIC from Polygon Amoy faucet
   # Send to your relayer wallet address
   ```

## Running the Service

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "relayer": "0x...",
  "balance": "10.5 MATIC",
  "lowBalance": false,
  "timestamp": "2024-12-20T10:30:00Z"
}
```

---

### Relay Meta-Transaction

```http
POST /relay
Content-Type: application/json
```

**Request Body:**

```json
{
  "from": "0xUSER_ADDRESS",
  "to": "0xMERCHANT_ADDRESS",
  "amount": "50",
  "nonce": "0",
  "signature": "0x..."
}
```

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
