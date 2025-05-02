"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmController = void 0;
const FarmService_1 = require("../services/FarmService");
const express_validator_1 = require("express-validator");
const MongoFarmService_1 = require("../services/MongoFarmService");
class FarmController {
    constructor(dataSource) {
        this.createFarmRequest = async (req, res) => {
            console.log('[CONTROLLER] createFarmRequest entered.');
            try {
                // Check for validation errors
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({ errors: errors.array() });
                    return;
                }
                // Extract creator address from authentication
                // In a real implementation, this would come from JWT or wallet signature
                const creatorAddress = req.headers['x-creator-address'];
                if (!creatorAddress) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
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
                const mongoResult = await MongoFarmService_1.MongoFarmDataService.storeInitialFarmData({
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
            }
            catch (error) {
                console.error('Error creating farm request:', error);
                res.status(500).json({
                    error: error.message || 'Internal server error'
                });
            }
        };
        this.deployFarm = async (req, res) => {
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
            }
            catch (error) {
                console.error('Error deploying farm:', error);
                res.status(500).json({
                    error: error.message || 'Internal server error'
                });
            }
        };
        this.getFarmRequest = async (req, res) => {
            try {
                const { requestId } = req.params;
                // In a real implementation, we would fetch the farm request from the database
                // For now, we'll just return a placeholder response
                res.status(200).json({
                    requestId,
                    status: 'PENDING_DEPLOYMENT',
                    message: 'This is a placeholder response. In a real implementation, we would fetch the farm request from the database.'
                });
            }
            catch (error) {
                console.error('Error getting farm request:', error);
                res.status(500).json({
                    error: error.message || 'Internal server error'
                });
            }
        };
        this.farmService = new FarmService_1.FarmService(dataSource);
    }
}
exports.FarmController = FarmController;
