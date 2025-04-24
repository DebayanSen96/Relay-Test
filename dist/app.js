"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const farmRoutes_1 = require("./routes/farmRoutes");
const ContractDeployer_1 = require("./contracts/deploy/ContractDeployer");
// Load environment variables
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Request logging middleware
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
    next();
});
// Routes will be initialized after database connection
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// Start the server
const startServer = async () => {
    try {
        console.log('Starting server initialization...');
        // Connect to the database
        console.log('Connecting to database...');
        const dataSource = await (0, database_1.connectDatabase)();
        console.log('Database connected successfully');
        // Deploy smart contracts if needed
        console.log('Deploying smart contracts...');
        const contractDeployer = new ContractDeployer_1.ContractDeployer();
        const deployedContracts = await contractDeployer.deployAllContracts();
        console.log('Smart contracts deployed successfully');
        console.log('Deployed contract addresses:', deployedContracts);
        // Initialize routes with the database connection
        console.log('Initializing API routes...');
        console.log('[APP] About to initialize farm routes...');
        app.use('/api/v1/farms', (0, farmRoutes_1.initFarmRoutes)(dataSource));
        console.log('[APP] Farm routes initialized.');
        // Start the server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`API endpoint: http://localhost:${PORT}/api/v1/farms`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}
exports.default = app;
