import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { ContractDeployer } from '../contracts/deploy/ContractDeployer';

// Load environment variables
dotenv.config();

// ABI for Uniswap V3 Pool
const UniswapV3PoolABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function fee() external view returns (uint24)",
  "function liquidity() external view returns (uint128)",
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function tickSpacing() external view returns (int24)",
  "function maxLiquidityPerTick() external view returns (uint128)",
  "function factory() external view returns (address)"
];

// ABI for ERC20 Token
const ERC20ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address) external view returns (uint256)"
];

export interface PoolStats {
  poolAddress: string;
  token0: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    rawBalance?: string; 
    formattedBalance?: string; 
  };
  token1: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    rawBalance?: string; // Raw token1 balance in the pool (full units)
    formattedBalance?: string; // Formatted balance considering decimals
  };
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  tvlUSD?: string; // Total Value Locked in USD
  price?: string;  // Token0/Token1 price
  volume24h?: string; // 24-hour trading volume
  feesUSD24h?: string; // 24-hour fees generated
  utilization?: string; // Pool utilization rate
  createdAt?: number; // Timestamp when pool was created
}

export class PoolService {
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Wallet;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);
    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
  }

  /**
   * Get pool statistics for a Uniswap V3 pool
   * @param poolAddress The address of the Uniswap V3 pool
   * @returns Pool statistics including tokens, liquidity, and price data
   */
  async getPoolStats(poolAddress: string): Promise<PoolStats> {
    try {
      console.log(`Getting pool stats for pool address: ${poolAddress}`);
      
      // Validate pool address format
      if (!ethers.utils.isAddress(poolAddress)) {
        throw new Error(`Invalid pool address format: ${poolAddress}`);
      }
      
      // Create pool contract instance
      const poolContract = new ethers.Contract(poolAddress, UniswapV3PoolABI, this.provider);
      
      // Check if the contract exists at the provided address
      const code = await this.provider.getCode(poolAddress);
      if (code === '0x' || code === '') {
        throw new Error(`No contract found at address: ${poolAddress}`);
      }
      
      // Get basic pool data with error handling for each call
      let token0Address, token1Address, fee, liquidity, slot0;
      
      try {
        token0Address = await poolContract.token0();
        console.log(`Retrieved token0 address: ${token0Address}`);
      } catch (err) {
        console.error('Error getting token0:', err);
        throw new Error(`Failed to get token0: ${(err as Error).message}`);
      }
      
      try {
        token1Address = await poolContract.token1();
        console.log(`Retrieved token1 address: ${token1Address}`);
      } catch (err) {
        console.error('Error getting token1:', err);
        throw new Error(`Failed to get token1: ${(err as Error).message}`);
      }
      
      try {
        fee = await poolContract.fee();
        console.log(`Retrieved fee: ${fee} (type: ${typeof fee})`);
      } catch (err) {
        console.error('Error getting fee:', err);
        throw new Error(`Failed to get fee: ${(err as Error).message}`);
      }
      
      try {
        liquidity = await poolContract.liquidity();
        console.log(`Retrieved liquidity: ${liquidity}`);
      } catch (err) {
        console.error('Error getting liquidity:', err);
        throw new Error(`Failed to get liquidity: ${(err as Error).message}`);
      }
      
      try {
        slot0 = await poolContract.slot0();
        console.log(`Retrieved slot0: ${JSON.stringify(slot0)}`);
      } catch (err) {
        console.error('Error getting slot0:', err);
        throw new Error(`Failed to get slot0: ${(err as Error).message}`);
      }
      
      // Get token details with balances
      let token0, token1;
      try {
        token0 = await this.getTokenDetails(token0Address, poolAddress);
        token1 = await this.getTokenDetails(token1Address, poolAddress);
      } catch (err) {
        console.error('Error getting token details:', err);
        throw new Error(`Failed to get token details: ${(err as Error).message}`);
      }
      
      // Calculate price from sqrtPriceX96
      const sqrtPriceX96 = slot0.sqrtPriceX96.toString();
      let price;
      try {
        price = this.calculatePrice(sqrtPriceX96, token0.decimals, token1.decimals);
      } catch (err) {
        console.error('Error calculating price:', err);
        price = '0';
      }
      
      // Calculate estimated TVL
      let tvlEstimate;
      try {
        tvlEstimate = this.calculateEstimatedTVL(token0, token1, price);
      } catch (err) {
        console.error('Error calculating TVL:', err);
        tvlEstimate = '0';
      }
      
      // Get creation timestamp (placeholder)
      const createdAt = Math.floor(Date.now() / 1000) - 86400;
      
      // Safely convert fee to number
      let feeValue;
      try {
        if (typeof fee === 'number') {
          feeValue = fee;
        } else if (typeof fee === 'object' && fee._isBigNumber) {
          feeValue = Number(fee.toString());
        } else {
          feeValue = Number(fee);
        }
        console.log(`Converted fee to: ${feeValue}`);
      } catch (err) {
        console.error('Error converting fee:', err);
        feeValue = 0;
      }
      
      // Safely convert tick to number
      let tickValue;
      try {
        if (typeof slot0.tick === 'number') {
          tickValue = slot0.tick;
        } else if (typeof slot0.tick === 'object' && slot0.tick._isBigNumber) {
          tickValue = Number(slot0.tick.toString());
        } else {
          tickValue = Number(slot0.tick);
        }
        console.log(`Converted tick to: ${tickValue}`);
      } catch (err) {
        console.error('Error converting tick:', err);
        tickValue = 0;
      }
      
      // Construct response
      const poolStats: PoolStats = {
        poolAddress,
        token0,
        token1,
        fee: feeValue,
        liquidity: liquidity.toString(),
        sqrtPriceX96,
        tick: tickValue,
        price,
        tvlUSD: tvlEstimate,
        createdAt,
        // The following fields would require additional data sources like subgraphs
        volume24h: '0', // Placeholder
        feesUSD24h: '0', // Placeholder
        utilization: '0%' // Placeholder
      };
      
      console.log('Successfully constructed pool stats');
      return poolStats;
    } catch (error) {
      console.error('Error getting pool stats:', error);
      throw new Error(`Failed to get pool stats: ${(error as Error).message}`);
    }
  }

  /**
   * Get token details from a token address
   * @param tokenAddress The address of the ERC20 token
   * @param poolAddress The address of the pool to check token balance
   * @returns Token details including name, symbol, decimals, and balance
   */
  private async getTokenDetails(tokenAddress: string, poolAddress: string): Promise<{
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    rawBalance?: string;
    formattedBalance?: string;
  }> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, this.provider);
      
      // Get token name with fallback
      let name = 'Unknown';
      try {
        name = await tokenContract.name();
      } catch (err) {
        console.warn(`Could not get name for token ${tokenAddress}:`, err);
      }
      
      // Get token symbol with fallback
      let symbol = 'UNKNOWN';
      try {
        symbol = await tokenContract.symbol();
      } catch (err) {
        console.warn(`Could not get symbol for token ${tokenAddress}:`, err);
      }
      
      // Get token decimals with fallback
      let decimals = 18;
      try {
        const decimalsResult = await tokenContract.decimals();
        // Convert to number if it's a BigNumber
        if (typeof decimalsResult === 'object' && decimalsResult._isBigNumber) {
          decimals = Number(decimalsResult.toString());
        } else if (typeof decimalsResult === 'number') {
          decimals = decimalsResult;
        } else {
          decimals = Number(String(decimalsResult));
        }
      } catch (err) {
        console.warn(`Could not get decimals for token ${tokenAddress}, using default (18):`, err);
      }
      
      // Get token balance with fallback
      let rawBalance = '0';
      let formattedBalance = '0';
      try {
        const balanceResult = await tokenContract.balanceOf(poolAddress);
        if (balanceResult) {
          // Store the raw balance (full units)
          rawBalance = balanceResult.toString();
          
          // Format the balance considering decimals
          formattedBalance = ethers.utils.formatUnits(balanceResult, decimals);
        }
      } catch (err) {
        console.warn(`Could not get balance for token ${tokenAddress}:`, err);
      }
      
      return {
        address: tokenAddress,
        name,
        symbol,
        decimals,
        rawBalance,
        formattedBalance
      };
    } catch (error) {
      console.error(`Error getting token details for ${tokenAddress}:`, error);
      return {
        address: tokenAddress,
        name: 'Unknown',
        symbol: 'UNKNOWN',
        decimals: 18,
        rawBalance: '0',
        formattedBalance: '0'
      };
    }
  }
  
  /**
   * Calculate estimated TVL based on token balances and price
   * @param token0 Token0 details including balance
   * @param token1 Token1 details including balance
   * @param price Price of token1 in terms of token0
   * @returns Estimated TVL as a string
   */
  private calculateEstimatedTVL(
    token0: { decimals: number; rawBalance?: string; formattedBalance?: string },
    token1: { decimals: number; rawBalance?: string; formattedBalance?: string },
    price: string
  ): string {
    try {
      // Use formatted balances directly if available
      if (!token0.formattedBalance || !token1.formattedBalance) {
        return '0';
      }
      
      // Parse formatted balances to numbers
      const balance0 = parseFloat(token0.formattedBalance);
      const balance1 = parseFloat(token1.formattedBalance);
      
      // Parse price to number
      const priceValue = parseFloat(price) || 0;
      
      // Calculate token1 value in terms of token0
      const token1ValueInToken0 = balance1 * priceValue;
      
      // Total value in terms of token0
      const totalValue = balance0 + token1ValueInToken0;
      
      // Return the total value with 2 decimal places
      return totalValue.toFixed(2);
    } catch (error) {
      console.error('Error calculating estimated TVL:', error);
      return '0';
    }
  }

  /**
   * Calculate price from sqrtPriceX96
   * @param sqrtPriceX96 The sqrt price from slot0
   * @param decimals0 Decimals of token0
   * @param decimals1 Decimals of token1
   * @returns Price of token1 in terms of token0
   */
  private calculatePrice(sqrtPriceX96: string, decimals0: number, decimals1: number): string {
    try {
      // Convert sqrtPriceX96 to price
      // price = (sqrtPriceX96 / 2^96) ^ 2
      const Q96 = ethers.BigNumber.from(2).pow(96);
      const sqrtPrice = ethers.BigNumber.from(sqrtPriceX96);
      
      // Calculate price with proper decimal adjustment
      const price = sqrtPrice.mul(sqrtPrice).div(Q96).div(Q96);
      
      // Adjust for decimals
      const decimalAdjustment = ethers.BigNumber.from(10).pow(decimals0 - decimals1);
      const adjustedPrice = price.mul(decimalAdjustment);
      
      // Format to a reasonable number of decimal places
      return ethers.utils.formatUnits(adjustedPrice, 18);
    } catch (error) {
      console.error('Error calculating price:', error);
      return '0';
    }
  }
}
