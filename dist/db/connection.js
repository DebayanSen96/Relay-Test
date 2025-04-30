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
