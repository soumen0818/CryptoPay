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
  
  // Path B - Advanced: Pass relayer address to constructor
  // For initial deployment, deployer acts as relayer (can be changed later with setRelayer)
  const relayerAddress = deployer.address;
  console.log("🔐 Setting initial relayer:", relayerAddress);
  
  const payToken = await PayToken.deploy(relayerAddress);

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
  console.log("1. Update App/.env file:");
  console.log(`   EXPO_PUBLIC_TOKEN_ADDRESS=${address}`);
  console.log("\n2. Update relayer-service/.env file:");
  console.log(`   PAY_TOKEN_ADDRESS=${address}`);
  console.log(`   RELAYER_PRIVATE_KEY=<your_relayer_wallet_private_key>`);
  console.log("\n3. Update relayer address in contract (if using different wallet):");
  console.log(`   await contract.setRelayer("0xNEW_RELAYER_ADDRESS")`);
  console.log("\n4. Verify contract (optional):");
  console.log(`   npx hardhat verify --network amoy ${address} "${relayerAddress}"`);
  console.log("\n5. Fund relayer wallet with MATIC for gas fees!");
  console.log("\n6. Start relayer service:");
  console.log("   cd relayer-service && npm start");
  console.log("\n✅ Gasless payments (Path B - Advanced) are now enabled!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
