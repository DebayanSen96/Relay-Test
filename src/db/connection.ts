import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string using environment variables
const username = process.env.MONGODB_USERNAME || '';
const password = process.env.MONGODB_PASSWORD || '';
const dbName = process.env.MONGODB_DATABASE || 'Farm';
const cluster = process.env.MONGODB_CLUSTER || 'cluster0.izsnuqx.mongodb.net';

// Construct the MongoDB URI
const uri = `mongodb+srv://${username}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

/**
 * Connect to MongoDB
 */
export const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
    throw error;
  }
};

// Export the mongoose instance
export default mongoose;
