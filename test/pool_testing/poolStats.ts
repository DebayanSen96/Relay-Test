import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const POOL_ADDRESS = '0xD9df9b30195944Dd000641d14356A0C840a794F8';
const TOKEN0_ADDRESS = '0x25feE6226e6426b811c5dF024Ba12Bb38EF50a28';
const TOKEN1_ADDRESS = '0xC12a743f7A99Ff312263003C8d13810b732db9A7';

// ABIs
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)'
];

const UNISWAP_V3_POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function tickSpacing() external view returns (int24)',
  'function liquidity() external view returns (uint128)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function ticks(int24 tick) external view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, int56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128, uint32 secondsOutside, bool initialized)',
  'function positions(bytes32 key) external view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)'
];

const NONFUNGIBLE_POSITION_MANAGER_ABI = [
  'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)'
];

// Helper function to format price
function formatPrice(sqrtPriceX96: ethers.BigNumber, token0Decimals: number, token1Decimals: number): string {
  try {
    // Price = (sqrtPriceX96 / 2^96) ^ 2
    const Q96 = ethers.BigNumber.from(2).pow(96);
    const price = sqrtPriceX96.mul(sqrtPriceX96).div(Q96).div(Q96);
    
    // Adjust for token decimals
    const decimalAdjustment = ethers.BigNumber.from(10).pow(Math.abs(token0Decimals - token1Decimals));
    let adjustedPrice;
    
    if (token0Decimals >= token1Decimals) {
      adjustedPrice = price.mul(decimalAdjustment);
    } else {
      adjustedPrice = price.div(decimalAdjustment);
    }
    
    return ethers.utils.formatUnits(adjustedPrice, Math.max(token0Decimals, token1Decimals));
  } catch (error) {
    console.error('Error calculating price from sqrtPriceX96:', error);
    return 'Error calculating price';
  }
}

// Helper function to calculate price from tick
function tickToPrice(tick: number, token0Decimals: number, token1Decimals: number): string {
  try {
    // Price = 1.0001 ^ tick
    const price = Math.pow(1.0001, tick);
    
    // Adjust for token decimals
    const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);
    const adjustedPrice = price * decimalAdjustment;
    
    return adjustedPrice.toFixed(Math.max(token0Decimals, token1Decimals));
  } catch (error) {
    console.error('Error calculating price from tick:', error);
    return 'Error calculating price';
  }
}

// Helper function to find the nearest usable tick for a given tick and tick spacing
function nearestUsableTick(tick: number, tickSpacing: number): number {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  return rounded;
}

async function main() {
  // Check if environment variables exist
  if (!process.env.RPC_URL && !process.env.RPC_ENDPOINT) {
    throw new Error('RPC_URL or RPC_ENDPOINT not found in .env file');
  }

  // Connect to provider
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || process.env.RPC_ENDPOINT);
  
  console.log(`Connected to network: ${(await provider.getNetwork()).name} (${(await provider.getNetwork()).chainId})`);

  try {
    // Get token contracts
    const token0Contract = new ethers.Contract(TOKEN0_ADDRESS, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(TOKEN1_ADDRESS, ERC20_ABI, provider);

    // Get token details
    const [token0Decimals, token0Symbol, token1Decimals, token1Symbol] = await Promise.all([
      token0Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.decimals(),
      token1Contract.symbol()
    ]);

    console.log('=== Token Information ===');
    console.log(`Token0: ${token0Symbol} (${TOKEN0_ADDRESS})`);
    console.log(`Token0 Decimals: ${token0Decimals}`);
    console.log(`Token1: ${token1Symbol} (${TOKEN1_ADDRESS})`);
    console.log(`Token1 Decimals: ${token1Decimals}`);

    // Get pool contract
    const poolContract = new ethers.Contract(POOL_ADDRESS, UNISWAP_V3_POOL_ABI, provider);
    
    // Get pool data
    console.log('\n=== Pool Information ===');
    console.log(`Pool Address: ${POOL_ADDRESS}`);
    
    const [token0, token1, fee, tickSpacing, liquidity, slot0] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.liquidity(),
      poolContract.slot0()
    ]);

    console.log(`Token Order: ${token0} / ${token1}`);
    console.log(`Fee Tier: ${fee / 10000}% (${fee} in basis points)`);
    console.log(`Tick Spacing: ${tickSpacing}`);
    console.log(`Current Liquidity: ${liquidity.toString()}`);
    
    // Price information
    console.log('\n=== Price Information ===');
    console.log(`Current Tick: ${slot0.tick}`);
    console.log(`Current SqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
    
    const formattedPrice = formatPrice(slot0.sqrtPriceX96, token0Decimals, token1Decimals);
    console.log(`Current Price: 1 ${token0Symbol} = ${formattedPrice} ${token1Symbol}`);
    
    const priceFromTick = tickToPrice(slot0.tick, token0Decimals, token1Decimals);
    console.log(`Price from Tick: 1 ${token0Symbol} = ${priceFromTick} ${token1Symbol}`);
    
    // Check if a position ID was provided
    const positionId = process.argv[2];
    if (positionId) {
      const positionManagerContract = new ethers.Contract(
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // NonfungiblePositionManager address
        NONFUNGIBLE_POSITION_MANAGER_ABI,
        provider
      );
      
      console.log(`\n=== Position Information (ID: ${positionId}) ===`);
      
      try {
        const position = await positionManagerContract.positions(positionId);
        
        console.log(`Token0: ${position.token0}`);
        console.log(`Token1: ${position.token1}`);
        console.log(`Fee: ${position.fee}`);
        console.log(`Tick Range: ${position.tickLower} to ${position.tickUpper}`);
        console.log(`Liquidity: ${position.liquidity.toString()}`);
        
        // Calculate price range
        const lowerPrice = tickToPrice(position.tickLower, token0Decimals, token1Decimals);
        const upperPrice = tickToPrice(position.tickUpper, token0Decimals, token1Decimals);
        
        console.log(`Price Range: ${lowerPrice} ${token1Symbol} to ${upperPrice} ${token1Symbol} per ${token0Symbol}`);
        
        // Check if position is in range
        const inRange = slot0.tick >= position.tickLower && slot0.tick < position.tickUpper;
        console.log(`Position is ${inRange ? 'in' : 'out of'} range`);
        
        // Calculate fees owed
        if (position.tokensOwed0.gt(0) || position.tokensOwed1.gt(0)) {
          console.log(`Uncollected Fees:`);
          console.log(`  ${ethers.utils.formatUnits(position.tokensOwed0, token0Decimals)} ${token0Symbol}`);
          console.log(`  ${ethers.utils.formatUnits(position.tokensOwed1, token1Decimals)} ${token1Symbol}`);
        } else {
          console.log('No uncollected fees');
        }
      } catch (error) {
        console.error(`Error fetching position ${positionId}:`, error);
      }
    }
    
    // Pool reserves (token balances)
    const [pool0Balance, pool1Balance] = await Promise.all([
      token0Contract.balanceOf(POOL_ADDRESS),
      token1Contract.balanceOf(POOL_ADDRESS)
    ]);
    
    console.log('\n=== Pool Reserves ===');
    console.log(`${token0Symbol}: ${ethers.utils.formatUnits(pool0Balance, token0Decimals)}`);
    console.log(`${token1Symbol}: ${ethers.utils.formatUnits(pool1Balance, token1Decimals)}`);
    
    // Check if the pool has any liquidity positions
    console.log('\n=== Checking for Liquidity Positions ===');
    
    // If the pool has liquidity but it's not showing in the reserves, it might be in the positions
    if (liquidity.eq(0) && (pool0Balance.gt(0) || pool1Balance.gt(0))) {
      console.log('WARNING: Pool has reserves but no active liquidity. This suggests liquidity might be concentrated outside the current price range.');
    }
    
    // Check the tick range around the current price to see if there's any liquidity
    console.log('\nChecking ticks around current price...');
    
    // Check a few ticks around the current price
    const ticksToCheck = [
      nearestUsableTick(slot0.tick, tickSpacing),
      nearestUsableTick(slot0.tick, tickSpacing) - tickSpacing,
      nearestUsableTick(slot0.tick, tickSpacing) + tickSpacing,
      nearestUsableTick(slot0.tick, tickSpacing) - tickSpacing * 2,
      nearestUsableTick(slot0.tick, tickSpacing) + tickSpacing * 2
    ];
    
    for (const tick of ticksToCheck) {
      try {
        const tickData = await poolContract.ticks(tick);
        if (tickData.liquidityGross.gt(0)) {
          console.log(`Tick ${tick} has liquidity: ${tickData.liquidityGross.toString()}`);
        }
      } catch (error) {
        console.log(`Could not fetch data for tick ${tick}`);
      }
    }
    
    // Check the NonfungiblePositionManager for any positions for this pool
    const positionManagerContract = new ethers.Contract(
      '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // NonfungiblePositionManager address
      NONFUNGIBLE_POSITION_MANAGER_ABI,
      provider
    );
    
    // We can't easily query all positions, but we can check recent transaction logs
    console.log('\nChecking recent transactions for position minting events...');
    
    // Get recent blocks
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 1000); // Look back 1000 blocks
    
    // Filter for Transfer events from the NonfungiblePositionManager
    const filter = {
      address: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      topics: [ethers.utils.id('Transfer(address,address,uint256)')],
      fromBlock,
      toBlock: latestBlock
    };
    
    try {
      const logs = await provider.getLogs(filter);
      console.log(`Found ${logs.length} transfer events from the NonfungiblePositionManager`);
      
      // Check each transfer event to see if it's for our pool
      for (const log of logs) {
        try {
          // The tokenId is in the third topic
          const tokenId = ethers.BigNumber.from(log.topics[3]).toString();
          
          // Get the position details
          const position = await positionManagerContract.positions(tokenId);
          
          // Check if this position is for our pool
          if (position.token0.toLowerCase() === TOKEN0_ADDRESS.toLowerCase() && 
              position.token1.toLowerCase() === TOKEN1_ADDRESS.toLowerCase() && 
              position.fee.toString() === fee.toString()) {
            
            console.log(`\nFound position ID ${tokenId} for our pool:`);
            console.log(`Liquidity: ${position.liquidity.toString()}`);
            console.log(`Tick Range: ${position.tickLower} to ${position.tickUpper}`);
            
            // Calculate price range
            const lowerPrice = tickToPrice(position.tickLower, token0Decimals, token1Decimals);
            const upperPrice = tickToPrice(position.tickUpper, token0Decimals, token1Decimals);
            
            console.log(`Price Range: ${lowerPrice} ${token1Symbol} to ${upperPrice} ${token1Symbol} per ${token0Symbol}`);
            
            // Check if position is in range
            const inRange = slot0.tick >= position.tickLower && slot0.tick < position.tickUpper;
            console.log(`Position is ${inRange ? 'in' : 'out of'} range`);
          }
        } catch (error) {
          // Skip errors for individual positions
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
    
    // Direct approach: Try to get the wallet's positions
    console.log('\nChecking wallet positions directly...');
    
    // Get a signer to check the wallet's positions
    let signer;
    try {
      if (!process.env.PRIVATE_KEY) {
        throw new Error('PRIVATE_KEY is not defined in the environment variables');
      }
      
      signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      console.log(`Checking positions for wallet: ${signer.address}`);
      
      // We need to use a different approach since there's no direct way to query positions by owner
      // Let's check the ERC721 balance of the wallet
      const balanceOf = new ethers.utils.Interface(['function balanceOf(address owner) view returns (uint256)']);
      const positionManagerERC721 = new ethers.Contract(
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        balanceOf,
        provider
      );
      
      const balance = await positionManagerERC721.balanceOf(signer.address);
      console.log(`Wallet has ${balance.toString()} positions`);
      
      // If the wallet has positions, we need to check each one
      if (balance.gt(0)) {
        // We need the tokenOfOwnerByIndex function to get the token IDs
        const tokenOfOwnerByIndex = new ethers.utils.Interface(['function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)']);
        const positionManagerEnumerable = new ethers.Contract(
          '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
          tokenOfOwnerByIndex,
          provider
        );
        
        // Check each position
        for (let i = 0; i < balance.toNumber(); i++) {
          try {
            const tokenId = await positionManagerEnumerable.tokenOfOwnerByIndex(signer.address, i);
            console.log(`Position ${i+1}: Token ID ${tokenId.toString()}`);
            
            // Get the position details
            const position = await positionManagerContract.positions(tokenId);
            
            // Check if this position is for our pool
            if (position.token0.toLowerCase() === TOKEN0_ADDRESS.toLowerCase() && 
                position.token1.toLowerCase() === TOKEN1_ADDRESS.toLowerCase() && 
                position.fee.toString() === fee.toString()) {
              
              console.log(`Position ID ${tokenId} details:`);
              console.log(`Liquidity: ${position.liquidity.toString()}`);
              console.log(`Tick Range: ${position.tickLower} to ${position.tickUpper}`);
              
              // Calculate price range
              const lowerPrice = tickToPrice(position.tickLower, token0Decimals, token1Decimals);
              const upperPrice = tickToPrice(position.tickUpper, token0Decimals, token1Decimals);
              
              console.log(`Price Range: ${lowerPrice} ${token1Symbol} to ${upperPrice} ${token1Symbol} per ${token0Symbol}`);
              
              // Check if position is in range
              const inRange = slot0.tick >= position.tickLower && slot0.tick < position.tickUpper;
              console.log(`Position is ${inRange ? 'in' : 'out of'} range`);
            } else {
              console.log('This position is for a different pool');
            }
          } catch (error) {
            console.error(`Error checking position ${i}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error checking wallet positions:', error);
    }

  } catch (error) {
    console.error('Error fetching pool stats:');
    if (typeof error === 'object' && error !== null) {
      console.error(error);
    }
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
