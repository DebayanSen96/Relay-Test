"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFarmRoutes = void 0;
const express_1 = require("express");
const FarmController_1 = require("../controllers/FarmController");
const validation_1 = require("../middlewares/validation");
const handleValidation_1 = require("../middlewares/handleValidation"); // Import the handler
// This function will be called when the database connection is established
const initFarmRoutes = (dataSource) => {
    console.log('[ROUTES] initFarmRoutes called.'); // <-- Add log
    const router = (0, express_1.Router)();
    const farmController = new FarmController_1.FarmController(dataSource);
    // Root endpoint for testing
    router.post('/', validation_1.validateFarmRequest, handleValidation_1.handleValidationErrors, farmController.createFarmRequest);
    // Create a new farm request
    router.post('/requests', validation_1.validateFarmRequest, handleValidation_1.handleValidationErrors, farmController.createFarmRequest);
    // Deploy a farm
    router.get('/deploy/:requestId', /* Add validation if needed */ handleValidation_1.handleValidationErrors, farmController.deployFarm);
    // Get farm request details
    router.get('/requests/:requestId', /* Add validation if needed */ handleValidation_1.handleValidationErrors, farmController.getFarmRequest);
    // Add a health check endpoint
    router.get('/', (req, res) => {
        res.status(200).json({ status: 'ok', message: 'Farm API is running' });
    });
    return router;
};
exports.initFarmRoutes = initFarmRoutes;
