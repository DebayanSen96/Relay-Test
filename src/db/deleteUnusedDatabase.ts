import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string
const username = 'Debayan';
const password = 'Deba9774';
const uri = `mongodb+srv://${username}:${password}@cluster0.izsnuqx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

/**
 * Script to delete the unused 'Farms' database
 */
async function deleteUnusedDatabase() {
  let client;
  try {
    console.log('Connecting to MongoDB...');
    // Connect without specifying a database
    client = await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully');

    // List all databases
    console.log('Listing all databases...');
    if (client && client.connection && client.connection.db) {
      const adminDb = client.connection.db.admin();
      const dbList = await adminDb.listDatabases();
      console.log('Available databases:');
      dbList.databases.forEach((db: any) => {
        console.log(`- ${db.name}`);
      });

      // Drop the 'Farms' database if it exists
      console.log('\nAttempting to drop the "Farms" database...');
      const farmsExists = dbList.databases.some((db: any) => db.name === 'Farms');
      
      if (farmsExists) {
        await client.connection.db.admin().command({ dropDatabase: 1, dbName: 'Farms' });
        console.log('"Farms" database dropped successfully');
      } else {
        console.log('"Farms" database does not exist, nothing to drop');
      }
    } else {
      console.log('Database connection not fully established, cannot list databases');
    }

    // We've already handled the database drop in the if block above

    console.log('\nWe are now using only the "Farm" database (capital F, no s)');
    return 'Unused database cleanup completed successfully';
  } catch (error) {
    console.error('Error in database cleanup:', error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    if (client) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the cleanup
deleteUnusedDatabase()
  .then(console.log)
  .catch(console.error);
