"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Farm = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Create the Farm schema
const FarmSchema = new mongoose_1.Schema({
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
        index: true, // Index for faster queries by owner
    },
    farmAddress: {
        type: String,
        required: true,
        index: true, // Index for faster queries by address
    },
    poolAddress: {
        type: String,
        required: true,
    },
    farmId: {
        type: String,
        required: true,
        index: true, // Index for faster queries by ID, but not unique by itself
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
}, {
    timestamps: true, // Automatically add createdAt and updatedAt fields
});
// Create a compound index on farmName and farmId to ensure uniqueness
FarmSchema.index({ farmName: 1, farmId: 1 }, { unique: true });
// Create and export the Farm model
exports.Farm = mongoose_1.default.model('Farm', FarmSchema);
