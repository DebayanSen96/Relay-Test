import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const POOL_ADDRESS = '0xD9df9b30195944Dd000641d14356A0C840a794F8';
const TOKEN0_ADDRESS = '0x25feE6226e6426b811c5dF024Ba12Bb38EF50a28';
const TOKEN1_ADDRESS = '0xC12a743f7A99Ff312263003C8d13810b732db9A7';
const AMOUNT_TO_SWAP = '10'; // Default amount to swap (will be adjusted based on token decimals)

// Uniswap V3 contract addresses
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Uniswap V3 SwapRouter

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

const SWAP_ROUTER_ABI = [
  'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountIn)'
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

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const swapDirection = args[0] || '0to1'; // Default: swap token0 for token1
  const amountToSwap = args[1] || AMOUNT_TO_SWAP;
  
  if (!['0to1', '1to0'].includes(swapDirection)) {
    console.error('Invalid swap direction. Use "0to1" to swap token0 for token1, or "1to0" to swap token1 for token0.');
    process.exit(1);
  }

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
    const [fee, liquidity, slot0] = await Promise.all([
      poolContract.fee(),
      poolContract.liquidity(),
      poolContract.slot0()
    ]);

    console.log(`Pool fee: ${fee}`);
    console.log(`Pool liquidity: ${liquidity.toString()}`);
    console.log(`Current tick: ${slot0.tick}`);
    console.log(`Current sqrt price: ${slot0.sqrtPriceX96.toString()}`);

    // Determine token in and token out based on swap direction
    const isZeroToOne = swapDirection === '0to1';
    const tokenIn = isZeroToOne ? TOKEN0_ADDRESS : TOKEN1_ADDRESS;
    const tokenOut = isZeroToOne ? TOKEN1_ADDRESS : TOKEN0_ADDRESS;
    const tokenInContract = isZeroToOne ? token0Contract : token1Contract;
    const tokenInDecimals = isZeroToOne ? token0Decimals : token1Decimals;
    const tokenInSymbol = isZeroToOne ? token0Symbol : token1Symbol;
    const tokenOutSymbol = isZeroToOne ? token1Symbol : token0Symbol;

    // Parse amount to swap
    const amountIn = ethers.utils.parseUnits(amountToSwap, tokenInDecimals);

    console.log(`Swapping ${ethers.utils.formatUnits(amountIn, tokenInDecimals)} ${tokenInSymbol} for ${tokenOutSymbol}...`);

    // Check token balance
    const balance = await tokenInContract.balanceOf(address);
    console.log(`${tokenInSymbol} balance: ${ethers.utils.formatUnits(balance, tokenInDecimals)}`);

    if (balance.lt(amountIn)) {
      throw new Error(`Insufficient ${tokenInSymbol} balance. Required: ${ethers.utils.formatUnits(amountIn, tokenInDecimals)}, Available: ${ethers.utils.formatUnits(balance, tokenInDecimals)}`);
    }

    // Approve token
    await approveToken(
      tokenInContract,
      SWAP_ROUTER_ADDRESS,
      amountIn,
      wallet
    );

    // Get swap router contract
    const swapRouterContract = new ethers.Contract(
      SWAP_ROUTER_ADDRESS,
      SWAP_ROUTER_ABI,
      wallet
    );

    // Prepare swap parameters
    const swapParams = {
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: fee,
      recipient: address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
      amountIn: amountIn,
      amountOutMinimum: 0, // Set to 0 for simplicity, but in production you should use slippage protection
      sqrtPriceLimitX96: 0 // Set to 0 to not use a price limit
    };

    // Log the exact parameters we're sending to the swap function
    console.log('Swap parameters:', {
      tokenIn: swapParams.tokenIn,
      tokenOut: swapParams.tokenOut,
      fee: swapParams.fee.toString(),
      amountIn: ethers.utils.formatUnits(swapParams.amountIn, tokenInDecimals),
      amountOutMinimum: swapParams.amountOutMinimum.toString(),
      sqrtPriceLimitX96: swapParams.sqrtPriceLimitX96.toString()
    });

    // Check pool liquidity again right before swap
    const currentLiquidity = await poolContract.liquidity();
    console.log(`Current pool liquidity before swap: ${currentLiquidity.toString()}`);
    
    if (currentLiquidity.eq(0)) {
      console.warn('WARNING: Pool has zero liquidity. Swaps will likely fail or have extreme price impact.');
    }

    console.log('Executing swap...');
    try {
      const tx = await swapRouterContract.exactInputSingle(swapParams, { gasLimit: 500000 });
      console.log(`Transaction hash: ${tx.hash}`);
      
      console.log('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Try to parse logs for swap events
      console.log('Transaction logs:', receipt.logs.length);
      
      // Look for any events that might indicate the swap result
      for (const log of receipt.logs) {
        try {
          console.log(`Log from: ${log.address}`);
          // If this is a Transfer event
          if (log.topics[0] === ethers.utils.id('Transfer(address,address,uint256)')) {
            console.log('  Transfer event detected');
            const fromAddress = ethers.utils.defaultAbiCoder.decode(['address'], log.topics[1])[0];
            const toAddress = ethers.utils.defaultAbiCoder.decode(['address'], log.topics[2])[0];
            const amount = log.data !== '0x' ? ethers.BigNumber.from(log.data) : ethers.BigNumber.from(log.topics[3]);
            console.log(`  From: ${fromAddress}`);
            console.log(`  To: ${toAddress}`);
            console.log(`  Amount: ${amount.toString()}`);
          }
        } catch (e) {
          console.log('  Could not parse log');
        }
      }
    } catch (error) {
      console.error('Swap transaction failed:');
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

    // Check new balances
    const [newBalanceIn, newBalanceOut] = await Promise.all([
      tokenInContract.balanceOf(address),
      (isZeroToOne ? token1Contract : token0Contract).balanceOf(address)
    ]);

    console.log(`\nSwap completed!`);
    console.log(`New ${tokenInSymbol} balance: ${ethers.utils.formatUnits(newBalanceIn, tokenInDecimals)}`);
    console.log(`New ${tokenOutSymbol} balance: ${ethers.utils.formatUnits(newBalanceOut, isZeroToOne ? token1Decimals : token0Decimals)}`);
    console.log(`${tokenInSymbol} spent: ${ethers.utils.formatUnits(balance.sub(newBalanceIn), tokenInDecimals)}`);

  } catch (error) {
    console.error('Error swapping tokens:');
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
