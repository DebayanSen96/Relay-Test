import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ContractCompiler } from '../compile/ContractCompiler';

// Load environment variables
dotenv.config();

// File to store deployed contract addresses
const DEPLOYED_CONTRACTS_FILE = path.join(process.cwd(), 'deployed-contracts.json');

interface DeployedContracts {
  PROTOCOL_FARM_CREATION_ADDRESS: string;
  DXP_TOKEN_ADDRESS: string;
  STRATEGY_FACTORY_ADDRESSES: {
    [key: string]: string;
  };
  UNISWAP_V3_FACTORY_ADDRESS: string;
  LIQUIDITY_MANAGER_ADDRESS: string;
}

export class ContractDeployer {
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private deployedContracts: DeployedContracts;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);
    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
    this.deployedContracts = this.loadDeployedContracts();
  }

  private loadDeployedContracts(): DeployedContracts {
    try {
      if (fs.existsSync(DEPLOYED_CONTRACTS_FILE)) {
        const data = fs.readFileSync(DEPLOYED_CONTRACTS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading deployed contracts:', error);
    }

    // Return empty object if file doesn't exist or there's an error
    return {
      PROTOCOL_FARM_CREATION_ADDRESS: '',
      DXP_TOKEN_ADDRESS: '',
      STRATEGY_FACTORY_ADDRESSES: {},
      UNISWAP_V3_FACTORY_ADDRESS: process.env.UNISWAP_V3_FACTORY_ADDRESS || '',
      LIQUIDITY_MANAGER_ADDRESS: process.env.LIQUIDITY_MANAGER_ADDRESS || ''
    };
  }

  private saveDeployedContracts(): void {
    try {
      fs.writeFileSync(
        DEPLOYED_CONTRACTS_FILE,
        JSON.stringify(this.deployedContracts, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving deployed contracts:', error);
    }
  }

  async deployProtocolFarmCreation(): Promise<string> {
    if (this.deployedContracts.PROTOCOL_FARM_CREATION_ADDRESS) {
      console.log('Protocol Farm Creation already deployed at:', this.deployedContracts.PROTOCOL_FARM_CREATION_ADDRESS);
      return this.deployedContracts.PROTOCOL_FARM_CREATION_ADDRESS;
    }

    console.log('Deploying Protocol Farm Creation contract...');
    
    try {
      // Get the chain ID to ensure we're on the right network
      const network = await this.provider.getNetwork();
      console.log(`Deploying to network: ${network.name} (chainId: ${network.chainId})`);
      
      // Get the deployer's address and balance
      const deployerAddress = await this.signer.getAddress();
      const balance = await this.provider.getBalance(deployerAddress);
      console.log(`Deployer address: ${deployerAddress}`);
      console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);
      
      // Compile the contract
      const contractPath = path.join(process.cwd(), 'src/contracts/solidity/ProtocolFarmCreation.sol');
      const compiledOutput = ContractCompiler.compileContract(contractPath);
      const { abi, bytecode } = ContractCompiler.getContract(compiledOutput, 'ProtocolFarmCreation');
      
      // Create a contract factory
      const factory = new ethers.ContractFactory(abi, bytecode, this.signer);
      
      // Deploy the contract
      console.log('Deploying ProtocolFarmCreation contract...');
      const contract = await factory.deploy();
      console.log('Waiting for transaction to be mined...');
      await contract.deployed();
      
      console.log('Protocol Farm Creation deployed at:', contract.address);
      
      // Save the deployed address
      this.deployedContracts.PROTOCOL_FARM_CREATION_ADDRESS = contract.address;
      this.saveDeployedContracts();
      
      return contract.address;
    } catch (error) {
      console.error('Error deploying Protocol Farm Creation contract:', error);
      throw error;
    }
  }

  async deployDXPToken(): Promise<string> {
    if (this.deployedContracts.DXP_TOKEN_ADDRESS) {
      console.log('DXP Token already deployed at:', this.deployedContracts.DXP_TOKEN_ADDRESS);
      return this.deployedContracts.DXP_TOKEN_ADDRESS;
    }

    console.log('Deploying DXP Token contract...');
    
    try {
      // Compile the contract
      const contractPath = path.join(process.cwd(), 'src/contracts/solidity/DXPToken.sol');
      
      // Create the DXPToken.sol file if it doesn't exist
      if (!fs.existsSync(contractPath)) {
        console.log('Creating DXPToken.sol file...');
        const dxpTokenSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DXPToken is ERC20 {
    constructor() ERC20("Dexponent Token", "DXP") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}`;
        fs.writeFileSync(contractPath, dxpTokenSource);
      }
      
      const compiledOutput = ContractCompiler.compileContract(contractPath);
      const { abi, bytecode } = ContractCompiler.getContract(compiledOutput, 'DXPToken');
      
      // Create a contract factory
      const factory = new ethers.ContractFactory(abi, bytecode, this.signer);
      
      // Deploy the contract
      console.log('Deploying DXPToken contract...');
      const contract = await factory.deploy();
      console.log('Waiting for transaction to be mined...');
      await contract.deployed();
      
      console.log('DXP Token deployed at:', contract.address);
      
      // Save the deployed address
      this.deployedContracts.DXP_TOKEN_ADDRESS = contract.address;
      this.saveDeployedContracts();
      
      return contract.address;
    } catch (error) {
      console.error('Error deploying DXP Token contract:', error);
      throw error;
    }
  }

  async deployStrategyFactory(strategyType: string): Promise<string> {
    if (this.deployedContracts.STRATEGY_FACTORY_ADDRESSES && 
        this.deployedContracts.STRATEGY_FACTORY_ADDRESSES[strategyType]) {
      console.log(`Strategy Factory (${strategyType}) already deployed at:`, 
        this.deployedContracts.STRATEGY_FACTORY_ADDRESSES[strategyType]);
      return this.deployedContracts.STRATEGY_FACTORY_ADDRESSES[strategyType];
    }

    console.log(`Deploying Strategy Factory (${strategyType}) contract...`);
    
    try {
      // Create the strategy factory contract file if it doesn't exist
      const contractDir = path.join(process.cwd(), 'src/contracts/solidity');
      const contractPath = path.join(contractDir, `${strategyType}Factory.sol`);
      
      if (!fs.existsSync(contractPath)) {
        console.log(`Creating ${strategyType}Factory.sol file...`);
        const strategyFactorySource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ${strategyType}Strategy {
    address public asset;
    uint256 public targetAPY;
    uint256 public lockupPeriod;
    
    constructor(address _asset, uint256 _targetAPY, uint256 _lockupPeriod) {
        asset = _asset;
        targetAPY = _targetAPY;
        lockupPeriod = _lockupPeriod;
    }
    
    function initialize(address _asset, uint256 _targetAPY, uint256 _lockupPeriod) external {
        asset = _asset;
        targetAPY = _targetAPY;
        lockupPeriod = _lockupPeriod;
    }
    
    function getTargetAPY() external view returns (uint256) {
        return targetAPY;
    }
    
    function getLockupPeriod() external view returns (uint256) {
        return lockupPeriod;
    }
}

contract ${strategyType}Factory {
    function deployStrategy(address asset, uint256 targetAPY, uint256 lockupPeriod) external returns (address) {
        ${strategyType}Strategy strategy = new ${strategyType}Strategy(asset, targetAPY, lockupPeriod);
        return address(strategy);
    }
}`;
        fs.writeFileSync(contractPath, strategyFactorySource);
      }
      
      // Compile the contract
      const compiledOutput = ContractCompiler.compileContract(contractPath);
      const { abi, bytecode } = ContractCompiler.getContract(compiledOutput, `${strategyType}Factory`);
      
      // Create a contract factory
      const factory = new ethers.ContractFactory(abi, bytecode, this.signer);
      
      // Deploy the contract
      console.log(`Deploying ${strategyType}Factory contract...`);
      const contract = await factory.deploy();
      console.log('Waiting for transaction to be mined...');
      await contract.deployed();
      
      console.log(`Strategy Factory (${strategyType}) deployed at:`, contract.address);
      
      // Save the deployed address
      if (!this.deployedContracts.STRATEGY_FACTORY_ADDRESSES) {
        this.deployedContracts.STRATEGY_FACTORY_ADDRESSES = {};
      }
      this.deployedContracts.STRATEGY_FACTORY_ADDRESSES[strategyType] = contract.address;
      this.saveDeployedContracts();
      
      return contract.address;
    } catch (error) {
      console.error(`Error deploying Strategy Factory (${strategyType}) contract:`, error);
      throw error;
    }
  }

  async deployAllContracts(): Promise<DeployedContracts> {
    // Deploy core contracts
    await this.deployProtocolFarmCreation();
    await this.deployDXPToken();
    
    // Deploy strategy factories for each strategy type
    await this.deployStrategyFactory('RESTAKE');
    await this.deployStrategyFactory('UNIV3_LP');
    await this.deployStrategyFactory('AAVE_LEND');
    
    return this.deployedContracts;
  }

  getDeployedContracts(): DeployedContracts {
    return this.deployedContracts;
  }
}
