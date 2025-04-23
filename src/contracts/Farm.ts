import { ethers } from 'ethers';

export const FarmABI = [
  // Events
  "event PoolSet(address indexed pool)",
  "event LiquidityManagerSet(address indexed liquidityManager)",
  
  // Functions
  "function setPool(address pool) external",
  "function setLiquidityManager(address liquidityManager) external",
  "function pool() external view returns (address)",
  "function liquidityManager() external view returns (address)"
];

export class Farm {
  private contract: ethers.Contract;

  constructor(address: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(address, FarmABI, signer);
  }

  async setPool(poolAddress: string): Promise<ethers.ContractTransaction> {
    return await this.contract.setPool(poolAddress);
  }

  async setLiquidityManager(liquidityManagerAddress: string): Promise<ethers.ContractTransaction> {
    return await this.contract.setLiquidityManager(liquidityManagerAddress);
  }

  async getPool(): Promise<string> {
    return await this.contract.pool();
  }

  async getLiquidityManager(): Promise<string> {
    return await this.contract.liquidityManager();
  }
}
