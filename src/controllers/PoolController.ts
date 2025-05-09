import { Request, Response } from 'express';
import { PoolService } from '../services/PoolService';

export class PoolController {
  private poolService: PoolService;

  constructor() {
    this.poolService = new PoolService();
  }

  /**
   * Get pool statistics by pool address
   * @param req Express request object
   * @param res Express response object
   */
  getPoolStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { poolAddress } = req.params;
      
      if (!poolAddress) {
        res.status(400).json({
          status: 'failed',
          message: 'Pool address is required'
        });
        return;
      }

      // Get pool stats from service
      const poolStats = await this.poolService.getPoolStats(poolAddress);
      
      res.status(200).json({
        status: 'success',
        data: poolStats
      });
    } catch (error) {
      console.error('Error getting pool stats:', error);
      res.status(500).json({
        status: 'failed',
        message: (error as Error).message || 'Internal server error'
      });
    }
  };
}
