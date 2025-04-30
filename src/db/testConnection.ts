import { MongoClient } from 'mongodb';

// MongoDB connection string
const username = 'Debayan';
const password = 'Deba9774';
const dbName = 'Farm';

// Create the MongoDB connection string with the actual connection string
const uri = `mongodb+srv://${username}:${password}@cluster0.izsnuqx.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

// Create a new MongoClient
const client = new MongoClient(uri);

async function testConnection() {
  try {
    // Connect to the MongoDB cluster
    await client.connect();
    console.log('Connected successfully to MongoDB cluster');
    
    // Get the database
    const db = client.db(dbName);
    console.log(`Connected to database: ${db.databaseName}`);
    
    // List all collections in the database
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    return 'Connection test completed successfully';
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  } finally {
    // Close the connection when done
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the test
testConnection()
  .then(console.log)
  .catch(console.error);
