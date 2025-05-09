import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FarmRequest, FarmRequestStatus, StrategyType } from '../models/FarmRequest';
import { BlockchainService } from './BlockchainService';
import { IPFSService } from './IPFSService';
import { ContractDeployer } from '../contracts/deploy/ContractDeployer';
import { MongoFarmDataService } from './MongoFarmService';
import dotenv from 'dotenv';

dotenv.config();

export class FarmService {
  private blockchainService: BlockchainService;
  private ipfsService: IPFSService;
  private farmRequestRepository: Repository<FarmRequest>;
  private contractDeployer: ContractDeployer;

  constructor(dataSource: DataSource) {
    this.contractDeployer = new ContractDeployer();
    this.blockchainService = new BlockchainService(this.contractDeployer);
    this.ipfsService = new IPFSService();
    this.farmRequestRepository = dataSource.getRepository(FarmRequest);
  }

  async createFarmRequest(data: {
    farmName: string;
    farmDescription: string;
    farmLogoUrl?: string;
    principalAssetAddress?: string; // Made optional
    strategyType: StrategyType;
    strategyContractAddress?: string; // Already optional
    parameters: Record<string, any>;
    incentiveSplits: {
      lp: number;
      verifier: number;
      yieldYoda: number;
    };
    maturityPeriodDays: number;
    claimToken: {
      name: string;
      symbol: string;
    };
    creatorMetadata?: Record<string, any>;
    creatorAddress: string;
  }): Promise<FarmRequest> {
    // Validate the request
    await this.validateFarmRequest(data);

    // Upload metadata to IPFS
    const metadataIpfsHash = await this.ipfsService.uploadMetadata({
      farmName: data.farmName,
      farmDescription: data.farmDescription,
      farmLogoUrl: data.farmLogoUrl,
      creatorMetadata: data.creatorMetadata
    });

    // Create a new farm request
    const farmRequest = new FarmRequest();
    farmRequest.id = uuidv4();
    farmRequest.farmName = data.farmName;
    farmRequest.farmDescription = data.farmDescription;
    farmRequest.farmLogoUrl = data.farmLogoUrl || null;
    farmRequest.principalAssetAddress = data.principalAssetAddress || ""; // Use provided address or empty string
    farmRequest.strategyType = data.strategyType;
    farmRequest.strategyContractAddress = data.strategyContractAddress || ""; // Use provided address or empty string
    farmRequest.parameters = data.parameters;
    farmRequest.incentiveSplits = data.incentiveSplits;
    farmRequest.maturityPeriodDays = data.maturityPeriodDays;
    farmRequest.claimToken = data.claimToken;
    farmRequest.creatorMetadata = data.creatorMetadata || null;
    farmRequest.creatorAddress = data.creatorAddress;
    farmRequest.metadataIpfsHash = metadataIpfsHash;
    farmRequest.status = FarmRequestStatus.PENDING_DEPLOYMENT;

    // Save the farm request to the database
    const saved = await this.farmRequestRepository.save(farmRequest);
    console.log('[SERVICE] Saved FarmRequest with id:', saved.id);
    return saved;
  }

  async deployFarm(requestId: string, mongoId?: string): Promise<FarmRequest> {
    const farmRequest = await this.farmRequestRepository.findOneBy({ id: requestId });

    if (!farmRequest) {
      throw new Error(`Farm request with ID ${requestId} not found`);
    }


    const salt = this.blockchainService.generateSalt(farmRequest.creatorAddress, farmRequest.id);
    farmRequest.salt = salt;
    await this.farmRequestRepository.save(farmRequest);

    try {
      
      let strategyAddressToUse: string;

      if (farmRequest.strategyType !== StrategyType.CUSTOM) {
       
        const deployedStrategyAddress = await this.blockchainService.deployStrategy(
          farmRequest.strategyType,
          farmRequest.principalAssetAddress,
          farmRequest.parameters
        );

        strategyAddressToUse = deployedStrategyAddress;
        farmRequest.strategyContractAddress = deployedStrategyAddress;
        farmRequest.status = FarmRequestStatus.STRATEGY_DEPLOYED;
        await this.farmRequestRepository.save(farmRequest);
      } else if (farmRequest.strategyContractAddress) {
        // Use the provided custom strategy address
        strategyAddressToUse = farmRequest.strategyContractAddress;
      } else {
        throw new Error('Custom strategy type requires a strategy contract address');
      }

      // Step 2: Deploy the farm contract
      const { farmId, farmAddr } = await this.blockchainService.createFarm(
        salt,
        farmRequest.principalAssetAddress,
        farmRequest.maturityPeriodDays,
        farmRequest.incentiveSplits.verifier,
        farmRequest.incentiveSplits.yieldYoda,
        farmRequest.incentiveSplits.lp,
        strategyAddressToUse,
        farmRequest.claimToken.name,
        farmRequest.claimToken.symbol
      );

      farmRequest.farmId = farmId;
      farmRequest.farmAddress = farmAddr;
      farmRequest.status = FarmRequestStatus.FARM_DEPLOYED;
      await this.farmRequestRepository.save(farmRequest);

      // Step 3: Create Uniswap V3 Pool
      const poolAddr = await this.blockchainService.createUniswapV3Pool(
        farmRequest.principalAssetAddress
      );

      farmRequest.poolAddress = poolAddr;
      farmRequest.status = FarmRequestStatus.POOL_DEPLOYED;
      await this.farmRequestRepository.save(farmRequest);

      // Step 4: Link Farm, Pool, and Liquidity Manager
      await this.blockchainService.linkFarmPoolAndLiquidityManager(
        farmAddr,
        poolAddr
      );

      // Set up event listeners for the farm contract
      this.blockchainService.listenForFarmEvents(farmAddr, (event) => {
        console.log('Farm event received:', event);
        // In a real implementation, we would handle these events
        // e.g., update the database, trigger notifications, etc.
      });

      // Update the farm request status
      farmRequest.status = FarmRequestStatus.READY;
      farmRequest.deploymentData = {
        deployedAt: new Date().toISOString(),
        transactionHash: 'tx_hash_placeholder' // Dummy for now
      };
      
      // Save farm data to MongoDB with the expanded schema
      // If mongoId is provided, update the existing document instead of creating a new one
      await MongoFarmDataService.storeFarmDeployment(
        farmRequest,
        farmAddr,
        poolAddr,
        farmId,
        mongoId // Pass the mongoId if available to update existing document
      );
      
      return await this.farmRequestRepository.save(farmRequest);
    } catch (error) {
      console.error('Farm deployment failed:', error);
      farmRequest.status = FarmRequestStatus.FAILED;
      farmRequest.deploymentData = {
        error: (error as Error).message,
        failedAt: new Date().toISOString()
      };
      await this.farmRequestRepository.save(farmRequest);
      throw error;
    }
  }

  private async validateFarmRequest(data: any): Promise<void> {
    // TEMPORARY: Bypass creator address validation for testing
    // In production, uncomment the following code to enforce approval
    /*
    const isApproved = await this.blockchainService.isApprovedFarmOwner(data.creatorAddress);
    if (!isApproved) {
      throw new Error(`Creator address ${data.creatorAddress} is not approved`);
    }
    */
    console.log(`Using creator address: ${data.creatorAddress} (approval check bypassed for testing)`);
    // END TEMPORARY

    // Validate incentive splits
    const totalSplit = data.incentiveSplits.lp + data.incentiveSplits.verifier + data.incentiveSplits.yieldYoda;
    if (totalSplit !== 100) {
      throw new Error(`Incentive splits must sum to 100, got ${totalSplit}`);
    }

    // Strategy validation will be done in a later step
    // We've removed the validation for strategy contract address as it will be set later

    // Additional validations can be added here based on specific requirements
  }
}
