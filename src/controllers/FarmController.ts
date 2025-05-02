import { Request, Response } from 'express';
import { FarmService } from '../services/FarmService';
import { StrategyType } from '../models/FarmRequest';
import { validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { MongoFarmDataService } from '../services/MongoFarmService';

export class FarmController {
  private farmService: FarmService;

  constructor(dataSource: DataSource) {
    this.farmService = new FarmService(dataSource);
  }

  createFarmRequest = async (req: Request, res: Response): Promise<void> => {
    console.log('[CONTROLLER] createFarmRequest entered.');
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      // Get creator address from the request body
      const creatorAddress = req.body.creatorAddress;
      
      // If not provided, return an error
      if (!creatorAddress) {
        res.status(400).json({ error: 'Creator address is required in the request body' });
        return;
      }
      
      console.log('Using creator address from request body:', creatorAddress);

      // Create farm request in the main database (PostgreSQL)
      // Extract only the fields we need, excluding principalAssetAddress and strategyContractAddress
      const farmRequest = await this.farmService.createFarmRequest({
        farmName: req.body.farmName,
        farmDescription: req.body.farmDescription,
        farmLogoUrl: req.body.farmLogoUrl,
        strategyType: req.body.strategyType,
        parameters: req.body.parameters,
        incentiveSplits: req.body.incentiveSplits,
        maturityPeriodDays: req.body.maturityPeriodDays,
        claimToken: req.body.claimToken,
        creatorMetadata: req.body.creatorMetadata,
        creatorAddress
      });

      // Store initial farm data in MongoDB without principalAssetAddress and strategyContractAddress
      const mongoResult = await MongoFarmDataService.storeInitialFarmData({
        farmName: req.body.farmName,
        farmDescription: req.body.farmDescription,
        farmLogoUrl: req.body.farmLogoUrl,
        strategyType: req.body.strategyType,
        parameters: req.body.parameters,
        incentiveSplits: req.body.incentiveSplits,
        maturityPeriodDays: req.body.maturityPeriodDays,
        claimToken: req.body.claimToken,
        creatorMetadata: req.body.creatorMetadata,
        creatorAddress: creatorAddress
      });

      console.log('[CONTROLLER] Responding with requestId:', farmRequest.id, 'and status:', farmRequest.status);
      
      // Return only the MongoDB ID, status, and message
      res.status(201).json({
        mongoId: mongoResult.success ? mongoResult.mongoId : null,
        status: mongoResult.success ? 'success' : 'failed',
        message: mongoResult.success ? 'Farm data stored in MongoDB' : mongoResult.message
      });
    } catch (error) {
      console.error('Error creating farm request:', error);
      res.status(500).json({
        error: (error as Error).message || 'Internal server error'
      });
    }
  };

  deployFarm = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;

      // In a real implementation, we would check if the user has admin privileges
      // For now, we'll just proceed with the deployment

      // Deploy the farm
      const farmRequest = await this.farmService.deployFarm(requestId);

      res.status(200).json({
        status: 'success',
        farmId: farmRequest.farmId,
        farmAddress: farmRequest.farmAddress,
        poolAddress: farmRequest.poolAddress
      });
    } catch (error) {
      console.error('Error deploying farm:', error);
      res.status(500).json({
        error: (error as Error).message || 'Internal server error'
      });
    }
  };

  getFarmRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      
      // In a real implementation, we would fetch the farm request from the database
      // For now, we'll just return a placeholder response
      
      res.status(200).json({
        requestId,
        status: 'PENDING_DEPLOYMENT',
        message: 'This is a placeholder response. In a real implementation, we would fetch the farm request from the database.'
      });
    } catch (error) {
      console.error('Error getting farm request:', error);
      res.status(500).json({
        error: (error as Error).message || 'Internal server error'
      });
    }
  };
}
