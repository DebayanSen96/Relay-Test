import { ethers } from 'ethers';

export const UniswapV3FactoryABI = [
  // Events
  "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
  
  // Functions
  "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

export class UniswapV3Factory {
  private contract: ethers.Contract;

  constructor(address: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(address, UniswapV3FactoryABI, signer);
  }

  async createPool(tokenA: string, tokenB: string, fee: number): Promise<ethers.ContractTransaction> {
    return await this.contract.createPool(tokenA, tokenB, fee);
  }

  async getPool(tokenA: string, tokenB: string, fee: number): Promise<string> {
    return await this.contract.getPool(tokenA, tokenB, fee);
  }
}
