import { DataSource } from 'typeorm';
import { FarmRequest } from '../models/FarmRequest';
import dotenv from 'dotenv';

dotenv.config();

// For development and testing, we use an in-memory repository
// This avoids the need for a PostgreSQL database during development
const useInMemoryRepository = true; // Set to false if you want to use a real PostgreSQL database
const memoryStore = new Map<string, any>();

export const connectDatabase = async (): Promise<DataSource> => {
  try {
    if (useInMemoryRepository) {
      console.log('Using in-memory repository - no PostgreSQL required');
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
    if (useInMemoryRepository) {
      console.log('Continuing with in-memory repository - no PostgreSQL required');
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
