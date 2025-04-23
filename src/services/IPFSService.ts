import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class IPFSService {
  private apiUrl: string;
  private gatewayUrl: string;

  constructor() {
    this.apiUrl = process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001/api/v0';
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/';
  }

  async uploadJSON(data: any): Promise<string> {
    try {
      // For testing purposes, we'll just return a mock IPFS hash
      // In a real implementation, this would upload to IPFS and return the hash
      console.log('Mocking IPFS upload with data:', JSON.stringify(data).substring(0, 100) + '...');
      
      // Generate a mock IPFS hash (Qm + 44 characters)
      const mockHash = 'Qm' + Array(44).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)).join('');
      
      console.log('Generated mock IPFS hash:', mockHash);
      return mockHash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  getIPFSUrl(hash: string): string {
    if (hash.startsWith('ipfs://')) {
      hash = hash.replace('ipfs://', '');
    }
    return `${this.gatewayUrl}${hash}`;
  }

  async uploadMetadata(metadata: {
    farmName: string;
    farmDescription: string;
    farmLogoUrl?: string;
    creatorMetadata?: Record<string, any>;
  }): Promise<string> {
    // Create a clean metadata object without undefined values
    const cleanMetadata = {
      farmName: metadata.farmName,
      farmDescription: metadata.farmDescription,
      ...(metadata.farmLogoUrl ? { farmLogoUrl: metadata.farmLogoUrl } : {}),
      ...(metadata.creatorMetadata ? { creatorMetadata: metadata.creatorMetadata } : {})
    };
    return await this.uploadJSON(cleanMetadata);
  }
}
