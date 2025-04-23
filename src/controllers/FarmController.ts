import { Request, Response } from 'express';
import { FarmService } from '../services/FarmService';
import { StrategyType } from '../models/FarmRequest';
import { validationResult } from 'express-validator';
import { DataSource } from 'typeorm';

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

      // Extract creator address from authentication
      // In a real implementation, this would come from JWT or wallet signature
      const creatorAddress = req.headers['x-creator-address'] as string;
      if (!creatorAddress) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Create farm request
      const farmRequest = await this.farmService.createFarmRequest({
        ...req.body,
        creatorAddress
      });

      res.status(201).json({
        requestId: farmRequest.id,
        status: farmRequest.status
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
