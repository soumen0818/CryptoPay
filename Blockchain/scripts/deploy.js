const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying PayToken contract to Amoy testnet...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MATIC\n");

  if (balance === 0n) {
    console.log("⚠️  WARNING: Account has no MATIC!");
    console.log("Please get test MATIC from: https://faucet.polygon.technology/\n");
    process.exit(1);
  }

  // Deploy contract
  console.log("⏳ Deploying contract...");
  const PayToken = await hre.ethers.getContractFactory("PayToken");
  const payToken = await PayToken.deploy();

  await payToken.waitForDeployment();
  const address = await payToken.getAddress();

  console.log("✅ PayToken deployed to:", address);
  
  // Get token info
  const name = await payToken.name();
  const symbol = await payToken.symbol();
  const decimals = await payToken.decimals();
  const totalSupply = await payToken.totalSupply();
  
  console.log("\n📊 Token Information:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  console.log("   Total Supply:", hre.ethers.formatEther(totalSupply), symbol);
  
  console.log("\n🔗 Network:", hre.network.name);
  console.log("🌐 Explorer:", `https://amoy.polygonscan.com/address/${address}`);
  
  console.log("\n📋 Next Steps:");
  console.log("1. Update Frontend/.env file:");
  console.log(`   EXPO_PUBLIC_TOKEN_ADDRESS=${address}`);
  console.log("\n2. Verify contract (optional):");
  console.log(`   npx hardhat verify --network amoy ${address}`);
  console.log("\n3. Test the faucet function from any wallet to get free tokens!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
