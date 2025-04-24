import { ethers } from 'ethers';
import { ProtocolFarmCreation } from '../contracts/ProtocolFarmCreation';
import { Farm, FarmABI } from '../contracts/Farm';
import { UniswapV3Factory } from '../contracts/UniswapV3Factory';
import { Strategy, StrategyFactory } from '../contracts/Strategy';
import { ContractDeployer } from '../contracts/deploy/ContractDeployer';
import dotenv from 'dotenv';

dotenv.config();

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private protocolFarmCreation: ProtocolFarmCreation;
  private uniswapV3Factory: UniswapV3Factory;
  private strategyFactories: Map<string, StrategyFactory> = new Map();

  constructor(private contractDeployer: ContractDeployer) {
    // Create provider and disable ENS resolution
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);

    // Override ENS methods to prevent ENS lookups
    const originalGetResolver = this.provider.getResolver.bind(this.provider);
    this.provider.getResolver = async (name: string) => {
      // If it's an address, skip ENS
      if (ethers.utils.isAddress(name)) {
        return null;
      }
      return originalGetResolver(name);
    };
    const originalResolveName = this.provider.resolveName.bind(this.provider);
    this.provider.resolveName = async (name: string) => {
      if (ethers.utils.isAddress(name)) {
        return name;
      }
      return originalResolveName(name);
    };

    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
    
    // Get deployed contract addresses
    const deployedContracts = this.contractDeployer.getDeployedContracts();
    
    this.protocolFarmCreation = new ProtocolFarmCreation(
      deployedContracts.PROTOCOL_FARM_CREATION_ADDRESS,
      this.signer
    );
    
    this.uniswapV3Factory = new UniswapV3Factory(
      deployedContracts.UNISWAP_V3_FACTORY_ADDRESS,
      this.signer
    );

    // Initialize strategy factories from deployed addresses
    const strategyFactoryAddresses = deployedContracts.STRATEGY_FACTORY_ADDRESSES;
    for (const [strategyType, address] of Object.entries(strategyFactoryAddresses)) {
      this.strategyFactories.set(strategyType, new StrategyFactory(address, this.signer));
    }
  }

  async isApprovedFarmOwner(address: string): Promise<boolean> {
    return await this.protocolFarmCreation.isApprovedFarmOwner(address);
  }

  async deployStrategy(
    strategyType: string,
    asset: string,
    parameters: Record<string, any>
  ): Promise<string> {
    if (!this.strategyFactories.has(strategyType)) {
      throw new Error(`Strategy factory for type ${strategyType} not found`);
    }

    const factory = this.strategyFactories.get(strategyType)!;
    const targetAPY = parseInt(parameters.targetAPY) || 0;
    const lockupPeriod = (parameters.lockupPeriodDays || 0) * 86400; // Convert days to seconds

    // Determine deployed strategy address via static call to avoid relying on event logs
    const deployedStrategyAddress = await factory.callStaticDeployStrategy(asset, targetAPY, lockupPeriod);
    // Execute the deployment transaction
    const tx = await factory.deployStrategy(asset, targetAPY, lockupPeriod);
    await tx.wait();

    // Initialize the strategy with additional parameters if needed
    const strategy = new Strategy(deployedStrategyAddress, this.signer);
    await (await strategy.initialize(asset, targetAPY, lockupPeriod)).wait();

    return deployedStrategyAddress;
  }

  async createFarm(
    salt: string,
    asset: string,
    maturityPeriodDays: number,
    verifierIncentiveSplit: number,
    yieldYodaIncentiveSplit: number,
    lpIncentiveSplit: number,
    strategy: string,
    claimName: string,
    claimSymbol: string
  ): Promise<{ farmId: string; farmAddr: string }> {
    // Convert maturity period days to seconds
    const maturityPeriod = maturityPeriodDays * 86400;

    const tx = await this.protocolFarmCreation.createFarm(
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

    const receipt = await tx.wait();

    // Extract farmId and farmAddr from the FarmCreated event
    const farmCreatedEvent = receipt.events?.find(
      (event) => event.event === 'FarmCreated'
    );

    if (!farmCreatedEvent) {
      throw new Error('FarmCreated event not found in transaction receipt');
    }

    const farmId = farmCreatedEvent.args!.farmId.toString();
    const farmAddr = farmCreatedEvent.args!.farmAddr;

    return { farmId, farmAddr };
  }

  async createUniswapV3Pool(
    principalAssetAddress: string,
    feeTier: number = 3000 // Default fee tier: 0.3%
  ): Promise<string> {
    // Get DXP token address from deployed contracts
    const dxpTokenAddress = this.contractDeployer.getDeployedContracts().DXP_TOKEN_ADDRESS;

    // If a pool already exists for this token pair and fee, return it
    const existingPool = await this.uniswapV3Factory.getPool(dxpTokenAddress, principalAssetAddress, feeTier);
    if (existingPool && existingPool !== ethers.constants.AddressZero) {
      console.log('Uniswap V3 pool already exists at:', existingPool);
      return existingPool;
    }

    console.log('Creating Uniswap V3 pool with tokens:', { dxpTokenAddress, principalAssetAddress, feeTier });
    const tx = await this.uniswapV3Factory.createPool(
      dxpTokenAddress,
      principalAssetAddress,
      feeTier
    );

    const receipt = await tx.wait();

    // Extract poolAddr from the PoolCreated event
    const poolCreatedEvent = receipt.events?.find(
      (event) => event.event === 'PoolCreated'
    );

    if (!poolCreatedEvent) {
      throw new Error('PoolCreated event not found in transaction receipt');
    }

    const poolAddr = poolCreatedEvent.args!.pool;
    return poolAddr;
  }

  async linkFarmPoolAndLiquidityManager(
    farmAddr: string,
    poolAddr: string
  ): Promise<void> {
    // Get liquidity manager address from deployed contracts
    const liquidityManagerAddr = this.contractDeployer.getDeployedContracts().LIQUIDITY_MANAGER_ADDRESS;
    const farm = new Farm(farmAddr, this.signer);

    // Set pool
    await (await farm.setPool(poolAddr)).wait();

    // Set liquidity manager
    await (await farm.setLiquidityManager(liquidityManagerAddr)).wait();
  }

  // Method to listen for events on a farm contract
  async listenForFarmEvents(farmAddr: string, callback: (event: any) => void): Promise<void> {
    // Create a contract instance directly instead of using Farm class
    const contract = new ethers.Contract(farmAddr, FarmABI, this.provider);
    
    // Listen for PoolSet event
    contract.on('PoolSet', (pool) => {
      callback({
        event: 'PoolSet',
        farmAddress: farmAddr,
        poolAddress: pool
      });
    });

    // Listen for LiquidityManagerSet event
    contract.on('LiquidityManagerSet', (liquidityManager) => {
      callback({
        event: 'LiquidityManagerSet',
        farmAddress: farmAddr,
        liquidityManagerAddress: liquidityManager
      });
    });
  }

  // Method to generate a unique salt for farm creation
  generateSalt(creatorAddress: string, requestId: string): string {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'string'],
        [creatorAddress, requestId]
      )
    );
  }
}
