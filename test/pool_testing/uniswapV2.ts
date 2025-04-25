import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const USDC_ADDRESS = '0x25feE6226e6426b811c5dF024Ba12Bb38EF50a28';
const DXP_ADDRESS = '0xC12a743f7A99Ff312263003C8d13810b732db9A7';
const WETH_ADDRESS = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9'; // Sepolia WETH

// Uniswap V2 contract addresses
const ROUTER_ADDRESS = '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008'; // Uniswap V2 Router on Sepolia
const FACTORY_ADDRESS = '0x7E0987E5b3a30e3f2828572Bb659A548460a3003'; // Uniswap V2 Factory on Sepolia

// ABIs
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)'
];

const ROUTER_ABI = [
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function WETH() external pure returns (address)'
];

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)'
];

const PAIR_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
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
  
  if (currentAllowance.gte(amount)) {
    console.log(`Current allowance (${ethers.utils.formatUnits(currentAllowance, tokenDecimals)}) is sufficient.`);
    return;
  }
  
  // Approve the tokens
  const tx = await tokenContract.approve(spender, amount);
  console.log(`Approval transaction hash: ${tx.hash}`);
  
  // Wait for the transaction to be mined
  const receipt = await tx.wait();
  console.log(`Approval confirmed in block ${receipt.blockNumber}`);
}

// Helper function to get pair address and reserves
async function getPairInfo(
  factoryContract: ethers.Contract,
  tokenA: string,
  tokenB: string,
  provider: ethers.providers.Provider
): Promise<{ pairAddress: string, reserves: any, token0: string, token1: string }> {
  // Get pair address
  const pairAddress = await factoryContract.getPair(tokenA, tokenB);
  
  if (pairAddress === ethers.constants.AddressZero) {
    throw new Error('Pair does not exist');
  }
  
  // Create pair contract instance
  const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
  
  // Get tokens in the pair
  const [token0, token1, reserves] = await Promise.all([
    pairContract.token0(),
    pairContract.token1(),
    pairContract.getReserves()
  ]);
  
  return {
    pairAddress,
    token0,
    token1,
    reserves
  };
}

// Add liquidity function
async function addLiquidity(
  amountA: string,
  amountB: string,
  tokenA: string,
  tokenB: string,
  slippageTolerance: number = 0.01 // 1% slippage by default
): Promise<void> {
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
    const tokenAContract = new ethers.Contract(tokenA, ERC20_ABI, wallet);
    const tokenBContract = new ethers.Contract(tokenB, ERC20_ABI, wallet);

    // Get token details
    const [tokenADecimals, tokenASymbol, tokenBDecimals, tokenBSymbol] = await Promise.all([
      tokenAContract.decimals(),
      tokenAContract.symbol(),
      tokenBContract.decimals(),
      tokenBContract.symbol()
    ]);

    console.log(`TokenA (${tokenASymbol}): ${tokenA}, Decimals: ${tokenADecimals}`);
    console.log(`TokenB (${tokenBSymbol}): ${tokenB}, Decimals: ${tokenBDecimals}`);

    // Parse amounts with correct decimals
    const amountADesired = ethers.utils.parseUnits(amountA, tokenADecimals);
    const amountBDesired = ethers.utils.parseUnits(amountB, tokenBDecimals);

    console.log(`Amount A desired: ${ethers.utils.formatUnits(amountADesired, tokenADecimals)} ${tokenASymbol}`);
    console.log(`Amount B desired: ${ethers.utils.formatUnits(amountBDesired, tokenBDecimals)} ${tokenBSymbol}`);

    // Check token balances
    const [balanceA, balanceB] = await Promise.all([
      tokenAContract.balanceOf(address),
      tokenBContract.balanceOf(address)
    ]);

    console.log(`Token A balance: ${ethers.utils.formatUnits(balanceA, tokenADecimals)} ${tokenASymbol}`);
    console.log(`Token B balance: ${ethers.utils.formatUnits(balanceB, tokenBDecimals)} ${tokenBSymbol}`);

    if (balanceA.lt(amountADesired)) {
      throw new Error(`Insufficient ${tokenASymbol} balance. Required: ${ethers.utils.formatUnits(amountADesired, tokenADecimals)}, Available: ${ethers.utils.formatUnits(balanceA, tokenADecimals)}`);
    }

    if (balanceB.lt(amountBDesired)) {
      throw new Error(`Insufficient ${tokenBSymbol} balance. Required: ${ethers.utils.formatUnits(amountBDesired, tokenBDecimals)}, Available: ${ethers.utils.formatUnits(balanceB, tokenBDecimals)}`);
    }

    // Get router contract
    const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    // Approve tokens
    await approveToken(tokenAContract, ROUTER_ADDRESS, amountADesired, wallet);
    await approveToken(tokenBContract, ROUTER_ADDRESS, amountBDesired, wallet);

    // Calculate minimum amounts with slippage tolerance
    const amountAMin = amountADesired.mul(ethers.BigNumber.from(Math.floor((1 - slippageTolerance) * 100))).div(ethers.BigNumber.from(100));
    const amountBMin = amountBDesired.mul(ethers.BigNumber.from(Math.floor((1 - slippageTolerance) * 100))).div(ethers.BigNumber.from(100));

    console.log(`Amount A minimum (with slippage): ${ethers.utils.formatUnits(amountAMin, tokenADecimals)} ${tokenASymbol}`);
    console.log(`Amount B minimum (with slippage): ${ethers.utils.formatUnits(amountBMin, tokenBDecimals)} ${tokenBSymbol}`);

    // Add liquidity
    console.log('Adding liquidity...');
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    
    const tx = await routerContract.addLiquidity(
      tokenA,
      tokenB,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      address,
      deadline,
      { gasLimit: 5000000 }
    );

    console.log(`Transaction hash: ${tx.hash}`);
    
    console.log('Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check if the transaction was successful
    if (receipt.status === 1) {
      console.log('Transaction was successful!');
      console.log('Liquidity successfully added to the pool!');
      
      // Get factory contract to check pair info
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      
      try {
        const pairInfo = await getPairInfo(factoryContract, tokenA, tokenB, provider);
        console.log(`\nPair address: ${pairInfo.pairAddress}`);
        
        // Determine which token is token0 and token1 in the pair
        const isAToken0 = pairInfo.token0.toLowerCase() === tokenA.toLowerCase();
        
        // Format reserves with correct decimals
        const reserve0 = ethers.utils.formatUnits(
          pairInfo.reserves[0],
          isAToken0 ? tokenADecimals : tokenBDecimals
        );
        const reserve1 = ethers.utils.formatUnits(
          pairInfo.reserves[1],
          isAToken0 ? tokenBDecimals : tokenADecimals
        );
        
        console.log(`Reserves: ${reserve0} ${isAToken0 ? tokenASymbol : tokenBSymbol} / ${reserve1} ${isAToken0 ? tokenBSymbol : tokenASymbol}`);
      } catch (error) {
        console.error('Error fetching pair info:', error);
      }
    } else {
      console.error('Transaction failed');
    }
  } catch (error) {
    console.error('Error adding liquidity:');
    console.error(error);
  }
}

// Swap tokens function
async function swapTokens(
  amountIn: string,
  tokenIn: string,
  tokenOut: string,
  slippageTolerance: number = 0.01 // 1% slippage by default
): Promise<void> {
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
    const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
    const tokenOutContract = new ethers.Contract(tokenOut, ERC20_ABI, wallet);

    // Get token details
    const [tokenInDecimals, tokenInSymbol, tokenOutDecimals, tokenOutSymbol] = await Promise.all([
      tokenInContract.decimals(),
      tokenInContract.symbol(),
      tokenOutContract.decimals(),
      tokenOutContract.symbol()
    ]);

    console.log(`Token In (${tokenInSymbol}): ${tokenIn}, Decimals: ${tokenInDecimals}`);
    console.log(`Token Out (${tokenOutSymbol}): ${tokenOut}, Decimals: ${tokenOutDecimals}`);

    // Parse amount with correct decimals
    const amountInWei = ethers.utils.parseUnits(amountIn, tokenInDecimals);

    console.log(`Amount In: ${ethers.utils.formatUnits(amountInWei, tokenInDecimals)} ${tokenInSymbol}`);

    // Check token balance
    const balance = await tokenInContract.balanceOf(address);
    console.log(`${tokenInSymbol} balance: ${ethers.utils.formatUnits(balance, tokenInDecimals)}`);

    if (balance.lt(amountInWei)) {
      throw new Error(`Insufficient ${tokenInSymbol} balance. Required: ${ethers.utils.formatUnits(amountInWei, tokenInDecimals)}, Available: ${ethers.utils.formatUnits(balance, tokenInDecimals)}`);
    }

    // Get router contract
    const routerContract = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

    // Approve token
    await approveToken(tokenInContract, ROUTER_ADDRESS, amountInWei, wallet);

    // Get expected output amount
    const path = [tokenIn, tokenOut];
    const amounts = await routerContract.getAmountsOut(amountInWei, path);
    const expectedAmountOut = amounts[1];
    
    console.log(`Expected output: ${ethers.utils.formatUnits(expectedAmountOut, tokenOutDecimals)} ${tokenOutSymbol}`);

    // Calculate minimum output amount with slippage tolerance
    const amountOutMin = expectedAmountOut.mul(ethers.BigNumber.from(Math.floor((1 - slippageTolerance) * 100))).div(ethers.BigNumber.from(100));
    
    console.log(`Minimum output (with slippage): ${ethers.utils.formatUnits(amountOutMin, tokenOutDecimals)} ${tokenOutSymbol}`);

    // Get balances before swap
    const [balanceInBefore, balanceOutBefore] = await Promise.all([
      tokenInContract.balanceOf(address),
      tokenOutContract.balanceOf(address)
    ]);
    
    console.log(`\nBalances before swap:`);
    console.log(`${tokenInSymbol}: ${ethers.utils.formatUnits(balanceInBefore, tokenInDecimals)}`);
    console.log(`${tokenOutSymbol}: ${ethers.utils.formatUnits(balanceOutBefore, tokenOutDecimals)}`);

    // Execute swap
    console.log('\nExecuting swap...');
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    
    const tx = await routerContract.swapExactTokensForTokens(
      amountInWei,
      amountOutMin,
      path,
      address,
      deadline,
      { gasLimit: 5000000 }
    );

    console.log(`Transaction hash: ${tx.hash}`);
    
    console.log('Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check if the transaction was successful
    if (receipt.status === 1) {
      console.log('Transaction was successful!');
      
      // Get balances after swap
      const [balanceInAfter, balanceOutAfter] = await Promise.all([
        tokenInContract.balanceOf(address),
        tokenOutContract.balanceOf(address)
      ]);
      
      console.log(`\nBalances after swap:`);
      console.log(`${tokenInSymbol}: ${ethers.utils.formatUnits(balanceInAfter, tokenInDecimals)}`);
      console.log(`${tokenOutSymbol}: ${ethers.utils.formatUnits(balanceOutAfter, tokenOutDecimals)}`);
      
      // Calculate changes
      const inSpent = ethers.utils.formatUnits(balanceInBefore.sub(balanceInAfter), tokenInDecimals);
      const outReceived = ethers.utils.formatUnits(balanceOutAfter.sub(balanceOutBefore), tokenOutDecimals);
      
      console.log(`\nSwap summary:`);
      console.log(`${inSpent} ${tokenInSymbol} spent`);
      console.log(`${outReceived} ${tokenOutSymbol} received`);
    } else {
      console.error('Transaction failed');
    }
  } catch (error) {
    console.error('Error swapping tokens:');
    console.error(error);
  }
}

// Check pool status function
async function checkPoolStatus(
  tokenA: string,
  tokenB: string
): Promise<void> {
  // Check if environment variables exist
  if (!process.env.RPC_URL && !process.env.RPC_ENDPOINT) {
    throw new Error('RPC_URL or RPC_ENDPOINT not found in .env file');
  }

  // Connect to provider
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || process.env.RPC_ENDPOINT);
  
  console.log(`Connected to network: ${(await provider.getNetwork()).name} (${(await provider.getNetwork()).chainId})`);

  try {
    // Get token contracts
    const tokenAContract = new ethers.Contract(tokenA, ERC20_ABI, provider);
    const tokenBContract = new ethers.Contract(tokenB, ERC20_ABI, provider);

    // Get token details
    const [tokenADecimals, tokenASymbol, tokenBDecimals, tokenBSymbol] = await Promise.all([
      tokenAContract.decimals(),
      tokenAContract.symbol(),
      tokenBContract.decimals(),
      tokenBContract.symbol()
    ]);

    console.log(`\n=== Token Information ===`);
    console.log(`Token A: ${tokenASymbol} (${tokenA})`);
    console.log(`Token A Decimals: ${tokenADecimals}`);
    console.log(`Token B: ${tokenBSymbol} (${tokenB})`);
    console.log(`Token B Decimals: ${tokenBDecimals}`);

    // Get factory contract
    const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
    
    // Get pair address
    const pairAddress = await factoryContract.getPair(tokenA, tokenB);
    
    console.log(`\n=== Pool Information ===`);
    console.log(`Factory Address: ${FACTORY_ADDRESS}`);
    
    if (pairAddress === ethers.constants.AddressZero) {
      console.log('Pair does not exist yet. You need to add liquidity first.');
      return;
    }
    
    console.log(`Pair Address: ${pairAddress}`);
    
    // Create pair contract instance
    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    
    // Get tokens in the pair and reserves
    const [token0, token1, reserves] = await Promise.all([
      pairContract.token0(),
      pairContract.token1(),
      pairContract.getReserves()
    ]);
    
    console.log(`Token Order: ${token0} / ${token1}`);
    
    // Determine which token is token0 and token1 in the pair
    const isAToken0 = token0.toLowerCase() === tokenA.toLowerCase();
    
    // Format reserves with correct decimals
    const reserve0 = ethers.utils.formatUnits(
      reserves[0],
      isAToken0 ? tokenADecimals : tokenBDecimals
    );
    const reserve1 = ethers.utils.formatUnits(
      reserves[1],
      isAToken0 ? tokenBDecimals : tokenADecimals
    );
    
    console.log(`\n=== Pool Reserves ===`);
    console.log(`${isAToken0 ? tokenASymbol : tokenBSymbol}: ${reserve0}`);
    console.log(`${isAToken0 ? tokenBSymbol : tokenASymbol}: ${reserve1}`);
    
    // Calculate price
    if (reserves[0].gt(0) && reserves[1].gt(0)) {
      const price0 = reserves[1].mul(ethers.BigNumber.from(10).pow(isAToken0 ? tokenADecimals : tokenBDecimals))
                    .div(reserves[0]);
      const price1 = reserves[0].mul(ethers.BigNumber.from(10).pow(isAToken0 ? tokenBDecimals : tokenADecimals))
                    .div(reserves[1]);
      
      console.log(`\n=== Price Information ===`);
      console.log(`1 ${isAToken0 ? tokenASymbol : tokenBSymbol} = ${ethers.utils.formatUnits(price0, isAToken0 ? tokenBDecimals : tokenADecimals)} ${isAToken0 ? tokenBSymbol : tokenASymbol}`);
      console.log(`1 ${isAToken0 ? tokenBSymbol : tokenASymbol} = ${ethers.utils.formatUnits(price1, isAToken0 ? tokenADecimals : tokenBDecimals)} ${isAToken0 ? tokenASymbol : tokenBSymbol}`);
    }
  } catch (error) {
    console.error('Error checking pool status:');
    console.error(error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  if (command === 'add') {
    // Add liquidity
    const amountA = args[1] || '100';
    const amountB = args[2] || '300';
    await addLiquidity(amountA, amountB, USDC_ADDRESS, DXP_ADDRESS);
  } else if (command === 'swap') {
    // Swap tokens
    const amountIn = args[1] || '10';
    const direction = args[2] || 'usdc-to-dxp';
    
    if (direction === 'usdc-to-dxp') {
      await swapTokens(amountIn, USDC_ADDRESS, DXP_ADDRESS);
    } else if (direction === 'dxp-to-usdc') {
      await swapTokens(amountIn, DXP_ADDRESS, USDC_ADDRESS);
    } else {
      console.error('Invalid swap direction. Use "usdc-to-dxp" or "dxp-to-usdc".');
    }
  } else if (command === 'status') {
    // Check pool status
    await checkPoolStatus(USDC_ADDRESS, DXP_ADDRESS);
  } else {
    // Show help
    console.log(`
Usage:
  npx ts-node ./test/pool_testing/uniswapV2.ts add [amountA] [amountB]
  npx ts-node ./test/pool_testing/uniswapV2.ts swap [amountIn] [direction]
  npx ts-node ./test/pool_testing/uniswapV2.ts status

Commands:
  add     - Add liquidity to the USDC/DXP pool
            [amountA] - Amount of USDC to add (default: 100)
            [amountB] - Amount of DXP to add (default: 300)
  
  swap    - Swap tokens
            [amountIn] - Amount to swap (default: 10)
            [direction] - Swap direction: "usdc-to-dxp" or "dxp-to-usdc" (default: usdc-to-dxp)
  
  status  - Check pool status
  
  help    - Show this help message
`);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
