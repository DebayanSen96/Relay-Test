import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string
const username = 'Debayan';
const password = 'Deba9774';
const dbName = 'Farm';
const uri = `mongodb+srv://${username}:${password}@cluster0.izsnuqx.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

// For production, it's better to use environment variables
// const uri = process.env.MONGODB_URI || '';

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
