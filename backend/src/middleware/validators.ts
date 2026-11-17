import { body, param, query, ValidationChain } from 'express-validator';

export const validators = {
  // Auth validators
  // Sign-up completes in Firebase Auth on the client; the backend only
  // verifies the resulting ID token. `email` and `password` therefore come
  // from the token, not the body — only the optional profile fields are
  // validated here. Firebase enforces its own password rules.
  register: [
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail(),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 1 }),

    body('phone')
      .optional({ checkFalsy: true })
      .customSanitizer((val) => typeof val === 'string' ? val.replace(/[\s-()]/g, '') : val)
      .matches(/^\+?[0-9]{7,15}$/)
      .withMessage('Please enter a valid phone number'),

    body('dateOfBirth')
      .optional()
      .isDate(),
  ],

  // Profile validators
  updateProfile: [
    body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2 }),
    body('phone')
      .optional({ checkFalsy: true })
      .customSanitizer((val) => typeof val === 'string' ? val.replace(/[\s-()]/g, '') : val)
      .matches(/^\+?[0-9]{7,15}$/)
      .withMessage('Please enter a valid phone number'),
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
