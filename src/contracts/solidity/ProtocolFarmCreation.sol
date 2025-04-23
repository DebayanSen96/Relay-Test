// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ProtocolFarmCreation
 * @dev Contract for creating farm strategies in the Dexponent Protocol
 */
contract ProtocolFarmCreation {
    address public owner;
    uint256 public farmCount;
    mapping(address => bool) public approvedFarmOwners;
    mapping(uint256 => address) public farms;

    event FarmCreated(uint256 indexed farmId, address indexed farmAddr, address indexed creator, address asset, address strategy);
    event FarmOwnerApprovalChanged(address indexed farmOwner, bool approved);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function setApprovedFarmOwner(address farmOwner, bool approved) external onlyOwner {
        approvedFarmOwners[farmOwner] = approved;
        emit FarmOwnerApprovalChanged(farmOwner, approved);
    }

    function createFarm(
        bytes32 salt,
        address asset,
        uint256 maturityPeriod,
        uint256 verifierIncentiveSplit,
        uint256 yieldYodaIncentiveSplit,
        uint256 lpIncentiveSplit,
        address strategy,
        string memory claimName,
        string memory claimSymbol
    ) external returns (uint256 farmId, address farmAddr) {
        require(approvedFarmOwners[msg.sender], "Caller is not approved to create farms");
        require(verifierIncentiveSplit + yieldYodaIncentiveSplit + lpIncentiveSplit == 100, "Incentive splits must sum to 100");
        
        // Create a new farm contract using create2 for deterministic addresses
        bytes memory farmBytecode = _getFarmBytecode(
            asset,
            maturityPeriod,
            verifierIncentiveSplit,
            yieldYodaIncentiveSplit,
            lpIncentiveSplit,
            strategy,
            claimName,
            claimSymbol
        );
        
        bytes32 finalSalt = keccak256(abi.encodePacked(salt, msg.sender));
        address addr;
        
        assembly {
            addr := create2(0, add(farmBytecode, 32), mload(farmBytecode), finalSalt)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
        
        farmId = farmCount++;
        farms[farmId] = addr;
        
        emit FarmCreated(farmId, addr, msg.sender, asset, strategy);
        
        return (farmId, addr);
    }
    
    // This is a simplified version - in a real implementation, this would 
    // generate the bytecode for the Farm contract with constructor parameters
    function _getFarmBytecode(
        address asset,
        uint256 maturityPeriod,
        uint256 verifierIncentiveSplit,
        uint256 yieldYodaIncentiveSplit,
        uint256 lpIncentiveSplit,
        address strategy,
        string memory claimName,
        string memory claimSymbol
    ) internal pure returns (bytes memory) {
        // For demonstration purposes, we'll return a dummy bytecode
        // In a real implementation, this would be the actual Farm contract bytecode
        return abi.encodePacked(
            type(Farm).creationCode,
            abi.encode(
                asset,
                maturityPeriod,
                verifierIncentiveSplit,
                yieldYodaIncentiveSplit,
                lpIncentiveSplit,
                strategy,
                claimName,
                claimSymbol
            )
        );
    }
}

// Simplified Farm contract for demonstration
contract Farm {
    address public asset;
    uint256 public maturityPeriod;
    uint256 public verifierIncentiveSplit;
    uint256 public yieldYodaIncentiveSplit;
    uint256 public lpIncentiveSplit;
    address public strategy;
    string public claimName;
    string public claimSymbol;
    address public pool;
    address public liquidityManager;
    
    event PoolSet(address indexed pool);
    event LiquidityManagerSet(address indexed liquidityManager);
    
    constructor(
        address _asset,
        uint256 _maturityPeriod,
        uint256 _verifierIncentiveSplit,
        uint256 _yieldYodaIncentiveSplit,
        uint256 _lpIncentiveSplit,
        address _strategy,
        string memory _claimName,
        string memory _claimSymbol
    ) {
        asset = _asset;
        maturityPeriod = _maturityPeriod;
        verifierIncentiveSplit = _verifierIncentiveSplit;
        yieldYodaIncentiveSplit = _yieldYodaIncentiveSplit;
        lpIncentiveSplit = _lpIncentiveSplit;
        strategy = _strategy;
        claimName = _claimName;
        claimSymbol = _claimSymbol;
    }
    
    function setPool(address _pool) external {
        pool = _pool;
        emit PoolSet(_pool);
    }
    
    function setLiquidityManager(address _liquidityManager) external {
        liquidityManager = _liquidityManager;
        emit LiquidityManagerSet(_liquidityManager);
    }
}
