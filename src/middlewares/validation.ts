import { body } from 'express-validator';
import { StrategyType } from '../models/FarmRequest';

export const validateFarmRequest = [
  body('farmName')
    .isString()
    .notEmpty()
    .withMessage('Farm name is required'),
  
  body('farmDescription')
    .isString()
    .notEmpty()
    .withMessage('Farm description is required'),
  
  body('principalAssetAddress')
    .isString()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Valid principal asset address is required'),
  
  body('strategyType')
    .isIn(Object.values(StrategyType))
    .withMessage('Valid strategy type is required'),
  
  body('strategyContractAddress')
    .optional({ nullable: true })
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Strategy contract address must be a valid Ethereum address'),
  
  body('parameters')
    .isObject()
    .withMessage('Parameters must be an object'),
  
  body('incentiveSplits')
    .isObject()
    .withMessage('Incentive splits must be an object'),
  
  body('incentiveSplits.lp')
    .isInt({ min: 0, max: 100 })
    .withMessage('LP incentive split must be between 0 and 100'),
  
  body('incentiveSplits.verifier')
    .isInt({ min: 0, max: 100 })
    .withMessage('Verifier incentive split must be between 0 and 100'),
  
  body('incentiveSplits.yieldYoda')
    .isInt({ min: 0, max: 100 })
    .withMessage('Yield Yoda incentive split must be between 0 and 100'),
  
  body('maturityPeriodDays')
    .isInt({ min: 1 })
    .withMessage('Maturity period days must be a positive integer'),
  
  body('claimToken')
    .isObject()
    .withMessage('Claim token must be an object'),
  
  body('claimToken.name')
    .isString()
    .notEmpty()
    .withMessage('Claim token name is required'),
  
  body('claimToken.symbol')
    .isString()
    .notEmpty()
    .withMessage('Claim token symbol is required'),
  
  body('creatorMetadata')
    .optional()
    .isObject()
    .withMessage('Creator metadata must be an object if provided')
];

export const validateDeployFarm = [
  body('requestId')
    .isUUID()
    .withMessage('Valid request ID is required')
];
