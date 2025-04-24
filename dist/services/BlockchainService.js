"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainService = void 0;
const ethers_1 = require("ethers");
const ProtocolFarmCreation_1 = require("../contracts/ProtocolFarmCreation");
const Farm_1 = require("../contracts/Farm");
const UniswapV3Factory_1 = require("../contracts/UniswapV3Factory");
const Strategy_1 = require("../contracts/Strategy");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class BlockchainService {
    constructor(contractDeployer) {
        this.contractDeployer = contractDeployer;
        this.strategyFactories = new Map();
        // Create provider and disable ENS resolution
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);
        // Override ENS methods to prevent ENS lookups
        const originalGetResolver = this.provider.getResolver.bind(this.provider);
        this.provider.getResolver = async (name) => {
            // If it's an address, skip ENS
            if (ethers_1.ethers.utils.isAddress(name)) {
                return null;
            }
            return originalGetResolver(name);
        };
        const originalResolveName = this.provider.resolveName.bind(this.provider);
        this.provider.resolveName = async (name) => {
            if (ethers_1.ethers.utils.isAddress(name)) {
                return name;
            }
            return originalResolveName(name);
        };
        this.signer = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        // Get deployed contract addresses
        const deployedContracts = this.contractDeployer.getDeployedContracts();
        this.protocolFarmCreation = new ProtocolFarmCreation_1.ProtocolFarmCreation(deployedContracts.PROTOCOL_FARM_CREATION_ADDRESS, this.signer);
        this.uniswapV3Factory = new UniswapV3Factory_1.UniswapV3Factory(deployedContracts.UNISWAP_V3_FACTORY_ADDRESS, this.signer);
        // Initialize strategy factories from deployed addresses
        const strategyFactoryAddresses = deployedContracts.STRATEGY_FACTORY_ADDRESSES;
        for (const [strategyType, address] of Object.entries(strategyFactoryAddresses)) {
            this.strategyFactories.set(strategyType, new Strategy_1.StrategyFactory(address, this.signer));
        }
    }
    async isApprovedFarmOwner(address) {
        return await this.protocolFarmCreation.isApprovedFarmOwner(address);
    }
    async deployStrategy(strategyType, asset, parameters) {
        if (!this.strategyFactories.has(strategyType)) {
            throw new Error(`Strategy factory for type ${strategyType} not found`);
        }
        const factory = this.strategyFactories.get(strategyType);
        const targetAPY = parseInt(parameters.targetAPY) || 0;
        const lockupPeriod = (parameters.lockupPeriodDays || 0) * 86400; // Convert days to seconds
        // Determine deployed strategy address via static call to avoid relying on event logs
        const deployedStrategyAddress = await factory.callStaticDeployStrategy(asset, targetAPY, lockupPeriod);
        // Execute the deployment transaction
        const tx = await factory.deployStrategy(asset, targetAPY, lockupPeriod);
        await tx.wait();
        // Initialize the strategy with additional parameters if needed
        const strategy = new Strategy_1.Strategy(deployedStrategyAddress, this.signer);
        await (await strategy.initialize(asset, targetAPY, lockupPeriod)).wait();
        return deployedStrategyAddress;
    }
    async createFarm(salt, asset, maturityPeriodDays, verifierIncentiveSplit, yieldYodaIncentiveSplit, lpIncentiveSplit, strategy, claimName, claimSymbol) {
        // Convert maturity period days to seconds
        const maturityPeriod = maturityPeriodDays * 86400;
        const tx = await this.protocolFarmCreation.createFarm(salt, asset, maturityPeriod, verifierIncentiveSplit, yieldYodaIncentiveSplit, lpIncentiveSplit, strategy, claimName, claimSymbol);
        const receipt = await tx.wait();
        // Extract farmId and farmAddr from the FarmCreated event
        const farmCreatedEvent = receipt.events?.find((event) => event.event === 'FarmCreated');
        if (!farmCreatedEvent) {
            throw new Error('FarmCreated event not found in transaction receipt');
        }
        const farmId = farmCreatedEvent.args.farmId.toString();
        const farmAddr = farmCreatedEvent.args.farmAddr;
        return { farmId, farmAddr };
    }
    async createUniswapV3Pool(principalAssetAddress, feeTier = 3000 // Default fee tier: 0.3%
    ) {
        // Get DXP token address from deployed contracts
        const dxpTokenAddress = this.contractDeployer.getDeployedContracts().DXP_TOKEN_ADDRESS;
        // If a pool already exists for this token pair and fee, return it
        const existingPool = await this.uniswapV3Factory.getPool(dxpTokenAddress, principalAssetAddress, feeTier);
        if (existingPool && existingPool !== ethers_1.ethers.constants.AddressZero) {
            console.log('Uniswap V3 pool already exists at:', existingPool);
            return existingPool;
        }
        console.log('Creating Uniswap V3 pool with tokens:', { dxpTokenAddress, principalAssetAddress, feeTier });
        const tx = await this.uniswapV3Factory.createPool(dxpTokenAddress, principalAssetAddress, feeTier);
        const receipt = await tx.wait();
        // Extract poolAddr from the PoolCreated event
        const poolCreatedEvent = receipt.events?.find((event) => event.event === 'PoolCreated');
        if (!poolCreatedEvent) {
            throw new Error('PoolCreated event not found in transaction receipt');
        }
        const poolAddr = poolCreatedEvent.args.pool;
        return poolAddr;
    }
    async linkFarmPoolAndLiquidityManager(farmAddr, poolAddr) {
        // Get liquidity manager address from deployed contracts
        const liquidityManagerAddr = this.contractDeployer.getDeployedContracts().LIQUIDITY_MANAGER_ADDRESS;
        const farm = new Farm_1.Farm(farmAddr, this.signer);
        // Set pool
        await (await farm.setPool(poolAddr)).wait();
        // Set liquidity manager
        await (await farm.setLiquidityManager(liquidityManagerAddr)).wait();
    }
    // Method to listen for events on a farm contract
    async listenForFarmEvents(farmAddr, callback) {
        // Create a contract instance directly instead of using Farm class
        const contract = new ethers_1.ethers.Contract(farmAddr, Farm_1.FarmABI, this.provider);
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
    generateSalt(creatorAddress, requestId) {
        return ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.defaultAbiCoder.encode(['address', 'string'], [creatorAddress, requestId]));
    }
}
exports.BlockchainService = BlockchainService;
