import mongoose, { Document, Schema } from 'mongoose';

// Define interfaces for nested objects
interface IParameters {
  [key: string]: any;  // Allow any parameters
  targetAPY?: string;
  lockupPeriodDays?: number;
}

interface IIncentiveSplits {
  lp: number;
  verifier: number;
  yieldYoda: number;
}

interface IClaimToken {
  name: string;
  symbol: string;
}

// Define the interface for a Farm document
export interface IFarm extends Document {
  farmName: string;                    // Name of the farm
  farmDescription: string;             // Description of the farm
  farmOwner: string;                   // User wallet address used to deploy the farm (same as creatorAddress)
  farmAddress: string;                 // Deployed farm contract address
  poolAddress: string;                 // Associated pool address
  farmId: string;                      // Unique identifier for the farm
  principalAssetAddress: string;       // Address of the principal asset
  strategyType: string;                // Type of strategy (e.g., CUSTOM)
  strategyContractAddress?: string;    // Address of the strategy contract
  parameters: IParameters;             // Strategy parameters
  incentiveSplits: IIncentiveSplits;   // Incentive splits
  maturityPeriodDays: number;          // Maturity period in days
  claimToken: IClaimToken;             // Claim token details
  creatorAddress: string;              // Address of the creator
  createdAt: Date;                     // When the farm was deployed
  updatedAt: Date;                     // When the farm was last updated
}

// Create the Farm schema
const FarmSchema: Schema = new Schema(
  {
    farmName: {
      type: String,
      required: true,
    },
    farmDescription: {
      type: String,
      required: true,
    },
    farmOwner: {
      type: String,
      required: true,
      index: true,         // Index for faster queries by owner
    },
    farmAddress: {
      type: String,
      required: true,
      index: true,         // Index for faster queries by address
    },
    poolAddress: {
      type: String,
      required: true,
    },
    farmId: {
      type: String,
      required: true,
      index: true,         // Index for faster queries by ID, but not unique by itself
    },
    principalAssetAddress: {
      type: String,
      required: true,
    },
    strategyType: {
      type: String,
      required: true,
    },
    strategyContractAddress: {
      type: String,
      default: null,
    },
    parameters: {
      type: Object,
      required: true,
      default: {},
    },
    incentiveSplits: {
      lp: {
        type: Number,
        required: true,
      },
      verifier: {
        type: Number,
        required: true,
      },
      yieldYoda: {
        type: Number,
        required: true,
      },
    },
    maturityPeriodDays: {
      type: Number,
      required: true,
    },
    claimToken: {
      name: {
        type: String,
        required: true,
      },
      symbol: {
        type: String,
        required: true,
      },
    },
    creatorAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,      // Automatically add createdAt and updatedAt fields
  }
);

// Create a compound index on farmName and farmId to ensure uniqueness
FarmSchema.index({ farmName: 1, farmId: 1 }, { unique: true });

// Create and export the Farm model
export const Farm = mongoose.model<IFarm>('Farm', FarmSchema);
