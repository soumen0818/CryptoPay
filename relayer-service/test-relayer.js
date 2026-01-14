/**
 * Test Relayer Service
 * This script tests if the relayer service is working correctly
 */

const ethers = require('ethers');

const RELAYER_URL = 'https://cryptopay-relayer.onrender.com';
const TEST_ADDRESS = '0x8c755444ebbe9c7df8812854e5e72134304a1a06';

async function main() {
  console.log('🧪 Testing Relayer Service\n');
  console.log('Relayer URL:', RELAYER_URL);
  console.log('-------------------------------------------\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health endpoint...');
    const healthRes = await fetch(`${RELAYER_URL}/health`);
    
    if (!healthRes.ok) {
      console.log('❌ Health check failed!');
      console.log('   Status:', healthRes.status);
      process.exit(1);
    }
    
    const healthData = await healthRes.json();
    console.log('✅ Relayer is healthy!');
    console.log('   Balance:', healthData.balance, 'MATIC');
    console.log('   Relayer:', healthData.relayer);
    console.log('   Block:', healthData.blockNumber);
    
    if (parseFloat(healthData.balance) < 0.1) {
      console.log('   ⚠️  Low balance warning!\n');
    } else {
      console.log('   ✅ Sufficient balance\n');
    }

    // Test 2: Get Nonce
    console.log('2️⃣ Testing nonce endpoint...');
    const nonceRes = await fetch(`${RELAYER_URL}/nonce/${TEST_ADDRESS}`);
    
    if (!nonceRes.ok) {
      console.log('❌ Nonce check failed!');
      process.exit(1);
    }
    
    const nonceData = await nonceRes.json();
    console.log('✅ Nonce retrieved successfully!');
    console.log('   Address:', nonceData.address);
    console.log('   Nonce:', nonceData.nonce);
    console.log('');

    // Test 3: Stats
    console.log('3️⃣ Testing stats endpoint...');
    const statsRes = await fetch(`${RELAYER_URL}/stats`);
    
    if (!statsRes.ok) {
      console.log('❌ Stats check failed!');
      process.exit(1);
    }
    
    const statsData = await statsRes.json();
    console.log('✅ Stats retrieved successfully!');
    console.log('   Network:', statsData.network);
    console.log('   Timestamp:', statsData.timestamp);
    console.log('');

    console.log('✅ All tests passed! Relayer service is operational.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Possible issues:');
      console.log('   - Relayer service is down');
      console.log('   - Network connectivity issues');
      console.log('   - Incorrect relayer URL');
      console.log('\n🔧 Solutions:');
      console.log('   - Check if relayer is deployed on Render');
      console.log('   - Verify the URL in .env files');
      console.log('   - Check Render logs for errors\n');
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
