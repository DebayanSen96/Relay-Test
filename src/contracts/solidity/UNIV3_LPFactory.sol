// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UNIV3_LPStrategy {
    address public asset;
    uint256 public targetAPY;
    uint256 public lockupPeriod;
    
    constructor(address _asset, uint256 _targetAPY, uint256 _lockupPeriod) {
        asset = _asset;
        targetAPY = _targetAPY;
        lockupPeriod = _lockupPeriod;
    }
    
    function initialize(address _asset, uint256 _targetAPY, uint256 _lockupPeriod) external {
        asset = _asset;
        targetAPY = _targetAPY;
        lockupPeriod = _lockupPeriod;
    }
    
    function getTargetAPY() external view returns (uint256) {
        return targetAPY;
    }
    
    function getLockupPeriod() external view returns (uint256) {
        return lockupPeriod;
    }
}

contract UNIV3_LPFactory {
    function deployStrategy(address asset, uint256 targetAPY, uint256 lockupPeriod) external returns (address) {
        UNIV3_LPStrategy strategy = new UNIV3_LPStrategy(asset, targetAPY, lockupPeriod);
        return address(strategy);
    }
}