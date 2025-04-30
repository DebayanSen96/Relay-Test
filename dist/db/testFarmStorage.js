"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("./connection");
const Farm_1 = require("./models/Farm");
/**
 * Test script to verify MongoDB farm storage and retrieval
 */
async function testFarmStorage() {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await (0, connection_1.connectToDatabase)();
        console.log('Connected to MongoDB successfully');
        // Create test farm data
        const testFarm = {
            farmOwner: '0x1234567890abcdef1234567890abcdef12345678',
            farmAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
            poolAddress: '0x7890abcdef1234567890abcdef1234567890abcd',
            farmId: 'test-farm-id-123'
        };
        console.log('Creating test farm in MongoDB:', testFarm);
        // Save test farm to MongoDB
        const farm = new Farm_1.Farm(testFarm);
        const savedFarm = await farm.save();
        console.log('Test farm saved to MongoDB:', savedFarm);
        // Retrieve the farm by farmOwner
        console.log('Retrieving farms by owner...');
        const farmsByOwner = await Farm_1.Farm.find({ farmOwner: testFarm.farmOwner });
        console.log('Farms by owner:', farmsByOwner);
        // Retrieve the farm by farmAddress
        console.log('Retrieving farm by address...');
        const farmByAddress = await Farm_1.Farm.findOne({ farmAddress: testFarm.farmAddress });
        console.log('Farm by address:', farmByAddress);
        // Clean up - delete the test farm
        console.log('Cleaning up - deleting test farm...');
        await Farm_1.Farm.deleteOne({ farmId: testFarm.farmId });
        console.log('Test farm deleted');
        // Verify deletion
        const deletedFarm = await Farm_1.Farm.findOne({ farmId: testFarm.farmId });
        console.log('Verification - farm should be null:', deletedFarm);
        return 'Farm storage test completed successfully';
    }
    catch (error) {
        console.error('Error in farm storage test:', error);
        throw error;
    }
    finally {
        // Disconnect from MongoDB
        await (0, connection_1.disconnectFromDatabase)();
        console.log('Disconnected from MongoDB');
    }
}
// Run the test
testFarmStorage()
    .then(console.log)
    .catch(console.error);
