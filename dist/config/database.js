"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
const typeorm_1 = require("typeorm");
const FarmRequest_1 = require("../models/FarmRequest");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Check if we're in test mode (no database required)
const isTestMode = process.env.NODE_ENV === 'test';
const memoryStore = new Map();
const connectDatabase = async () => {
    try {
        if (isTestMode) {
            console.log('Running in test mode - using in-memory repository');
            return {
                getRepository: () => ({
                    async findOneBy(criteria) {
                        return memoryStore.get(criteria.id) || null;
                    },
                    async save(entity) {
                        memoryStore.set(entity.id, entity);
                        return entity;
                    }
                })
            };
        }
        const dataSource = new typeorm_1.DataSource({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_DATABASE || 'farm_deployment',
            entities: [FarmRequest_1.FarmRequest],
            synchronize: process.env.NODE_ENV === 'development', // Only use in development
            logging: process.env.NODE_ENV === 'development'
        });
        await dataSource.initialize();
        console.log('Database connection established');
        return dataSource;
    }
    catch (error) {
        console.error('Database connection failed:', error);
        if (isTestMode) {
            console.log('Continuing in test mode - using in-memory repository');
            return {
                getRepository: () => ({
                    async findOneBy(criteria) {
                        return memoryStore.get(criteria.id) || null;
                    },
                    async save(entity) {
                        memoryStore.set(entity.id, entity);
                        return entity;
                    }
                })
            };
        }
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
