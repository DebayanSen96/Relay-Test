import { Request, Response } from 'express';
import { MongoFarmDataService } from '../services/MongoFarmService';

/**
 * Controller for handling MongoDB farm-related operations
 */
export class MongoFarmController {
  /**
   * Get all farms stored in MongoDB
   */
  static async getAllFarms(req: Request, res: Response): Promise<void> {
    try {
      const farms = await MongoFarmDataService.getAllFarms();
      res.status(200).json({
        status: 'success',
        count: farms.length,
        data: farms
      });
    } catch (error) {
      console.error('Error getting all farms from MongoDB:', error);
      res.status(500).json({
        error: (error as Error).message || 'Internal server error'
      });
    }
  }

  /**
   * Get farms by owner address
   */
  static async getFarmsByOwner(req: Request, res: Response): Promise<void> {
    try {
      const { ownerAddress } = req.params;
      
      if (!ownerAddress) {
        res.status(400).json({
          error: 'Owner address is required'
        });
        return;
      }

      const farms = await MongoFarmDataService.getFarmsByOwner(ownerAddress);
      res.status(200).json({
        status: 'success',
        count: farms.length,
        data: farms
      });
    } catch (error) {
      console.error('Error getting farms by owner from MongoDB:', error);
      res.status(500).json({
        error: (error as Error).message || 'Internal server error'
      });
    }
  }

  /**
   * Get farm by address
   */
  static async getFarmByAddress(req: Request, res: Response): Promise<void> {
    try {
      const { farmAddress } = req.params;
      
      if (!farmAddress) {
        res.status(400).json({
          error: 'Farm address is required'
        });
        return;
      }

      const farm = await MongoFarmDataService.getFarmByAddress(farmAddress);
      
      if (!farm) {
        res.status(404).json({
          error: `Farm with address ${farmAddress} not found`
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: farm
      });
    } catch (error) {
      console.error('Error getting farm by address from MongoDB:', error);
      res.status(500).json({
        error: (error as Error).message || 'Internal server error'
      });
    }
  }
}
