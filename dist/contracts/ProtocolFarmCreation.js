"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolFarmCreation = exports.ProtocolFarmCreationABI = void 0;
const ethers_1 = require("ethers");
exports.ProtocolFarmCreationABI = [
    // Events
    "event FarmCreated(uint256 indexed farmId, address indexed farmAddr, address indexed creator, address asset, address strategy)",
    // Functions
    "function createFarm(bytes32 salt, address asset, uint256 maturityPeriod, uint256 verifierIncentiveSplit, uint256 yieldYodaIncentiveSplit, uint256 lpIncentiveSplit, address strategy, string memory claimName, string memory claimSymbol) external returns (uint256 farmId, address farmAddr)",
    "function approvedFarmOwners(address) external view returns (bool)",
    "function setApprovedFarmOwner(address owner, bool approved) external",
    "function owner() external view returns (address)"
];
class ProtocolFarmCreation {
    constructor(address, signer) {
        this.contract = new ethers_1.ethers.Contract(address, exports.ProtocolFarmCreationABI, signer);
    }
    async isApprovedFarmOwner(address) {
        return await this.contract.approvedFarmOwners(address);
    }
    async createFarm(salt, asset, maturityPeriod, verifierIncentiveSplit, yieldYodaIncentiveSplit, lpIncentiveSplit, strategy, claimName, claimSymbol) {
        return await this.contract.createFarm(salt, asset, maturityPeriod, verifierIncentiveSplit, yieldYodaIncentiveSplit, lpIncentiveSplit, strategy, claimName, claimSymbol);
    }
    async getOwner() {
        return await this.contract.owner();
    }
}
exports.ProtocolFarmCreation = ProtocolFarmCreation;
