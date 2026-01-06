// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PayToken
 * @dev ERC-20 token for CryptoPay with faucet functionality for testing
 */
contract PayToken is ERC20, Ownable {
    // Faucet amount: 100 PAY tokens
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18;
    
    // Cooldown period: 24 hours
    uint256 public constant FAUCET_COOLDOWN = 24 hours;
    
    // Track last faucet claim time per address
    mapping(address => uint256) public lastFaucetClaim;
    
    event FaucetClaimed(address indexed recipient, uint256 amount);
    
    constructor() ERC20("PayToken", "PAY") Ownable(msg.sender) {
        // Mint initial supply to deployer (1 million tokens)
        _mint(msg.sender, 1_000_000 * 10**18);
    }
    
    /**
     * @dev Claim free tokens from faucet (for testing)
     * Can only claim once every 24 hours
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN,
            "Faucet: Please wait 24 hours between claims"
        );
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @dev Check if address can claim from faucet
     */
    function canClaimFaucet(address account) external view returns (bool) {
        return block.timestamp >= lastFaucetClaim[account] + FAUCET_COOLDOWN;
    }
    
    /**
     * @dev Get time until next faucet claim
     */
    function timeUntilNextClaim(address account) external view returns (uint256) {
        uint256 nextClaimTime = lastFaucetClaim[account] + FAUCET_COOLDOWN;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
    
    /**
     * @dev Owner can mint additional tokens if needed
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
