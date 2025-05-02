"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectFromDatabase = exports.connectToDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
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
const connectToDatabase = async () => {
    try {
        await mongoose_1.default.connect(uri);
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};
exports.connectToDatabase = connectToDatabase;
/**
 * Disconnect from MongoDB
 */
const disconnectFromDatabase = async () => {
    try {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
    catch (error) {
        console.error('MongoDB disconnection error:', error);
        throw error;
    }
};
exports.disconnectFromDatabase = disconnectFromDatabase;
// Export the mongoose instance
exports.default = mongoose_1.default;
