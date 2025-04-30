"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("./connection");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Script to reset the farms collection and its indexes
 */
async function resetCollection() {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await (0, connection_1.connectToDatabase)();
        console.log('Connected to MongoDB successfully');
        // Drop the farms collection
        console.log('Dropping farms collection...');
        if (mongoose_1.default.connection.db) {
            await mongoose_1.default.connection.db.dropCollection('farms').catch(err => {
                // Ignore error if collection doesn't exist
                if (err.code !== 26) { // 26 is the error code for 'ns not found'
                    throw err;
                }
                console.log('Collection does not exist yet, skipping drop');
            });
        }
        else {
            console.log('Database connection not fully established, skipping drop');
        }
        console.log('Collection dropped successfully');
        return 'Collection reset completed successfully';
    }
    catch (error) {
        console.error('Error in collection reset:', error);
        throw error;
    }
    finally {
        // Disconnect from MongoDB
        await (0, connection_1.disconnectFromDatabase)();
        console.log('Disconnected from MongoDB');
    }
}
// Run the reset
resetCollection()
    .then(console.log)
    .catch(console.error);
