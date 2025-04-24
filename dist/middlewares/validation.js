"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDeployFarm = exports.validateFarmRequest = void 0;
const express_validator_1 = require("express-validator");
const FarmRequest_1 = require("../models/FarmRequest");
exports.validateFarmRequest = [
    (0, express_validator_1.body)('farmName')
        .isString()
        .notEmpty()
        .withMessage('Farm name is required'),
    (0, express_validator_1.body)('farmDescription')
        .isString()
        .notEmpty()
        .withMessage('Farm description is required'),
    (0, express_validator_1.body)('principalAssetAddress')
        .isString()
        .matches(/^0x[a-fA-F0-9]{40}$/)
        .withMessage('Valid principal asset address is required'),
    (0, express_validator_1.body)('strategyType')
        .isIn(Object.values(FarmRequest_1.StrategyType))
        .withMessage('Valid strategy type is required'),
    (0, express_validator_1.body)('strategyContractAddress')
        .optional({ nullable: true })
        .matches(/^0x[a-fA-F0-9]{40}$/)
        .withMessage('Strategy contract address must be a valid Ethereum address'),
    (0, express_validator_1.body)('parameters')
        .isObject()
        .withMessage('Parameters must be an object'),
    (0, express_validator_1.body)('incentiveSplits')
        .isObject()
        .withMessage('Incentive splits must be an object'),
    (0, express_validator_1.body)('incentiveSplits.lp')
        .isInt({ min: 0, max: 100 })
        .withMessage('LP incentive split must be between 0 and 100'),
    (0, express_validator_1.body)('incentiveSplits.verifier')
        .isInt({ min: 0, max: 100 })
        .withMessage('Verifier incentive split must be between 0 and 100'),
    (0, express_validator_1.body)('incentiveSplits.yieldYoda')
        .isInt({ min: 0, max: 100 })
        .withMessage('Yield Yoda incentive split must be between 0 and 100'),
    (0, express_validator_1.body)('maturityPeriodDays')
        .isInt({ min: 1 })
        .withMessage('Maturity period days must be a positive integer'),
    (0, express_validator_1.body)('claimToken')
        .isObject()
        .withMessage('Claim token must be an object'),
    (0, express_validator_1.body)('claimToken.name')
        .isString()
        .notEmpty()
        .withMessage('Claim token name is required'),
    (0, express_validator_1.body)('claimToken.symbol')
        .isString()
        .notEmpty()
        .withMessage('Claim token symbol is required'),
    (0, express_validator_1.body)('creatorMetadata')
        .optional()
        .isObject()
        .withMessage('Creator metadata must be an object if provided')
];
exports.validateDeployFarm = [
    (0, express_validator_1.body)('requestId')
        .isUUID()
        .withMessage('Valid request ID is required')
];
