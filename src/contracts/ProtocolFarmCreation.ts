import { ethers } from 'ethers';

export const ProtocolFarmCreationABI = [
  // Events
  "event FarmCreated(uint256 indexed farmId, address indexed farmAddr, address indexed creator, address asset, address strategy)",
  
  // Functions
  "function createFarm(bytes32 salt, address asset, uint256 maturityPeriod, uint256 verifierIncentiveSplit, uint256 yieldYodaIncentiveSplit, uint256 lpIncentiveSplit, address strategy, string memory claimName, string memory claimSymbol) external returns (uint256 farmId, address farmAddr)",
  "function approvedFarmOwners(address) external view returns (bool)",
  "function setApprovedFarmOwner(address owner, bool approved) external",
  "function owner() external view returns (address)"
];

export class ProtocolFarmCreation {
  private contract: ethers.Contract;

  constructor(address: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(address, ProtocolFarmCreationABI, signer);
  }

  async isApprovedFarmOwner(address: string): Promise<boolean> {
    return await this.contract.approvedFarmOwners(address);
  }

  async createFarm(
    salt: string,
    asset: string,
    maturityPeriod: number,
    verifierIncentiveSplit: number,
    yieldYodaIncentiveSplit: number,
    lpIncentiveSplit: number,
    strategy: string,
    claimName: string,
    claimSymbol: string
  ): Promise<ethers.ContractTransaction> {
    return await this.contract.createFarm(
      salt,
      asset,
      maturityPeriod,
      verifierIncentiveSplit,
      yieldYodaIncentiveSplit,
      lpIncentiveSplit,
      strategy,
      claimName,
      claimSymbol
    );
  }

  async getOwner(): Promise<string> {
    return await this.contract.owner();
  }
}
