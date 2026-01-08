/**
 * CryptoPay Relayer Service
 * Path B - Advanced: Platform-Subsidized Gasless Transactions
 * 
 * This service receives signed messages from users and submits them
 * as blockchain transactions, paying the gas fees on behalf of users.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting (prevent abuse)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/relay', limiter);

// PayToken ABI (only functions we need)
const PAY_TOKEN_ABI = [
  "function executeMetaTransaction(address from, address to, uint256 amount, uint256 nonce, bytes signature) external returns (bool)",
  "function getNonce(address account) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "event MetaTransactionExecuted(address indexed from, address indexed to, uint256 amount, uint256 nonce)"
];

// Initialize blockchain connection
let provider;
let relayerWallet;
let payTokenContract;

function initializeBlockchain() {
  try {
    // Connect to Polygon Amoy
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Relayer wallet (pays gas fees)
    relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
    
    // PayToken contract instance
    payTokenContract = new ethers.Contract(
      process.env.PAY_TOKEN_ADDRESS,
      PAY_TOKEN_ABI,
      relayerWallet
    );
    
    console.log('✅ Blockchain initialized');
    console.log(`📍 Relayer address: ${relayerWallet.address}`);
    console.log(`📍 PayToken contract: ${process.env.PAY_TOKEN_ADDRESS}`);
  } catch (error) {
    console.error('❌ Failed to initialize blockchain:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const balance = await provider.getBalance(relayerWallet.address);
    const balanceMatic = ethers.formatEther(balance);
    
    res.json({
      status: 'healthy',
      relayer: relayerWallet.address,
      balance: `${balanceMatic} MATIC`,
      lowBalance: parseFloat(balanceMatic) < parseFloat(process.env.LOW_BALANCE_THRESHOLD || '1'),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Relay meta-transaction endpoint
app.post('/relay', async (req, res) => {
  try {
    const { from, to, amount, nonce, signature } = req.body;
    
    // Validate input
    if (!from || !to || !amount || nonce === undefined || !signature) {
      return res.status(400).json({
        error: 'Missing required fields: from, to, amount, nonce, signature'
      });
    }
    
    // Validate addresses
    if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
      return res.status(400).json({
        error: 'Invalid address format'
      });
    }
    
    // Validate signature format
    if (!signature.startsWith('0x') || signature.length !== 132) {
      return res.status(400).json({
        error: 'Invalid signature format'
      });
    }
    
    // Check relayer balance
    const relayerBalance = await provider.getBalance(relayerWallet.address);
    if (relayerBalance < ethers.parseEther('0.01')) {
      console.error('⚠️ Low relayer balance:', ethers.formatEther(relayerBalance));
      return res.status(503).json({
        error: 'Service temporarily unavailable - low gas balance'
      });
    }
    
    // Verify nonce matches contract
    const expectedNonce = await payTokenContract.getNonce(from);
    if (BigInt(nonce) !== expectedNonce) {
      return res.status(400).json({
        error: 'Invalid nonce',
        expected: expectedNonce.toString(),
        received: nonce.toString()
      });
    }
    
    // Check user has sufficient PAY balance
    const userBalance = await payTokenContract.balanceOf(from);
    const amountBigInt = ethers.parseUnits(amount.toString(), 18);
    if (userBalance < amountBigInt) {
      return res.status(400).json({
        error: 'Insufficient PAY balance',
        balance: ethers.formatUnits(userBalance, 18),
        required: amount.toString()
      });
    }
    
    console.log(`📤 Relaying transaction: ${from} → ${to} (${amount} PAY)`);
    
    // Execute meta-transaction (relayer pays gas)
    const tx = await payTokenContract.executeMetaTransaction(
      from,
      to,
      amountBigInt,
      nonce,
      signature
    );
    
    console.log(`⏳ Transaction submitted: ${tx.hash}`);
    
    // Return immediately (don't wait for confirmation)
    res.json({
      success: true,
      txHash: tx.hash,
      from: from,
      to: to,
      amount: amount,
      nonce: nonce,
      relayer: relayerWallet.address,
      timestamp: new Date().toISOString()
    });
    
    // Wait for confirmation in background
    tx.wait().then((receipt) => {
      console.log(`✅ Transaction confirmed: ${receipt.hash} (Block ${receipt.blockNumber})`);
    }).catch((error) => {
      console.error(`❌ Transaction failed: ${tx.hash}`, error);
    });
    
  } catch (error) {
    console.error('❌ Relay error:', error);
    
    // Map errors to user-friendly messages
    let errorMessage = 'Transaction failed';
    if (error.message?.includes('Invalid signature')) {
      errorMessage = 'Invalid signature';
    } else if (error.message?.includes('Invalid nonce')) {
      errorMessage = 'Invalid nonce - transaction already processed';
    } else if (error.message?.includes('insufficient funds')) {
      errorMessage = 'Insufficient balance';
    }
    
    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get nonce for address
app.get('/nonce/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    const nonce = await payTokenContract.getNonce(address);
    
    res.json({
      address: address,
      nonce: nonce.toString()
    });
  } catch (error) {
    console.error('Error getting nonce:', error);
    res.status(500).json({ error: 'Failed to get nonce' });
  }
});

// Transaction status endpoint
app.get('/tx/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    const receipt = await provider.getTransactionReceipt(hash);
    
    if (!receipt) {
      return res.json({
        status: 'pending',
        txHash: hash
      });
    }
    
    res.json({
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      txHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ error: 'Failed to get transaction status' });
  }
});

// Relayer stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const balance = await provider.getBalance(relayerWallet.address);
    const blockNumber = await provider.getBlockNumber();
    
    res.json({
      relayer: relayerWallet.address,
      balance: ethers.formatEther(balance),
      currentBlock: blockNumber,
      chainId: process.env.CHAIN_ID,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize and start server
initializeBlockchain();

app.listen(PORT, () => {
  console.log(`🚀 CryptoPay Relayer Service running on port ${PORT}`);
  console.log(`📡 Network: Polygon Amoy (Chain ID: ${process.env.CHAIN_ID})`);
  console.log(`⛽ Gas fees paid by: ${relayerWallet.address}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
