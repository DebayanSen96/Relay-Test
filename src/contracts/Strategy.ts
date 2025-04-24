import { ethers } from 'ethers';

// This is a simplified ABI for a generic strategy contract
// In a real implementation, this would need to be expanded based on the specific strategy types
export const StrategyABI = [
  // Events
  "event StrategyInitialized(address indexed asset, uint256 targetAPY)",
  
  // Functions
  "function initialize(address asset, uint256 targetAPY, uint256 lockupPeriod) external",
  "function getTargetAPY() external view returns (uint256)",
  "function getLockupPeriod() external view returns (uint256)"
];

// Factory ABI for deploying strategy contracts
export const StrategyFactoryABI = [
  "function deployStrategy(address asset, uint256 targetAPY, uint256 lockupPeriod) external returns (address strategy)"
];

export class Strategy {
  private contract: ethers.Contract;

  constructor(address: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(address, StrategyABI, signer);
  }

  async initialize(asset: string, targetAPY: number, lockupPeriod: number): Promise<ethers.ContractTransaction> {
    return await this.contract.initialize(asset, targetAPY, lockupPeriod);
  }

  async getTargetAPY(): Promise<number> {
    return (await this.contract.getTargetAPY()).toNumber();
  }

  async getLockupPeriod(): Promise<number> {
    return (await this.contract.getLockupPeriod()).toNumber();
  }
}

export class StrategyFactory {
  private contract: ethers.Contract;

  constructor(address: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(address, StrategyFactoryABI, signer);
  }

  /**
   * Call static to get the address of the deployed strategy without emitting a transaction.
   */
  async callStaticDeployStrategy(asset: string, targetAPY: number, lockupPeriod: number): Promise<string> {
    return await this.contract.callStatic.deployStrategy(asset, targetAPY, lockupPeriod);
  }

  async deployStrategy(asset: string, targetAPY: number, lockupPeriod: number): Promise<ethers.ContractTransaction> {
    return await this.contract.deployStrategy(asset, targetAPY, lockupPeriod);
  }
}
