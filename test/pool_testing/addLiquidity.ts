import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const POOL_ADDRESS = '0xD9df9b30195944Dd000641d14356A0C840a794F8';
const TOKEN0_ADDRESS = '0x25feE6226e6426b811c5dF024Ba12Bb38EF50a28';
const TOKEN1_ADDRESS = '0xC12a743f7A99Ff312263003C8d13810b732db9A7';
const AMOUNT_TOKEN0 = '1000'; // Amount of token0 to add - reduced to ensure success
const AMOUNT_TOKEN1 = '3000'; // Amount of token1 to add - reduced to ensure success

// Uniswap V3 contract addresses
const NONFUNGIBLE_POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';

// ABIs
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)'
];

const UNISWAP_V3_POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function tickSpacing() external view returns (int24)',
  'function liquidity() external view returns (uint128)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
];

const POSITION_MANAGER_ABI = [
  'function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  'function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)'
];

// Helper function to approve token transfers
async function approveToken(
  tokenContract: ethers.Contract,
  spender: string,
  amount: ethers.BigNumber,
  signer: ethers.Wallet
): Promise<void> {
  const tokenSymbol = await tokenContract.symbol();
  const tokenDecimals = await tokenContract.decimals();
  
  console.log(`Approving ${ethers.utils.formatUnits(amount, tokenDecimals)} ${tokenSymbol}...`);
  
  // Check current allowance
  const currentAllowance = await tokenContract.allowance(signer.address, spender);
  
  if (currentAllowance.lt(amount)) {
    console.log(`Current allowance (${ethers.utils.formatUnits(currentAllowance, tokenDecimals)}) is less than required (${ethers.utils.formatUnits(amount, tokenDecimals)}). Approving...`);
    const tx = await tokenContract.approve(spender, amount);
    console.log(`Approval transaction hash: ${tx.hash}`);
    await tx.wait();
    console.log('Approval confirmed!');
  } else {
    console.log(`Current allowance (${ethers.utils.formatUnits(currentAllowance, tokenDecimals)}) is sufficient.`);
  }
}

// Helper function to get the nearest tick that is divisible by the tickSpacing
function nearestUsableTick(tick: number, tickSpacing: number): number {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  return rounded;
}

async function main() {
  // Check if environment variables exist
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in .env file');
  }

  if (!process.env.RPC_URL && !process.env.RPC_ENDPOINT) {
    throw new Error('RPC_URL or RPC_ENDPOINT not found in .env file');
  }

  // Connect to provider
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || process.env.RPC_ENDPOINT);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const address = await wallet.getAddress();
  
  console.log(`Connected to wallet: ${address}`);
  console.log(`Connected to network: ${(await provider.getNetwork()).name} (${(await provider.getNetwork()).chainId})`);

  try {
    // Get token contracts
    const token0Contract = new ethers.Contract(TOKEN0_ADDRESS, ERC20_ABI, wallet);
    const token1Contract = new ethers.Contract(TOKEN1_ADDRESS, ERC20_ABI, wallet);

    // Get token details
    const [token0Decimals, token0Symbol, token1Decimals, token1Symbol] = await Promise.all([
      token0Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.decimals(),
      token1Contract.symbol()
    ]);

    console.log(`Token0 (${token0Symbol}): ${TOKEN0_ADDRESS}, Decimals: ${token0Decimals}`);
    console.log(`Token1 (${token1Symbol}): ${TOKEN1_ADDRESS}, Decimals: ${token1Decimals}`);

    // Get pool contract
    const poolContract = new ethers.Contract(POOL_ADDRESS, UNISWAP_V3_POOL_ABI, provider);
    
    // Get pool data
    console.log('Fetching pool data...');
    const [token0, token1, fee, tickSpacing, liquidity] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.liquidity()
    ]);
    let slot0 = await poolContract.slot0();

    console.log(`Pool tokens: ${token0} / ${token1}`);
    console.log(`Pool fee: ${fee}`);
    console.log(`Tick spacing: ${tickSpacing}`);
    console.log(`Pool liquidity: ${liquidity.toString()}`);
    console.log(`Current tick: ${slot0.tick}`);
    console.log(`Current sqrt price: ${slot0.sqrtPriceX96.toString()}`);

    // Check if pool is initialized
    if (slot0.sqrtPriceX96.eq(0)) {
      console.log('Pool is not initialized. Initializing with price 1:1 (sqrtPriceX96 = 2^96)...');
      const sqrtPriceX96 = ethers.BigNumber.from(2).pow(96); // 1:1 price
      const poolContract = new ethers.Contract(POOL_ADDRESS, [
        'function initialize(uint160 sqrtPriceX96) external'
      ], wallet);
      const txInit = await poolContract.initialize(sqrtPriceX96, { gasLimit: 500000 });
      await txInit.wait();
      console.log('Pool initialized successfully!');
      // Re-fetch slot0 after initialization
      slot0 = await poolContract.slot0();
    }

    // Define position parameters - use a narrow range so the position is guaranteed to be active at the current price
    const currentTick = slot0.tick;
    console.log(`Current tick: ${currentTick}`);

    // Use the nearest usable ticks just below and above the current tick
    const tickLower = nearestUsableTick(currentTick - tickSpacing, tickSpacing);
    const tickUpper = nearestUsableTick(currentTick + tickSpacing, tickSpacing);
    // This ensures the current tick is always within [tickLower, tickUpper)
    
    console.log(`Position tick range: ${tickLower} to ${tickUpper}`);

    // Convert amounts to the right format with proper decimals
    const amount0Desired = ethers.utils.parseUnits(AMOUNT_TOKEN0, token0Decimals);
    const amount1Desired = ethers.utils.parseUnits(AMOUNT_TOKEN1, token1Decimals);

    console.log(`Amount0 desired: ${ethers.utils.formatUnits(amount0Desired, token0Decimals)} ${token0Symbol}`);
    console.log(`Amount1 desired: ${ethers.utils.formatUnits(amount1Desired, token1Decimals)} ${token1Symbol}`);

    // Check token balances
    const [balance0, balance1] = await Promise.all([
      token0Contract.balanceOf(address),
      token1Contract.balanceOf(address)
    ]);

    console.log(`Token0 balance: ${ethers.utils.formatUnits(balance0, token0Decimals)} ${token0Symbol}`);
    console.log(`Token1 balance: ${ethers.utils.formatUnits(balance1, token1Decimals)} ${token1Symbol}`);

    if (balance0.lt(amount0Desired)) {
      throw new Error(`Insufficient ${token0Symbol} balance. Required: ${ethers.utils.formatUnits(amount0Desired, token0Decimals)}, Available: ${ethers.utils.formatUnits(balance0, token0Decimals)}`);
    }

    if (balance1.lt(amount1Desired)) {
      throw new Error(`Insufficient ${token1Symbol} balance. Required: ${ethers.utils.formatUnits(amount1Desired, token1Decimals)}, Available: ${ethers.utils.formatUnits(balance1, token1Decimals)}`);
    }

    // Approve tokens
    await approveToken(
      token0Contract,
      NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      amount0Desired,
      wallet
    );

    await approveToken(
      token1Contract,
      NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      amount1Desired,
      wallet
    );

    // Get position manager contract
    const positionManagerContract = new ethers.Contract(
      NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      POSITION_MANAGER_ABI,
      wallet
    );

    // Calculate minimum amounts with 1% slippage tolerance
    const slippageTolerance = 0.01; // 1%
    const amount0Min = amount0Desired.mul(ethers.BigNumber.from(100 - Math.floor(slippageTolerance * 100))).div(100);
    const amount1Min = amount1Desired.mul(ethers.BigNumber.from(100 - Math.floor(slippageTolerance * 100))).div(100);
    
    console.log(`Amount0 minimum (with slippage): ${ethers.utils.formatUnits(amount0Min, token0Decimals)} ${token0Symbol}`);
    console.log(`Amount1 minimum (with slippage): ${ethers.utils.formatUnits(amount1Min, token1Decimals)} ${token1Symbol}`);
    
    // Prepare mint parameters
    const mintParams = {
      token0: TOKEN0_ADDRESS,
      token1: TOKEN1_ADDRESS,
      fee: fee,
      tickLower: tickLower,
      tickUpper: tickUpper,
      amount0Desired: amount0Desired,
      amount1Desired: amount1Desired,
      amount0Min: amount0Min,
      amount1Min: amount1Min,
      recipient: address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes from now
    };

    console.log('Minting position with parameters:', {
      token0: mintParams.token0,
      token1: mintParams.token1,
      fee: mintParams.fee,
      tickLower: mintParams.tickLower,
      tickUpper: mintParams.tickUpper,
      amount0Desired: ethers.utils.formatUnits(mintParams.amount0Desired, token0Decimals),
      amount1Desired: ethers.utils.formatUnits(mintParams.amount1Desired, token1Decimals),
      amount0Min: ethers.utils.formatUnits(mintParams.amount0Min, token0Decimals),
      amount1Min: ethers.utils.formatUnits(mintParams.amount1Min, token1Decimals),
    });
    
    try {
      console.log('Minting position...');
      const tx = await positionManagerContract.mint(mintParams, { gasLimit: 5000000 });
      console.log(`Transaction hash: ${tx.hash}`);
      
      console.log('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Check if the transaction was successful
      if (receipt.status === 1) {
        console.log('Transaction was successful!');
        
        // Try to parse the events to get the token ID
        for (const log of receipt.logs) {
          try {
            if (log.address.toLowerCase() === NONFUNGIBLE_POSITION_MANAGER_ADDRESS.toLowerCase()) {
              // Look for Transfer event which indicates NFT minting
              if (log.topics[0] === ethers.utils.id('Transfer(address,address,uint256)')) {
                const tokenId = ethers.BigNumber.from(log.topics[3]).toString();
                console.log(`🎉 Successfully minted NFT position with ID: ${tokenId}`);
              }
            }
          } catch (e) {
            // Skip errors in event parsing
          }
        }
        
        console.log('Liquidity successfully added to the pool!');
      } else {
        console.error('Transaction failed!');
      }
    } catch (error) {
      console.error('Error minting position:');
      if (typeof error === 'object' && error !== null) {
        // Try to extract more detailed error information
        if ('message' in error) console.error(`Error message: ${(error as any).message}`);
        if ('code' in error) console.error(`Error code: ${(error as any).code}`);
        if ('reason' in error) console.error(`Error reason: ${(error as any).reason}`);
        
        // If there's transaction data, try to get more info
        if ('transaction' in error) {
          const tx = (error as any).transaction;
          console.error(`Transaction data: ${JSON.stringify(tx, null, 2)}`);
        }
      }
      throw error;
    }



  } catch (error) {
    console.error('Error adding liquidity:');
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
