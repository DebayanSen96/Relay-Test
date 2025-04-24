"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniswapV3Factory = exports.UniswapV3FactoryABI = void 0;
const ethers_1 = require("ethers");
exports.UniswapV3FactoryABI = [
    // Events
    "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
    // Functions
    "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];
class UniswapV3Factory {
    constructor(address, signer) {
        this.contract = new ethers_1.ethers.Contract(address, exports.UniswapV3FactoryABI, signer);
    }
    async createPool(tokenA, tokenB, fee) {
        return await this.contract.createPool(tokenA, tokenB, fee);
    }
    async getPool(tokenA, tokenB, fee) {
        return await this.contract.getPool(tokenA, tokenB, fee);
    }
}
exports.UniswapV3Factory = UniswapV3Factory;
