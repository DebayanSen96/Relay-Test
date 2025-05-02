import { connectToDatabase, disconnectFromDatabase } from './connection';
import mongoose from 'mongoose';

/**
 * Script to reset the farms collection and its indexes
 */
async function resetCollection() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectToDatabase();
    console.log('Connected to MongoDB successfully');

    // Drop the farms collection
    console.log('Dropping farms collection...');
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropCollection('farms').catch(err => {
        // Ignore error if collection doesn't exist
        if (err.code !== 26) { // 26 is the error code for 'ns not found'
          throw err;
        }
        console.log('Collection does not exist yet, skipping drop');
      });
    } else {
      console.log('Database connection not fully established, skipping drop');
    }
    
    console.log('Collection dropped successfully');
    return 'Collection reset completed successfully';
  } catch (error) {
    console.error('Error in collection reset:', error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    await disconnectFromDatabase();
    console.log('Disconnected from MongoDB');
  }
}

// Run the reset
resetCollection()
  .then(console.log)
  .catch(console.error);
