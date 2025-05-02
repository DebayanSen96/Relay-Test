import { connectToDatabase, disconnectFromDatabase } from './connection';
import { Farm } from './models/Farm';
import { FarmService, ICreateFarmData } from './services/farmService';

/**
 * Test script to verify expanded MongoDB farm storage and duplicate checking
 */
async function testExpandedFarmStorage() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectToDatabase();
    console.log('Connected to MongoDB successfully');

    // Create test farm data with the expanded schema
    const testFarm: ICreateFarmData = {
      farmName: "USDC Yield Optimizer",
      farmDescription: "Custom yield strategy for USDC with flexible parameters",
      farmOwner: "0x578636C1CDfd5BCA3F1e787Fa49c2ea664c7bd8C",
      farmAddress: "0x1e98f027cdd5C88701290EF08abE410B8DD1440d",
      poolAddress: "0x3e98f027cdd5C88701290EF08abE410B8DD1440e",
      farmId: "test-expanded-farm-id-123",
      principalAssetAddress: "0x25feE6226e6426b811c5dF024Ba12Bb38EF50a28",
      strategyType: "CUSTOM",
      strategyContractAddress: "0x1e98f027cdd5C88701290EF08abE410B8DD1440d",
      parameters: {
        targetAPY: "12",
        lockupPeriodDays: 30
      },
      incentiveSplits: {
        lp: 60,
        verifier: 25,
        yieldYoda: 15
      },
      maturityPeriodDays: 60,
      claimToken: {
        name: "USDC Farm LP Token",
        symbol: "USDC-FARM"
      },
      creatorAddress: "0x578636C1CDfd5BCA3F1e787Fa49c2ea664c7bd8C"
    };

    console.log('Creating test farm in MongoDB with expanded schema:', testFarm.farmName);

    // Save test farm to MongoDB
    const savedFarm = await FarmService.createFarm(testFarm);
    console.log('Test farm saved to MongoDB:', savedFarm ? 'Success' : 'Failed (duplicate)');

    // Try to save the same farm again (should be skipped due to duplicate check)
    console.log('\nAttempting to save the same farm again (should be skipped)...');
    const duplicateFarm = await FarmService.createFarm(testFarm);
    console.log('Result of duplicate farm save:', duplicateFarm ? 'Saved (unexpected)' : 'Skipped (expected)');

    // Create a farm with the same name but different ID and address (should be allowed)
    console.log('\nCreating farm with same name but different ID and address...');
    const sameName = { 
      ...testFarm, 
      farmId: 'different-id-456',
      farmAddress: '0x2e98f027cdd5C88701290EF08abE410B8DD1440f',
      poolAddress: '0x4e98f027cdd5C88701290EF08abE410B8DD1440g'
    };
    const sameNameFarm = await FarmService.createFarm(sameName);
    console.log('Result of same name farm save:', sameNameFarm ? 'Success (expected)' : 'Failed (unexpected)');

    // Create a farm with the same ID but different name and address (should be allowed)
    console.log('\nCreating farm with same ID but different name and address...');
    const sameId = { 
      ...testFarm, 
      farmName: 'Different Farm Name',
      farmAddress: '0x5e98f027cdd5C88701290EF08abE410B8DD1440h',
      poolAddress: '0x6e98f027cdd5C88701290EF08abE410B8DD1440i'
    };
    const sameIdFarm = await FarmService.createFarm(sameId);
    console.log('Result of same ID farm save:', sameIdFarm ? 'Success (expected)' : 'Failed (unexpected)');

    // Retrieve the farms by name and ID
    console.log('\nRetrieving farm by name and ID...');
    const farmByNameAndId = await FarmService.getFarmByNameAndId(testFarm.farmName, testFarm.farmId);
    console.log('Farm by name and ID:', farmByNameAndId ? 'Found' : 'Not found');

    // Clean up - delete all test farms
    console.log('\nCleaning up - deleting test farms...');
    await Farm.deleteMany({
      $or: [
        { farmId: testFarm.farmId },
        { farmId: sameName.farmId },
        { farmName: sameId.farmName }
      ]
    });
    console.log('Test farms deleted');

    return 'Expanded farm storage test completed successfully';
  } catch (error) {
    console.error('Error in expanded farm storage test:', error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    await disconnectFromDatabase();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testExpandedFarmStorage()
  .then(console.log)
  .catch(console.error);
