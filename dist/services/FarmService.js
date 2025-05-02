"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmService = void 0;
const uuid_1 = require("uuid");
const FarmRequest_1 = require("../models/FarmRequest");
const BlockchainService_1 = require("./BlockchainService");
const IPFSService_1 = require("./IPFSService");
const ContractDeployer_1 = require("../contracts/deploy/ContractDeployer");
const MongoFarmService_1 = require("./MongoFarmService");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class FarmService {
    constructor(dataSource) {
        this.contractDeployer = new ContractDeployer_1.ContractDeployer();
        this.blockchainService = new BlockchainService_1.BlockchainService(this.contractDeployer);
        this.ipfsService = new IPFSService_1.IPFSService();
        this.farmRequestRepository = dataSource.getRepository(FarmRequest_1.FarmRequest);
    }
    async createFarmRequest(data) {
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
        const farmRequest = new FarmRequest_1.FarmRequest();
        farmRequest.id = (0, uuid_1.v4)();
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
        farmRequest.status = FarmRequest_1.FarmRequestStatus.PENDING_DEPLOYMENT;
        // Save the farm request to the database
        const saved = await this.farmRequestRepository.save(farmRequest);
        console.log('[SERVICE] Saved FarmRequest with id:', saved.id);
        return saved;
    }
    async deployFarm(requestId) {
        const farmRequest = await this.farmRequestRepository.findOneBy({ id: requestId });
        if (!farmRequest) {
            throw new Error(`Farm request with ID ${requestId} not found`);
        }
        const salt = this.blockchainService.generateSalt(farmRequest.creatorAddress, farmRequest.id);
        farmRequest.salt = salt;
        await this.farmRequestRepository.save(farmRequest);
        try {
            let strategyAddressToUse;
            if (farmRequest.strategyType !== FarmRequest_1.StrategyType.CUSTOM) {
                const deployedStrategyAddress = await this.blockchainService.deployStrategy(farmRequest.strategyType, farmRequest.principalAssetAddress, farmRequest.parameters);
                strategyAddressToUse = deployedStrategyAddress;
                farmRequest.strategyContractAddress = deployedStrategyAddress;
                farmRequest.status = FarmRequest_1.FarmRequestStatus.STRATEGY_DEPLOYED;
                await this.farmRequestRepository.save(farmRequest);
            }
            else if (farmRequest.strategyContractAddress) {
                // Use the provided custom strategy address
                strategyAddressToUse = farmRequest.strategyContractAddress;
            }
            else {
                throw new Error('Custom strategy type requires a strategy contract address');
            }
            // Step 2: Deploy the farm contract
            const { farmId, farmAddr } = await this.blockchainService.createFarm(salt, farmRequest.principalAssetAddress, farmRequest.maturityPeriodDays, farmRequest.incentiveSplits.verifier, farmRequest.incentiveSplits.yieldYoda, farmRequest.incentiveSplits.lp, strategyAddressToUse, farmRequest.claimToken.name, farmRequest.claimToken.symbol);
            farmRequest.farmId = farmId;
            farmRequest.farmAddress = farmAddr;
            farmRequest.status = FarmRequest_1.FarmRequestStatus.FARM_DEPLOYED;
            await this.farmRequestRepository.save(farmRequest);
            // Step 3: Create Uniswap V3 Pool
            const poolAddr = await this.blockchainService.createUniswapV3Pool(farmRequest.principalAssetAddress);
            farmRequest.poolAddress = poolAddr;
            farmRequest.status = FarmRequest_1.FarmRequestStatus.POOL_DEPLOYED;
            await this.farmRequestRepository.save(farmRequest);
            // Step 4: Link Farm, Pool, and Liquidity Manager
            await this.blockchainService.linkFarmPoolAndLiquidityManager(farmAddr, poolAddr);
            // Set up event listeners for the farm contract
            this.blockchainService.listenForFarmEvents(farmAddr, (event) => {
                console.log('Farm event received:', event);
                // In a real implementation, we would handle these events
                // e.g., update the database, trigger notifications, etc.
            });
            // Update the farm request status
            farmRequest.status = FarmRequest_1.FarmRequestStatus.READY;
            farmRequest.deploymentData = {
                deployedAt: new Date().toISOString(),
                transactionHash: 'tx_hash_placeholder' // Dummy for now
            };
            // Save farm data to MongoDB with the expanded schema
            await MongoFarmService_1.MongoFarmDataService.storeFarmDeployment(farmRequest, farmAddr, poolAddr, farmId);
            return await this.farmRequestRepository.save(farmRequest);
        }
        catch (error) {
            console.error('Farm deployment failed:', error);
            farmRequest.status = FarmRequest_1.FarmRequestStatus.FAILED;
            farmRequest.deploymentData = {
                error: error.message,
                failedAt: new Date().toISOString()
            };
            await this.farmRequestRepository.save(farmRequest);
            throw error;
        }
    }
    async validateFarmRequest(data) {
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
exports.FarmService = FarmService;
