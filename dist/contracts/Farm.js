"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Farm = exports.FarmABI = void 0;
const ethers_1 = require("ethers");
exports.FarmABI = [
    // Events
    "event PoolSet(address indexed pool)",
    "event LiquidityManagerSet(address indexed liquidityManager)",
    // Functions
    "function setPool(address pool) external",
    "function setLiquidityManager(address liquidityManager) external",
    "function pool() external view returns (address)",
    "function liquidityManager() external view returns (address)"
];
class Farm {
    constructor(address, signer) {
        this.contract = new ethers_1.ethers.Contract(address, exports.FarmABI, signer);
    }
    async setPool(poolAddress) {
        return await this.contract.setPool(poolAddress);
    }
    async setLiquidityManager(liquidityManagerAddress) {
        return await this.contract.setLiquidityManager(liquidityManagerAddress);
    }
    async getPool() {
        return await this.contract.pool();
    }
    async getLiquidityManager() {
        return await this.contract.liquidityManager();
    }
}
exports.Farm = Farm;
