"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const farmRoutes_1 = require("./routes/farmRoutes");
const ContractDeployer_1 = require("./contracts/deploy/ContractDeployer");
const connection_1 = require("./db/connection");
// Load environment variables
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        console.log('Starting server initialization...');
        // Connect to PostgreSQL database
        console.log('Connecting to PostgreSQL database...');
        const dataSource = await (0, database_1.connectDatabase)();
        console.log('PostgreSQL database connected successfully');
        // Connect to MongoDB database
        console.log('Connecting to MongoDB database...');
        await (0, connection_1.connectToDatabase)();
        console.log('MongoDB database connected successfully');
        console.log('Deploying smart contracts...');
        const contractDeployer = new ContractDeployer_1.ContractDeployer();
        const deployedContracts = await contractDeployer.deployAllContracts();
        console.log('Smart contracts deployed successfully:', deployedContracts);
        console.log('Initializing API routes...');
        app_1.default.use('/api/v1/farms', (0, farmRoutes_1.initFarmRoutes)(dataSource));
        console.log('API routes initialized');
        console.log('Starting HTTP server...');
        app_1.default.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`API endpoint: http://localhost:${PORT}/api/v1/farms`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Run the server
startServer();
