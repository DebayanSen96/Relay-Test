import { FarmService as MongoFarmService, ICreateFarmData } from '../db/services/farmService';
import { Farm, IFarm } from '../db/models/Farm';
import mongoose from 'mongoose';
import { FarmRequest } from '../models/FarmRequest';
import { FarmService } from '../services/FarmService';

/**
 * Service for handling MongoDB farm-related operations
 * This is separate from the main FarmService to avoid conflicts
 */
export class MongoFarmDataService {
  /**
   * Store initial farm data in MongoDB without strategy and principal asset addresses
   * @param data - The initial farm data
   * @returns Promise that resolves with the MongoDB document ID or null if duplicate
   */
  static async storeInitialFarmData(data: {
    farmName: string;
    farmDescription: string;
    farmLogoUrl?: string;
    strategyType: string;
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
  }) {
    try {
      // Generate a temporary farm ID for the initial record
      const tempFarmId = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create a complete farm data object with empty addresses that will be filled later
      const farmData: ICreateFarmData = {
        farmName: data.farmName,
        farmDescription: data.farmDescription,
        farmOwner: data.creatorAddress,
        farmAddress: "", // Empty string, will be updated later
        poolAddress: "", // Empty string, will be updated later
        farmId: tempFarmId, // Temporary ID, will be updated later
        principalAssetAddress: "", // Empty string, will be updated later
        strategyType: data.strategyType,
        strategyContractAddress: "", // Empty string, will be updated later
        parameters: data.parameters,
        incentiveSplits: data.incentiveSplits,
        maturityPeriodDays: data.maturityPeriodDays,
        claimToken: data.claimToken,
        creatorAddress: data.creatorAddress
      };

      console.log('Storing initial farm data in MongoDB:', {
        farmName: farmData.farmName,
        tempFarmId: farmData.farmId
      });
      
      // Store the farm data in MongoDB
      const result = await MongoFarmService.createFarm(farmData);
      
      if (result) {
        // Cast result to IFarm to access _id property with the correct type
        const farm = result as IFarm & { _id: mongoose.Types.ObjectId };
        console.log('Initial farm data stored successfully in MongoDB with ID:', farm._id);
        return { success: true, mongoId: farm._id.toString() };
      } else {
        console.log('Farm already exists in MongoDB, skipped creation');
        return { success: false, message: 'Duplicate farm entry' };
      }
    } catch (error) {
      console.error('Error storing initial farm data in MongoDB:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Deploy a farm using MongoDB document ID
   * @param mongoId - MongoDB document ID
   * @param principalAssetAddress - Principal asset address
   * @param strategyContractAddress - Strategy contract address
   * @param dataSource - TypeORM data source for database access
   * @returns Promise that resolves with the deployed farm details
   */
  static async deployFarmWithMongoId(
    mongoId: string,
    principalAssetAddress: string,
    strategyContractAddress: string,
    dataSource: any
  ) {
    try {
      // 1. Get the farm data from MongoDB
      const farmData = await Farm.findById(mongoId);
      if (!farmData) {
        return { success: false, message: 'Farm data not found' };
      }

      // 2. Update the farm data with the provided addresses
      const updateResult = await this.updateFarmAddresses(
        mongoId,
        principalAssetAddress,
        strategyContractAddress,
        "", // farmAddress will be set during deployment
        "", // poolAddress will be set during deployment
        "" // farmId will be set during deployment
      );

      if (!updateResult.success) {
        return { success: false, message: updateResult.message || 'Failed to update farm addresses' };
      }

      // 3. Create a FarmRequest object to use with the existing deployment logic
      const farmService = new FarmService(dataSource);
      
      // 4. Create a farm request in the main database
      const farmRequest = await farmService.createFarmRequest({
        farmName: farmData.farmName,
        farmDescription: farmData.farmDescription,
        principalAssetAddress: principalAssetAddress,
        strategyType: farmData.strategyType as any,
        strategyContractAddress: strategyContractAddress,
        parameters: farmData.parameters,
        incentiveSplits: farmData.incentiveSplits,
        maturityPeriodDays: farmData.maturityPeriodDays,
        claimToken: farmData.claimToken,
        creatorAddress: farmData.creatorAddress
      });

      // 5. Deploy the farm using the request ID
      const deployedFarm = await farmService.deployFarm(farmRequest.id);

      // 6. Update the MongoDB document with the deployed farm details
      await this.updateFarmAddresses(
        mongoId,
        principalAssetAddress,
        strategyContractAddress,
        deployedFarm.farmAddress || "",
        deployedFarm.poolAddress || "",
        deployedFarm.farmId || ""
      );

      return {
        success: true,
        farmId: deployedFarm.farmId,
        farmAddress: deployedFarm.farmAddress,
        poolAddress: deployedFarm.poolAddress
      };
    } catch (error) {
      console.error('Error deploying farm with MongoDB ID:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Update farm data with strategy and principal asset addresses
   * @param mongoId - MongoDB document ID
   * @param principalAssetAddress - Principal asset address
   * @param strategyContractAddress - Strategy contract address
   * @param farmAddress - Deployed farm contract address
   * @param poolAddress - Associated pool address
   * @param farmId - Unique identifier for the farm
   * @returns Promise that resolves with success status
   */
  static async updateFarmAddresses(
    mongoId: string,
    principalAssetAddress: string,
    strategyContractAddress: string,
    farmAddress: string,
    poolAddress: string,
    farmId: string
  ) {
    try {
      // Find the farm by MongoDB ID and update it
      const result = await Farm.findByIdAndUpdate(
        mongoId,
        {
          $set: {
            principalAssetAddress,
            strategyContractAddress,
            farmAddress,
            poolAddress,
            farmId
          }
        },
        { new: true } // Return the updated document
      );

      if (result) {
        console.log('Farm addresses updated successfully in MongoDB');
        return { success: true };
      } else {
        console.log('Farm not found in MongoDB');
        return { success: false, message: 'Farm not found' };
      }
    } catch (error) {
      console.error('Error updating farm addresses in MongoDB:', error);
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * Store farm deployment data in MongoDB
   * @param farmRequest - The farm request object from the main application
   * @param farmAddress - Deployed farm contract address
   * @param poolAddress - Associated pool address
   * @param farmId - Unique identifier for the farm
   * @returns Promise that resolves when the data is stored
   */
  static async storeFarmDeployment(
    farmRequest: FarmRequest,
    farmAddress: string,
    poolAddress: string,
    farmId: string
  ): Promise<void> {
    try {
      // Create a complete farm data object from the farm request
      const farmData: ICreateFarmData = {
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
      const result = await MongoFarmService.createFarm(farmData);
      
      if (result) {
        console.log('Farm deployment data stored successfully in MongoDB');
      } else {
        console.log('Farm already exists in MongoDB, skipped creation');
      }
    } catch (error) {
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
  static async getFarmsByOwner(farmOwner: string) {
    try {
      return await MongoFarmService.getFarmsByOwner(farmOwner);
    } catch (error) {
      console.error('Error fetching farms by owner from MongoDB:', error);
      return [];
    }
  }

  /**
   * Get a farm by its address
   * @param farmAddress - Farm contract address
   */
  static async getFarmByAddress(farmAddress: string) {
    try {
      return await MongoFarmService.getFarmByAddress(farmAddress);
    } catch (error) {
      console.error('Error fetching farm by address from MongoDB:', error);
      return null;
    }
  }

  /**
   * Get a farm by its name and ID combination
   * @param farmName - Farm name
   * @param farmId - Farm ID
   */
  static async getFarmByNameAndId(farmName: string, farmId: string) {
    try {
      return await MongoFarmService.getFarmByNameAndId(farmName, farmId);
    } catch (error) {
      console.error('Error fetching farm by name and ID from MongoDB:', error);
      return null;
    }
  }

  /**
   * Get all farms
   */
  static async getAllFarms() {
    try {
      return await MongoFarmService.getAllFarms();
    } catch (error) {
      console.error('Error fetching all farms from MongoDB:', error);
      return [];
    }
  }
}
