"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FarmRequest = exports.StrategyType = exports.FarmRequestStatus = void 0;
const typeorm_1 = require("typeorm");
var FarmRequestStatus;
(function (FarmRequestStatus) {
    FarmRequestStatus["PENDING_DEPLOYMENT"] = "PENDING_DEPLOYMENT";
    FarmRequestStatus["STRATEGY_DEPLOYED"] = "STRATEGY_DEPLOYED";
    FarmRequestStatus["FARM_DEPLOYED"] = "FARM_DEPLOYED";
    FarmRequestStatus["POOL_DEPLOYED"] = "POOL_DEPLOYED";
    FarmRequestStatus["READY"] = "READY";
    FarmRequestStatus["AWAITING_VERIFICATION"] = "AWAITING_VERIFICATION";
    FarmRequestStatus["FAILED"] = "FAILED";
})(FarmRequestStatus || (exports.FarmRequestStatus = FarmRequestStatus = {}));
var StrategyType;
(function (StrategyType) {
    StrategyType["RESTAKE"] = "RESTAKE";
    StrategyType["UNIV3_LP"] = "UNIV3_LP";
    StrategyType["AAVE_LEND"] = "AAVE_LEND";
    StrategyType["CUSTOM"] = "CUSTOM";
})(StrategyType || (exports.StrategyType = StrategyType = {}));
let FarmRequest = class FarmRequest {
    constructor() {
        this.farmLogoUrl = null;
        this.strategyContractAddress = null;
        this.creatorMetadata = null;
        this.metadataIpfsHash = null;
        this.status = FarmRequestStatus.PENDING_DEPLOYMENT;
        this.salt = null;
        this.farmId = null;
        this.farmAddress = null;
        this.poolAddress = null;
        this.deploymentData = null;
    }
};
exports.FarmRequest = FarmRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FarmRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], FarmRequest.prototype, "farmName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], FarmRequest.prototype, "farmDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "farmLogoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 42 }),
    __metadata("design:type", String)
], FarmRequest.prototype, "principalAssetAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: StrategyType }),
    __metadata("design:type", String)
], FarmRequest.prototype, "strategyType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 42, nullable: true }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "strategyContractAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "parameters", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "incentiveSplits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], FarmRequest.prototype, "maturityPeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "claimToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "creatorMetadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 42 }),
    __metadata("design:type", String)
], FarmRequest.prototype, "creatorAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "metadataIpfsHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: FarmRequestStatus, default: FarmRequestStatus.PENDING_DEPLOYMENT }),
    __metadata("design:type", String)
], FarmRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 66, nullable: true }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "salt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "farmId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 42, nullable: true }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "farmAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 42, nullable: true }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "poolAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], FarmRequest.prototype, "deploymentData", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FarmRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], FarmRequest.prototype, "updatedAt", void 0);
exports.FarmRequest = FarmRequest = __decorate([
    (0, typeorm_1.Entity)('farm_requests')
], FarmRequest);
