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
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Email configuration (for low balance alerts)
let emailTransporter = null;
if (process.env.ALERT_EMAIL && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail', // or 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use App Password for Gmail
    }
  });
  console.log('📧 Email alerts enabled');
} else {
  console.log('⚠️ Email alerts disabled (missing EMAIL_USER or EMAIL_PASS)');
}

// Track if low balance alert was already sent (to avoid spam)
let lowBalanceAlertSent = false;

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
  "function executeMetaFaucet(address user, uint256 nonce, bytes signature) external returns (bool)",
  "function getNonce(address account) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function canClaimFaucet(address account) external view returns (bool)",
  "event MetaTransactionExecuted(address indexed from, address indexed to, uint256 amount, uint256 nonce)",
  "event FaucetClaimed(address indexed recipient, uint256 amount)"
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
    const threshold = parseFloat(process.env.LOW_BALANCE_THRESHOLD || '1');
    const isLowBalance = parseFloat(balanceMatic) < threshold;
    
    // Send email alert if balance is low and alert not sent yet
    if (isLowBalance && !lowBalanceAlertSent && emailTransporter) {
      sendLowBalanceAlert(balanceMatic, threshold);
      lowBalanceAlertSent = true;
    } else if (!isLowBalance && lowBalanceAlertSent) {
      // Reset flag when balance is topped up
      lowBalanceAlertSent = false;
    }
    
    res.json({
      status: 'healthy',
      relayer: relayerWallet.address,
      balance: `${balanceMatic} MATIC`,
      lowBalance: isLowBalance,
      threshold: `${threshold} MATIC`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * Send low balance email alert
 */
async function sendLowBalanceAlert(currentBalance, threshold) {
  if (!emailTransporter) return;
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ALERT_EMAIL,
      subject: '🚨 CryptoPay Relayer - Low MATIC Balance Alert',
      html: `
        <h2>⚠️ Relayer Wallet Low Balance Warning</h2>
        <p>Your CryptoPay relayer wallet is running low on MATIC tokens.</p>
        
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Current Balance:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${currentBalance} MATIC</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Threshold:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${threshold} MATIC</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Relayer Address:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;"><code>${relayerWallet.address}</code></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
        
        <h3>Action Required:</h3>
        <ol>
          <li><strong>Testnet:</strong> Get free MATIC from <a href="https://faucet.polygon.technology/">Polygon Faucet</a></li>
          <li><strong>Mainnet:</strong> Transfer MATIC to the relayer address above</li>
          <li>Estimated transactions remaining: ~${Math.floor(parseFloat(currentBalance) / 0.005)}</li>
        </ol>
        
        <p style="color: red;"><strong>⚠️ Gasless transactions will fail when balance reaches 0!</strong></p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated alert from your CryptoPay Relayer Service.<br>
          You will not receive another alert until the balance is topped up and drops below the threshold again.
        </p>
      `
    };
    
    await emailTransporter.sendMail(mailOptions);
    console.log(`📧 Low balance alert sent to ${process.env.ALERT_EMAIL}`);
  } catch (error) {
    console.error('❌ Failed to send email alert:', error.message);
  }
}

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
    
    // Optimize gas to reduce costs
    const gasEstimate = await payTokenContract.executeMetaTransaction.estimateGas(
      from,
      to,
      amountBigInt,
      nonce,
      signature
    );
    
    // Add 20% buffer to gas estimate
    const gasLimit = (gasEstimate * 120n) / 100n;
    
    // Execute meta-transaction with optimized gas settings
    const tx = await payTokenContract.executeMetaTransaction(
      from,
      to,
      amountBigInt,
      nonce,
      signature,
      {
        gasLimit: gasLimit, // Use estimated gas with buffer
        maxFeePerGas: ethers.parseUnits('50', 'gwei'), // Cap max fee
        maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei') // Cap priority fee
      }
    );
    
    console.log(`⏳ Transaction submitted: ${tx.hash}`);
    console.log(`⛽ Gas limit set: ${gasLimit.toString()} (estimate was ${gasEstimate.toString()})`);
    
    // Check balance after transaction
    checkBalanceAndAlert();
    
    // Wait for confirmation in background (don't block response)
    tx.wait().then((receipt) => {
      console.log(`✅ Transaction confirmed: ${receipt.hash} (Block ${receipt.blockNumber})`);
    }).catch((error) => {
      console.error(`❌ Transaction failed in background:`, error);
    });
    
    // Return immediately (don't wait for confirmation)
    return res.json({
      success: true,
      txHash: tx.hash,
      from: from,
      to: to,
      amount: amount,
      nonce: nonce,
      relayer: relayerWallet.address,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Transfer error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Transaction failed'
    });
  }
});

// Gasless faucet claim endpoint
app.post('/faucet', limiter, async (req, res) => {
  try {
    const { user, nonce, signature } = req.body;
    
    // Validate input
    if (!user || nonce === undefined || !signature) {
      return res.status(400).json({
        error: 'Missing required fields: user, nonce, signature'
      });
    }
    
    // Validate Ethereum address
    if (!ethers.isAddress(user)) {
      return res.status(400).json({ error: 'Invalid user address' });
    }
    
    console.log(`🚰 Faucet claim request from: ${user}`);
    
    // Check if user can claim
    const canClaim = await payTokenContract.canClaimFaucet(user);
    if (!canClaim) {
      return res.status(400).json({
        error: 'Please wait 24 hours between faucet claims'
      });
    }
    
    // Verify nonce matches
    const expectedNonce = await payTokenContract.getNonce(user);
    if (BigInt(nonce) !== expectedNonce) {
      return res.status(400).json({
        error: 'Invalid nonce',
        expected: expectedNonce.toString(),
        received: nonce
      });
    }
    
    // Check relayer has enough MATIC for gas
    const balance = await provider.getBalance(relayerWallet.address);
    const minGasBalance = ethers.parseEther('0.001'); // Need at least 0.001 MATIC
    if (balance < minGasBalance) {
      console.error('⚠️ Low relayer balance:', ethers.formatEther(balance));
      return res.status(503).json({
        error: 'Service temporarily unavailable - low gas balance'
      });
    }
    
    // Execute meta-faucet transaction
    console.log(`📝 Executing gasless faucet for: ${user}`);
    const tx = await payTokenContract.executeMetaFaucet(
      user,
      nonce,
      signature
    );
    
    console.log(`⏳ Faucet transaction submitted: ${tx.hash}`);
    
    // Return immediately
    res.json({
      success: true,
      txHash: tx.hash,
      user: user,
      amount: '100', // 100 PAY tokens
      nonce: nonce,
      relayer: relayerWallet.address,
      timestamp: new Date().toISOString()
    });
    
    // Wait for confirmation in background
    tx.wait().then((receipt) => {
      console.log(`✅ Faucet claim confirmed: ${receipt.hash} (Block ${receipt.blockNumber})`);
      console.log(`🎉 User ${user} received 100 PAY tokens`);
    }).catch((error) => {
      console.error(`❌ Faucet transaction failed: ${tx.hash}`, error);
    });
    
  } catch (error) {
    console.error('❌ Faucet error:', error);
    
    // Map errors to user-friendly messages
    let errorMessage = 'Faucet claim failed';
    if (error.message?.includes('Invalid signature')) {
      errorMessage = 'Invalid signature';
    } else if (error.message?.includes('Invalid nonce')) {
      errorMessage = 'Invalid nonce - please refresh and try again';
    } else if (error.message?.includes('wait 24 hours')) {
      errorMessage = 'Please wait 24 hours between claims';
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
      blockNumber: blockNumber,
      network: 'Polygon Amoy Testnet',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Periodic balance check (every 5 minutes)
setInterval(checkBalanceAndAlert, 5 * 60 * 1000);

async function checkBalanceAndAlert() {
  try {
    const balance = await provider.getBalance(relayerWallet.address);
    const balanceMatic = parseFloat(ethers.formatEther(balance));
    const threshold = parseFloat(process.env.LOW_BALANCE_THRESHOLD || '1');
    
    console.log(`⛽ Current relayer balance: ${balanceMatic.toFixed(4)} MATIC`);
    
    if (balanceMatic < threshold && !lowBalanceAlertSent && emailTransporter) {
      await sendLowBalanceAlert(balanceMatic, threshold);
      lowBalanceAlertSent = true;
    } else if (balanceMatic >= threshold && lowBalanceAlertSent) {
      lowBalanceAlertSent = false;
      console.log('✅ Balance restored above threshold');
    }
  } catch (error) {
    console.error('❌ Balance check error:', error.message);
  }
}

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
