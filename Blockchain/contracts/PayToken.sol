// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PayToken
 * @dev ERC-20 token for CryptoPay with:
 *      - Faucet functionality for testing
 *      - EIP-2771 meta-transactions for gasless payments (Path B - Advanced)
 */
contract PayToken is ERC20, Ownable {
    using ECDSA for bytes32;
    
    // Faucet amount: 100 PAY tokens
    uint256 public constant FAUCET_AMOUNT = 100 * 10**18;
    
    // Cooldown period: 24 hours
    uint256 public constant FAUCET_COOLDOWN = 24 hours;
    
    // Track last faucet claim time per address
    mapping(address => uint256) public lastFaucetClaim;
    
    // Meta-transaction nonces (prevents replay attacks)
    mapping(address => uint256) public nonces;
    
    // Trusted relayer address (platform backend that pays gas fees)
    address public relayer;
    
    event FaucetClaimed(address indexed recipient, uint256 amount);
    event MetaTransactionExecuted(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 nonce
    );
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    
    constructor(address _relayer) ERC20("PayToken", "PAY") Ownable(msg.sender) {
        require(_relayer != address(0), "Invalid relayer address");
        relayer = _relayer;
        
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
     * @dev Get the current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }
    
    /**
     * @dev Update trusted relayer address (only owner)
     */
    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "Invalid relayer address");
        address oldRelayer = relayer;
        relayer = _relayer;
        emit RelayerUpdated(oldRelayer, _relayer);
    }
    
    /**
     * @dev Execute meta-transaction (gasless payment) - Path B Advanced
     * Only callable by trusted relayer. Relayer pays gas, user signs message.
     * 
     * @param from User's address (actual sender)
     * @param to Recipient address (merchant)
     * @param amount Amount of tokens to transfer
     * @param nonce Nonce to prevent replay attacks
     * @param signature User's signature of the message
     */
    function executeMetaTransaction(
        address from,
        address to,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external returns (bool) {
        require(msg.sender == relayer, "Only relayer can execute meta-transactions");
        require(nonce == nonces[from], "Invalid nonce");
        require(from != address(0), "Invalid from address");
        require(to != address(0), "Invalid to address");
        
        // Construct message hash (what user signed)
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                from,
                to,
                amount,
                nonce,
                address(this) // Include contract address to prevent cross-contract replay
            )
        );
        
        // Verify signature matches
        // Ethereum signed message format: "\x19Ethereum Signed Message:\n32" + messageHash
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(signer == from, "Invalid signature");
        
        // Increment nonce to prevent replay attacks
        nonces[from]++;
        
        // Execute transfer from user to merchant
        _transfer(from, to, amount);
        
        emit MetaTransactionExecuted(from, to, amount, nonce);
        
        return true;
    }
    
    /**
     * @dev Owner can mint additional tokens if needed
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
