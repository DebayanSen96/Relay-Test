"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const handleValidationErrors = (req, res, next) => {
    console.log('[VALIDATION] handleValidationErrors entered.');
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        console.log('[VALIDATION] Validation errors found:', errors.array());
        res.status(400).json({ errors: errors.array() });
        return;
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
