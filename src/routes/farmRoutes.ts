import { Router } from 'express';
import { FarmController } from '../controllers/FarmController';
import { validateFarmRequest, validateDeployFarm } from '../middlewares/validation';
import { DataSource } from 'typeorm';
import { handleValidationErrors } from '../middlewares/handleValidation'; // Import the handler

// This function will be called when the database connection is established
export const initFarmRoutes = (dataSource: DataSource) => {
  console.log('[ROUTES] initFarmRoutes called.'); // <-- Add log
  const router = Router();
  const farmController = new FarmController(dataSource);
  
  // Root endpoint for testing
  router.post('/', validateFarmRequest, handleValidationErrors, farmController.createFarmRequest);
  
  // Create a new farm request
  router.post('/requests', validateFarmRequest, handleValidationErrors, farmController.createFarmRequest);
  
  // Deploy a farm
  router.post('/deploy/:requestId', /* Add validation if needed */ handleValidationErrors, farmController.deployFarm);
  
  // Get farm request details
  router.get('/requests/:requestId', /* Add validation if needed */ handleValidationErrors, farmController.getFarmRequest);
  
  // Add a health check endpoint
  router.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Farm API is running' });
  });
  
  return router;
};
