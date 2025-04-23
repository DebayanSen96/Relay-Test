import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'reflect-metadata';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { initFarmRoutes } from './routes/farmRoutes';
import { DataSource } from 'typeorm';
import { ContractDeployer } from './contracts/deploy/ContractDeployer';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    const dataSource = await connectDatabase();
    console.log('Database connected successfully');
    
    // Deploy smart contracts if needed
    console.log('Deploying smart contracts...');
    const contractDeployer = new ContractDeployer();
    const deployedContracts = await contractDeployer.deployAllContracts();
    console.log('Smart contracts deployed successfully');
    console.log('Deployed contract addresses:', deployedContracts);
    
    // Initialize routes with the database connection
    console.log('Initializing API routes...');
    console.log('[APP] About to initialize farm routes...');
    app.use('/api/v1/farms', initFarmRoutes(dataSource));
    console.log('[APP] Farm routes initialized.');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API endpoint: http://localhost:${PORT}/api/v1/farms`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
