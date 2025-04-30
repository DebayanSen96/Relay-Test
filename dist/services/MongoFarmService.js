"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoFarmDataService = void 0;
const farmService_1 = require("../db/services/farmService");
/**
 * Service for handling MongoDB farm-related operations
 * This is separate from the main FarmService to avoid conflicts
 */
class MongoFarmDataService {
    /**
     * Store farm deployment data in MongoDB
     * @param farmRequest - The farm request object from the main application
     * @param farmAddress - Deployed farm contract address
     * @param poolAddress - Associated pool address
     * @param farmId - Unique identifier for the farm
     * @returns Promise that resolves when the data is stored
     */
    static async storeFarmDeployment(farmRequest, farmAddress, poolAddress, farmId) {
        try {
            // Create a complete farm data object from the farm request
            const farmData = {
                farmName: farmRequest.farmName,
                farmDescription: farmRequest.farmDescription,
                farmOwner: farmRequest.creatorAddress,
                farmAddress: farmAddress,
                poolAddress: poolAddress,
                farmId: farmId,
                principalAssetAddress: farmRequest.principalAssetAddress,
                strategyType: farmRequest.strategyType,
                strategyContractAddress: farmRequest.strategyContractAddress || undefined,
                parameters: farmRequest.parameters,
                incentiveSplits: farmRequest.incentiveSplits,
                maturityPeriodDays: farmRequest.maturityPeriodDays,
                claimToken: farmRequest.claimToken,
                creatorAddress: farmRequest.creatorAddress
            };
            console.log('Storing farm deployment data in MongoDB:', {
                farmName: farmData.farmName,
                farmId: farmData.farmId,
                farmAddress: farmData.farmAddress
            });
            // Store the farm data in MongoDB, checking for duplicates
            const result = await farmService_1.FarmService.createFarm(farmData);
            if (result) {
                console.log('Farm deployment data stored successfully in MongoDB');
            }
            else {
                console.log('Farm already exists in MongoDB, skipped creation');
            }
        }
        catch (error) {
            console.error('Error storing farm deployment data in MongoDB:', error);
            // Don't throw the error to prevent disrupting the main flow
            // Just log it and continue
        }
    }
    /**
     * Get all farms owned by a specific wallet address
     * @param farmOwner - User wallet address
     * @returns Array of farm documents
     */
    static async getFarmsByOwner(farmOwner) {
        try {
            return await farmService_1.FarmService.getFarmsByOwner(farmOwner);
        }
        catch (error) {
            console.error('Error fetching farms by owner from MongoDB:', error);
            return [];
        }
    }
    /**
     * Get a farm by its address
     * @param farmAddress - Farm contract address
     */
    static async getFarmByAddress(farmAddress) {
        try {
            return await farmService_1.FarmService.getFarmByAddress(farmAddress);
        }
        catch (error) {
            console.error('Error fetching farm by address from MongoDB:', error);
            return null;
        }
    }
    /**
     * Get a farm by its name and ID combination
     * @param farmName - Farm name
     * @param farmId - Farm ID
     */
    static async getFarmByNameAndId(farmName, farmId) {
        try {
            return await farmService_1.FarmService.getFarmByNameAndId(farmName, farmId);
        }
        catch (error) {
            console.error('Error fetching farm by name and ID from MongoDB:', error);
            return null;
        }
    }
    /**
     * Get all farms
     */
    static async getAllFarms() {
        try {
            return await farmService_1.FarmService.getAllFarms();
        }
        catch (error) {
            console.error('Error fetching all farms from MongoDB:', error);
            return [];
        }
    }
}
exports.MongoFarmDataService = MongoFarmDataService;
