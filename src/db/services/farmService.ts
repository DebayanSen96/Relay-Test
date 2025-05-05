import { Farm, IFarm } from '../models/Farm';

// Define the interface for farm creation data
export interface ICreateFarmData {
  farmName: string;
  farmDescription: string;
  farmOwner: string;
  farmAddress: string;
  poolAddress: string;
  farmId: string;
  principalAssetAddress: string;
  strategyType: string;
  strategyContractAddress?: string;
  parameters: {
    [key: string]: any;
  };
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
  creatorAddress: string;
  network?: string;
  image_url?: string;
}

/**
 * Service for handling farm-related database operations
 */
export class FarmService {
  /**
   * Create a new farm record in the database if it doesn't already exist
   * @param farmData - Complete farm data object
   * @returns The created farm document or null if a duplicate exists
   */
  static async createFarm(farmData: ICreateFarmData): Promise<IFarm | null> {
    try {
      // Check if a farm with the same name and farmId already exists
      const existingFarm = await Farm.findOne({
        farmName: farmData.farmName,
        farmId: farmData.farmId
      });

      if (existingFarm) {
        console.log(`Farm with name '${farmData.farmName}' and ID '${farmData.farmId}' already exists. Skipping creation.`);
        return null;
      }

      // Create a new farm document
      const farm = new Farm(farmData);

      // Save and return the new farm document
      return await farm.save();
    } catch (error) {
      console.error('Error creating farm record:', error);
      throw error;
    }
  }

  /**
   * Get all farms owned by a specific wallet address
   * @param farmOwner - User wallet address
   * @returns Array of farm documents
   */
  static async getFarmsByOwner(farmOwner: string): Promise<IFarm[]> {
    try {
      return await Farm.find({ farmOwner }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error fetching farms by owner:', error);
      throw error;
    }
  }

  /**
   * Get a farm by its address
   * @param farmAddress - Farm contract address
   * @returns Farm document or null if not found
   */
  static async getFarmByAddress(farmAddress: string): Promise<IFarm | null> {
    try {
      return await Farm.findOne({ farmAddress });
    } catch (error) {
      console.error('Error fetching farm by address:', error);
      throw error;
    }
  }

  /**
   * Get a farm by its ID
   * @param farmId - Farm ID
   * @returns Farm document or null if not found
   */
  static async getFarmById(farmId: string): Promise<IFarm | null> {
    try {
      return await Farm.findOne({ farmId });
    } catch (error) {
      console.error('Error fetching farm by ID:', error);
      throw error;
    }
  }

  /**
   * Get a farm by its name and ID combination
   * @param farmName - Farm name
   * @param farmId - Farm ID
   * @returns Farm document or null if not found
   */
  static async getFarmByNameAndId(farmName: string, farmId: string): Promise<IFarm | null> {
    try {
      return await Farm.findOne({ farmName, farmId });
    } catch (error) {
      console.error('Error fetching farm by name and ID:', error);
      throw error;
    }
  }

  /**
   * Get all farms
   * @returns Array of all farm documents
   */
  static async getAllFarms(): Promise<IFarm[]> {
    try {
      return await Farm.find().sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error fetching all farms:', error);
      throw error;
    }
  }
}
