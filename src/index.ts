import 'reflect-metadata';
import dotenv from 'dotenv';
import app from './app';
import { connectDatabase } from './config/database';
import { initFarmRoutes } from './routes/farmRoutes';
import { ContractDeployer } from './contracts/deploy/ContractDeployer';
import { DataSource } from 'typeorm';
import { connectToDatabase } from './db/connection';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
  try {
    console.log('Starting server initialization...');
    
    // Connect to TypeORM data source (in-memory or PostgreSQL)
    console.log('Initializing TypeORM data source...');
    const dataSource: DataSource = await connectDatabase();
    console.log('TypeORM data source initialized successfully');
    
    // Connect to MongoDB database
    console.log('Connecting to MongoDB database...');
    await connectToDatabase();
    console.log('MongoDB database connected successfully');

    console.log('Deploying smart contracts...');
    const contractDeployer = new ContractDeployer();
    const deployedContracts = await contractDeployer.deployAllContracts();
    console.log('Smart contracts deployed successfully:', deployedContracts);

    console.log('Initializing API routes...');
    app.use('/api/v1/farms', initFarmRoutes(dataSource));
    console.log('API routes initialized');

    console.log('Starting HTTP server...');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API endpoint: http://localhost:${PORT}/api/v1/farms`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Run the server
startServer();
