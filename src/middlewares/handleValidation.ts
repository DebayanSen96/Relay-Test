import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  console.log('[VALIDATION] handleValidationErrors entered.');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('[VALIDATION] Validation errors found:', errors.array());
    res.status(400).json({ errors: errors.array() }); 
    return; 
  }
  next();
};
