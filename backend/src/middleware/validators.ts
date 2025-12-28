import { body, param, query, ValidationChain } from 'express-validator';

export const validators = {
  // Auth validators
  register: [
    body('email')
      .isEmail()
      .normalizeEmail(),

    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 1 }),

    body('phone')
      .optional()
      .matches(/^\+?[0-9]{7,15}$/)
      .withMessage('Please enter a valid phone number'),

    body('dateOfBirth')
      .optional()
      .isDate(),
  ],

  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],

  forgotPassword: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  ],

  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],

  // Profile validators
  updateProfile: [
    body('name').optional().trim().isLength({ min: 2 }),
    body('phone')
      .optional()
      .matches(/^(\+65)?[89]\d{7}$/)
      .withMessage('Please enter a valid Singapore mobile number (+65 followed by 8 digits starting with 8 or 9)'),
  ],

  // Product validators
  createProduct: [
    body('name').trim().isLength({ min: 3 }),
    body('brand').trim().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('category').notEmpty(),
    body('volume').notEmpty(),
    body('abv').notEmpty(),
    body('stock').isInt({ min: 0 }),
  ],

  // Order validators
  createOrder: [
    body('addressId').isUUID(),
    body('paymentMethod').isIn(['STRIPE', 'CASH_ON_DELIVERY']),
    body('items').isArray({ min: 1 }),
    body('items.*.productId').isUUID(),
    body('items.*.quantity').isInt({ min: 1 }),
  ],

  // Address validators
  createAddress: [
    body('street').trim().notEmpty(),
    body('postalCode').matches(/^\d{6}$/),
    body('district').trim().notEmpty(),
    body('type')
      .customSanitizer((val) => typeof val === 'string' ? val.trim() : val)
      .customSanitizer((val) => {
        if (typeof val !== 'string') return val;
        const lower = val.toLowerCase();
        if (['home', 'work', 'other'].includes(lower)) {
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        }
        return val;
      })
      .isIn(['Home', 'Work', 'Other']),
  ],

  // Pagination
  pagination: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
};
