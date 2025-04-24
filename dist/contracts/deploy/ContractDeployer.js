"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractDeployer = void 0;
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const ContractCompiler_1 = require("../compile/ContractCompiler");
// Load environment variables
dotenv_1.default.config();
// File to store deployed contract addresses
const DEPLOYED_CONTRACTS_FILE = path_1.default.join(process.cwd(), 'deployed-contracts.json');
class ContractDeployer {
    constructor() {
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);
        this.signer = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.deployedContracts = this.loadDeployedContracts();
    }
    loadDeployedContracts() {
        try {
            if (fs_1.default.existsSync(DEPLOYED_CONTRACTS_FILE)) {
                const data = fs_1.default.readFileSync(DEPLOYED_CONTRACTS_FILE, 'utf8');
                return JSON.parse(data);
            }
        }
        catch (error) {
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
    saveDeployedContracts() {
        try {
            fs_1.default.writeFileSync(DEPLOYED_CONTRACTS_FILE, JSON.stringify(this.deployedContracts, null, 2), 'utf8');
        }
        catch (error) {
            console.error('Error saving deployed contracts:', error);
        }
    }
    async deployProtocolFarmCreation() {
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
            console.log(`Deployer balance: ${ethers_1.ethers.utils.formatEther(balance)} ETH`);
            // Compile the contract
            const contractPath = path_1.default.join(process.cwd(), 'src/contracts/solidity/ProtocolFarmCreation.sol');
            const compiledOutput = ContractCompiler_1.ContractCompiler.compileContract(contractPath);
            const { abi, bytecode } = ContractCompiler_1.ContractCompiler.getContract(compiledOutput, 'ProtocolFarmCreation');
            // Create a contract factory
            const factory = new ethers_1.ethers.ContractFactory(abi, bytecode, this.signer);
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
        }
        catch (error) {
            console.error('Error deploying Protocol Farm Creation contract:', error);
            throw error;
        }
    }
    async deployDXPToken() {
        if (this.deployedContracts.DXP_TOKEN_ADDRESS) {
            console.log('DXP Token already deployed at:', this.deployedContracts.DXP_TOKEN_ADDRESS);
            return this.deployedContracts.DXP_TOKEN_ADDRESS;
        }
        console.log('Deploying DXP Token contract...');
        try {
            // Compile the contract
            const contractPath = path_1.default.join(process.cwd(), 'src/contracts/solidity/DXPToken.sol');
            // Create the DXPToken.sol file if it doesn't exist
            if (!fs_1.default.existsSync(contractPath)) {
                console.log('Creating DXPToken.sol file...');
                const dxpTokenSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DXPToken is ERC20 {
    constructor() ERC20("Dexponent Token", "DXP") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}`;
                fs_1.default.writeFileSync(contractPath, dxpTokenSource);
            }
            const compiledOutput = ContractCompiler_1.ContractCompiler.compileContract(contractPath);
            const { abi, bytecode } = ContractCompiler_1.ContractCompiler.getContract(compiledOutput, 'DXPToken');
            // Create a contract factory
            const factory = new ethers_1.ethers.ContractFactory(abi, bytecode, this.signer);
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
        }
        catch (error) {
            console.error('Error deploying DXP Token contract:', error);
            throw error;
        }
    }
    async deployStrategyFactory(strategyType) {
        if (this.deployedContracts.STRATEGY_FACTORY_ADDRESSES &&
            this.deployedContracts.STRATEGY_FACTORY_ADDRESSES[strategyType]) {
            console.log(`Strategy Factory (${strategyType}) already deployed at:`, this.deployedContracts.STRATEGY_FACTORY_ADDRESSES[strategyType]);
            return this.deployedContracts.STRATEGY_FACTORY_ADDRESSES[strategyType];
        }
        console.log(`Deploying Strategy Factory (${strategyType}) contract...`);
        try {
            // Create the strategy factory contract file if it doesn't exist
            const contractDir = path_1.default.join(process.cwd(), 'src/contracts/solidity');
            const contractPath = path_1.default.join(contractDir, `${strategyType}Factory.sol`);
            if (!fs_1.default.existsSync(contractPath)) {
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
                fs_1.default.writeFileSync(contractPath, strategyFactorySource);
            }
            // Compile the contract
            const compiledOutput = ContractCompiler_1.ContractCompiler.compileContract(contractPath);
            const { abi, bytecode } = ContractCompiler_1.ContractCompiler.getContract(compiledOutput, `${strategyType}Factory`);
            // Create a contract factory
            const factory = new ethers_1.ethers.ContractFactory(abi, bytecode, this.signer);
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
        }
        catch (error) {
            console.error(`Error deploying Strategy Factory (${strategyType}) contract:`, error);
            throw error;
        }
    }
    async deployAllContracts() {
        // Deploy core contracts
        await this.deployProtocolFarmCreation();
        await this.deployDXPToken();
        // Deploy strategy factories for each strategy type
        await this.deployStrategyFactory('RESTAKE');
        await this.deployStrategyFactory('UNIV3_LP');
        await this.deployStrategyFactory('AAVE_LEND');
        return this.deployedContracts;
    }
    getDeployedContracts() {
        return this.deployedContracts;
    }
}
exports.ContractDeployer = ContractDeployer;
