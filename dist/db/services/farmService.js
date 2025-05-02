"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmService = void 0;
const Farm_1 = require("../models/Farm");
/**
 * Service for handling farm-related database operations
 */
class FarmService {
    /**
     * Create a new farm record in the database if it doesn't already exist
     * @param farmData - Complete farm data object
     * @returns The created farm document or null if a duplicate exists
     */
    static async createFarm(farmData) {
        try {
            // Check if a farm with the same name and farmId already exists
            const existingFarm = await Farm_1.Farm.findOne({
                farmName: farmData.farmName,
                farmId: farmData.farmId
            });
            if (existingFarm) {
                console.log(`Farm with name '${farmData.farmName}' and ID '${farmData.farmId}' already exists. Skipping creation.`);
                return null;
            }
            // Create a new farm document
            const farm = new Farm_1.Farm(farmData);
            // Save and return the new farm document
            return await farm.save();
        }
        catch (error) {
            console.error('Error creating farm record:', error);
            throw error;
        }
    }
    /**
     * Get all farms owned by a specific wallet address
     * @param farmOwner - User wallet address
     * @returns Array of farm documents
     */
    static async getFarmsByOwner(farmOwner) {
        try {
            return await Farm_1.Farm.find({ farmOwner }).sort({ createdAt: -1 });
        }
        catch (error) {
            console.error('Error fetching farms by owner:', error);
            throw error;
        }
    }
    /**
     * Get a farm by its address
     * @param farmAddress - Farm contract address
     * @returns Farm document or null if not found
     */
    static async getFarmByAddress(farmAddress) {
        try {
            return await Farm_1.Farm.findOne({ farmAddress });
        }
        catch (error) {
            console.error('Error fetching farm by address:', error);
            throw error;
        }
    }
    /**
     * Get a farm by its ID
     * @param farmId - Farm ID
     * @returns Farm document or null if not found
     */
    static async getFarmById(farmId) {
        try {
            return await Farm_1.Farm.findOne({ farmId });
        }
        catch (error) {
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
    static async getFarmByNameAndId(farmName, farmId) {
        try {
            return await Farm_1.Farm.findOne({ farmName, farmId });
        }
        catch (error) {
            console.error('Error fetching farm by name and ID:', error);
            throw error;
        }
    }
    /**
     * Get all farms
     * @returns Array of all farm documents
     */
    static async getAllFarms() {
        try {
            return await Farm_1.Farm.find().sort({ createdAt: -1 });
        }
        catch (error) {
            console.error('Error fetching all farms:', error);
            throw error;
        }
    }
}
exports.FarmService = FarmService;
