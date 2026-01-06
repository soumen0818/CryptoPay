const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PayToken", function () {
  let payToken;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const PayToken = await ethers.getContractFactory("PayToken");
    payToken = await PayToken.deploy();
    await payToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await payToken.name()).to.equal("PayToken");
      expect(await payToken.symbol()).to.equal("PAY");
    });

    it("Should mint initial supply to owner", async function () {
      const ownerBalance = await payToken.balanceOf(owner.address);
      expect(ethers.formatEther(ownerBalance)).to.equal("1000000.0");
    });

    it("Should have 18 decimals", async function () {
      expect(await payToken.decimals()).to.equal(18);
    });
  });

  describe("Faucet", function () {
    it("Should allow user to claim faucet", async function () {
      await payToken.connect(user1).faucet();
      const balance = await payToken.balanceOf(user1.address);
      expect(ethers.formatEther(balance)).to.equal("100.0");
    });

    it("Should emit FaucetClaimed event", async function () {
      await expect(payToken.connect(user1).faucet())
        .to.emit(payToken, "FaucetClaimed")
        .withArgs(user1.address, ethers.parseEther("100"));
    });

    it("Should not allow claiming twice within 24 hours", async function () {
      await payToken.connect(user1).faucet();
      await expect(payToken.connect(user1).faucet()).to.be.revertedWith(
        "Faucet: Please wait 24 hours between claims"
      );
    });

    it("Should allow claiming after cooldown", async function () {
      await payToken.connect(user1).faucet();
      
      // Fast forward 24 hours
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      await payToken.connect(user1).faucet();
      const balance = await payToken.balanceOf(user1.address);
      expect(ethers.formatEther(balance)).to.equal("200.0");
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      await payToken.connect(user1).faucet();
      await payToken.connect(user1).transfer(user2.address, ethers.parseEther("50"));
      
      expect(ethers.formatEther(await payToken.balanceOf(user1.address))).to.equal("50.0");
      expect(ethers.formatEther(await payToken.balanceOf(user2.address))).to.equal("50.0");
    });
  });
});
