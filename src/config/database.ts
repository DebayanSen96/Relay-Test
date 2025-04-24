import { DataSource } from 'typeorm';
import { FarmRequest } from '../models/FarmRequest';
import dotenv from 'dotenv';

dotenv.config();

// Check if we're in test mode (no database required)
const isTestMode = process.env.NODE_ENV === 'test';
const memoryStore = new Map<string, any>();

export const connectDatabase = async (): Promise<DataSource> => {
  try {
    if (isTestMode) {
      console.log('Running in test mode - using in-memory repository');
      return {
        getRepository: () => ({
          async findOneBy(criteria: { id: string }) {
            return memoryStore.get(criteria.id) || null;
          },
          async save(entity: any) {
            memoryStore.set(entity.id, entity);
            return entity;
          }
        })
      } as any as DataSource;
    }

    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'farm_deployment',
      entities: [FarmRequest],
      synchronize: process.env.NODE_ENV === 'development', // Only use in development
      logging: process.env.NODE_ENV === 'development'
    });

    await dataSource.initialize();
    console.log('Database connection established');
    return dataSource;
  } catch (error) {
    console.error('Database connection failed:', error);
    if (isTestMode) {
      console.log('Continuing in test mode - using in-memory repository');
      return {
        getRepository: () => ({
          async findOneBy(criteria: { id: string }) {
            return memoryStore.get(criteria.id) || null;
          },
          async save(entity: any) {
            memoryStore.set(entity.id, entity);
            return entity;
          }
        })
      } as any as DataSource;
    }
    throw error;
  }
};
