"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFarmRoutes = void 0;
const express_1 = require("express");
const FarmController_1 = require("../controllers/FarmController");
const validation_1 = require("../middlewares/validation");
const handleValidation_1 = require("../middlewares/handleValidation"); // Import the handler
const MongoFarmService_1 = require("../services/MongoFarmService");
// This function will be called when the database connection is established
const initFarmRoutes = (dataSource) => {
    console.log('[ROUTES] initFarmRoutes called.'); // <-- Add log
    const router = (0, express_1.Router)();
    const farmController = new FarmController_1.FarmController(dataSource);
    // Root endpoint for testing
    router.post('/', validation_1.validateFarmRequest, handleValidation_1.handleValidationErrors, farmController.createFarmRequest);
    // Create a new farm request
    router.post('/requests', validation_1.validateFarmRequest, handleValidation_1.handleValidationErrors, farmController.createFarmRequest);
    // Deploy a farm using request ID (legacy)
    router.get('/deploy/:requestId', /* Add validation if needed */ handleValidation_1.handleValidationErrors, farmController.deployFarm);
    // Deploy a farm using MongoDB ID
    router.post('/:mongoId', async (req, res) => {
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
            const result = await MongoFarmService_1.MongoFarmDataService.deployFarmWithMongoId(mongoId, principalAssetAddress, strategyContractAddress, dataSource);
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
        }
        catch (error) {
            console.error('Error deploying farm:', error);
            res.status(500).json({
                status: 'failed',
                message: error.message || 'Internal server error'
            });
        }
    });
    // Get farm request details
    router.get('/requests/:requestId', /* Add validation if needed */ handleValidation_1.handleValidationErrors, farmController.getFarmRequest);
    // MongoDB specific endpoints
    // Get all farms from MongoDB
    router.get('/mongo/farms', async (req, res) => {
        try {
            const farms = await MongoFarmService_1.MongoFarmDataService.getAllFarms();
            res.status(200).json({
                status: 'success',
                count: farms.length,
                data: farms
            });
        }
        catch (error) {
            console.error('Error getting all farms from MongoDB:', error);
            res.status(500).json({
                error: error.message || 'Internal server error'
            });
        }
    });
    // Get farms by owner from MongoDB
    router.get('/mongo/farms/owner/:ownerAddress', async (req, res) => {
        try {
            const { ownerAddress } = req.params;
            if (!ownerAddress) {
                res.status(400).json({
                    error: 'Owner address is required'
                });
                return;
            }
            const farms = await MongoFarmService_1.MongoFarmDataService.getFarmsByOwner(ownerAddress);
            res.status(200).json({
                status: 'success',
                count: farms.length,
                data: farms
            });
        }
        catch (error) {
            console.error('Error getting farms by owner from MongoDB:', error);
            res.status(500).json({
                error: error.message || 'Internal server error'
            });
        }
    });
    // Get farms by wallet address
    router.get('/wallet/:walletAddress', async (req, res) => {
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
            const farms = await MongoFarmService_1.MongoFarmDataService.getFarmsByOwner(walletAddress);
            res.status(200).json({
                status: 'success',
                count: farms.length,
                data: farms
            });
        }
        catch (error) {
            console.error('Error getting farms by wallet address:', error);
            res.status(500).json({
                status: 'failed',
                message: error.message || 'Internal server error'
            });
        }
    });
    // Get farm by address from MongoDB
    router.get('/mongo/farms/address/:farmAddress', async (req, res) => {
        try {
            const { farmAddress } = req.params;
            if (!farmAddress) {
                res.status(400).json({
                    error: 'Farm address is required'
                });
                return;
            }
            const farm = await MongoFarmService_1.MongoFarmDataService.getFarmByAddress(farmAddress);
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
        }
        catch (error) {
            console.error('Error getting farm by address from MongoDB:', error);
            res.status(500).json({
                error: error.message || 'Internal server error'
            });
        }
    });
    // Add a health check endpoint
    router.get('/', (req, res) => {
        res.status(200).json({ status: 'ok', message: 'Farm API is running' });
    });
    return router;
};
exports.initFarmRoutes = initFarmRoutes;
