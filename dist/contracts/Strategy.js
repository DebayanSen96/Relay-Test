"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyFactory = exports.Strategy = exports.StrategyFactoryABI = exports.StrategyABI = void 0;
const ethers_1 = require("ethers");
// This is a simplified ABI for a generic strategy contract
// In a real implementation, this would need to be expanded based on the specific strategy types
exports.StrategyABI = [
    // Events
    "event StrategyInitialized(address indexed asset, uint256 targetAPY)",
    // Functions
    "function initialize(address asset, uint256 targetAPY, uint256 lockupPeriod) external",
    "function getTargetAPY() external view returns (uint256)",
    "function getLockupPeriod() external view returns (uint256)"
];
// Factory ABI for deploying strategy contracts
exports.StrategyFactoryABI = [
    "function deployStrategy(address asset, uint256 targetAPY, uint256 lockupPeriod) external returns (address strategy)"
];
class Strategy {
    constructor(address, signer) {
        this.contract = new ethers_1.ethers.Contract(address, exports.StrategyABI, signer);
    }
    async initialize(asset, targetAPY, lockupPeriod) {
        return await this.contract.initialize(asset, targetAPY, lockupPeriod);
    }
    async getTargetAPY() {
        return (await this.contract.getTargetAPY()).toNumber();
    }
    async getLockupPeriod() {
        return (await this.contract.getLockupPeriod()).toNumber();
    }
}
exports.Strategy = Strategy;
class StrategyFactory {
    constructor(address, signer) {
        this.contract = new ethers_1.ethers.Contract(address, exports.StrategyFactoryABI, signer);
    }
    /**
     * Call static to get the address of the deployed strategy without emitting a transaction.
     */
    async callStaticDeployStrategy(asset, targetAPY, lockupPeriod) {
        return await this.contract.callStatic.deployStrategy(asset, targetAPY, lockupPeriod);
    }
    async deployStrategy(asset, targetAPY, lockupPeriod) {
        return await this.contract.deployStrategy(asset, targetAPY, lockupPeriod);
    }
}
exports.StrategyFactory = StrategyFactory;
