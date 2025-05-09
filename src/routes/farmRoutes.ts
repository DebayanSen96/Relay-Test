import { Router } from 'express';
import { FarmController } from '../controllers/FarmController';
import { PoolController } from '../controllers/PoolController';
import { validateFarmRequest, validateDeployFarm } from '../middlewares/validation';
import { DataSource } from 'typeorm';
import { handleValidationErrors } from '../middlewares/handleValidation'; // Import the handler
import { MongoFarmDataService } from '../services/MongoFarmService';
import { Request, Response } from 'express';
import { Farm, IFarm } from '../db/models/Farm';
import { FarmRequest, StrategyType } from '../models/FarmRequest';
import { FarmService } from '../services/FarmService';

// This function will be called when the database connection is established
export const initFarmRoutes = (dataSource: DataSource) => {
  console.log('[ROUTES] initFarmRoutes called.'); // <-- Add log
  const router = Router();
  const farmController = new FarmController(dataSource);
  const poolController = new PoolController();
  
  // Root endpoint for testing
  router.post('/', validateFarmRequest, handleValidationErrors, farmController.createFarmRequest);
  
  // Deploy a farm using MongoDB ID
  router.post('/:mongoId', async (req: Request, res: Response) => {
    try {
      const { mongoId } = req.params;
      const { principalAssetAddress, strategyContractAddress } = req.body;
      
      if (!mongoId) {
        res.status(400).json({
          status: 'failed',
          message: 'MongoDB ID is required'
        });
        return;
      }

      if (!principalAssetAddress || !strategyContractAddress) {
        res.status(400).json({
          status: 'failed',
          message: 'principalAssetAddress and strategyContractAddress are required'
        });
        return;
      }

      // Deploy the farm using the MongoDB ID and the provided addresses
      const result = await MongoFarmDataService.deployFarmWithMongoId(
        mongoId,
        principalAssetAddress,
        strategyContractAddress,
        dataSource
      );

      if (!result.success) {
        res.status(400).json({
          status: 'failed',
          message: result.message || 'Failed to deploy farm'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        farmId: result.farmId,
        farmAddress: result.farmAddress,
        poolAddress: result.poolAddress
      });
    } catch (error) {
      console.error('Error deploying farm:', error);
      res.status(500).json({
        status: 'failed',
        message: (error as Error).message || 'Internal server error'
      });
    }
  });
  
  // MongoDB specific endpoints
  // Get all farms from MongoDB
  router.get('/all_farms', async (req: Request, res: Response) => {
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
  });
  
  // Get farms by wallet address
  router.get('/wallet/:walletAddress', async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        res.status(400).json({
          status: 'failed',
          message: 'Wallet address is required'
        });
        return;
      }

      // Get farms from MongoDB
      const farms = await MongoFarmDataService.getFarmsByOwner(walletAddress);
      res.status(200).json({
        status: 'success',
        count: farms.length,
        data: farms
      });
    } catch (error) {
      console.error('Error getting farms by wallet address:', error);
      res.status(500).json({
        status: 'failed',
        message: (error as Error).message || 'Internal server error'
      });
    }
  });

  // Get farm by address from MongoDB
  router.get('/mongo/farms/address/:farmAddress', async (req: Request, res: Response) => {
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
  });
  
  // Add a health check endpoint
  router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Farm API is running' });
  });
  
  // Pool stats endpoint
  router.get('/pool/:poolAddress', poolController.getPoolStats);
  
  return router;
};
