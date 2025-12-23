/**
 * Validation Middleware
 * Centralized input validation using express-validator
 */
const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 * Use after validation chains
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// ============================================
// COMMON VALIDATORS
// ============================================

/**
 * Sanitize string - trim whitespace and escape HTML
 */
const sanitizeString = (field) => 
  body(field).optional().trim().escape();

/**
 * Required string with length constraints
 */
const requiredString = (field, minLength = 1, maxLength = 255) =>
  body(field)
    .trim()
    .notEmpty().withMessage(`${field} is required`)
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`);

/**
 * Optional string with length constraints
 */
const optionalString = (field, maxLength = 255) =>
  body(field)
    .optional()
    .trim()
    .isLength({ max: maxLength })
    .withMessage(`${field} must be less than ${maxLength} characters`);

/**
 * Validate ID parameter (positive integer)
 */
const validateId = (paramName = 'id') =>
  param(paramName)
    .isInt({ min: 1 }).withMessage(`${paramName} must be a positive integer`)
    .toInt();

/**
 * Validate pagination query params
 */
const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
    .toInt(),
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('offset must be a non-negative integer')
    .toInt()
];

// ============================================
// VEHICLE VALIDATORS
// ============================================

const vehicleValidators = {
  /**
   * Validate vehicle check-in request
   */
  checkin: [
    body('unique_card_id')
      .trim()
      .notEmpty().withMessage('NFC card ID is required')
      .isLength({ min: 1, max: 100 }).withMessage('Card ID must be less than 100 characters')
      .matches(/^[a-zA-Z0-9:_-]+$/).withMessage('Card ID contains invalid characters'),
    
    body('license_plate')
      .trim()
      .notEmpty().withMessage('License plate is required')
      .isLength({ min: 1, max: 20 }).withMessage('License plate must be less than 20 characters')
      .toUpperCase(),
    
    body('key_slot')
      .notEmpty().withMessage('Hook number (key_slot) is required')
      .isInt({ min: 1, max: 200 }).withMessage('Hook number must be between 1 and 200')
      .toInt(),
    
    body('make')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Make must be less than 50 characters'),
    
    body('model')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Model must be less than 50 characters'),
    
    body('color')
      .optional()
      .trim()
      .isLength({ max: 30 }).withMessage('Color must be less than 30 characters'),
    
    body('year')
      .optional()
      .isInt({ min: 1900, max: 2100 }).withMessage('Year must be a valid year')
      .toInt(),
    
    body('customer_phone')
      .optional()
      .trim()
      .isMobilePhone('any').withMessage('Invalid phone number format'),
    
    validate
  ],

  /**
   * Validate card ID parameter
   */
  cardId: [
    param('cardId')
      .trim()
      .notEmpty().withMessage('Card ID is required')
      .isLength({ min: 1, max: 100 }).withMessage('Invalid card ID'),
    validate
  ]
};

// ============================================
// RETRIEVAL VALIDATORS
// ============================================

const retrievalValidators = {
  /**
   * Validate retrieval request
   */
  request: [
    body('unique_card_id')
      .trim()
      .notEmpty().withMessage('Card ID is required')
      .isLength({ min: 1, max: 100 }).withMessage('Invalid card ID'),
    
    body('is_priority')
      .optional()
      .isBoolean().withMessage('is_priority must be a boolean')
      .toBoolean(),
    
    validate
  ],

  /**
   * Validate task acceptance
   */
  accept: [
    param('taskId')
      .isInt({ min: 1 }).withMessage('Task ID must be a positive integer')
      .toInt(),
    
    body('driverId')
      .notEmpty().withMessage('Driver ID is required')
      .isInt({ min: 1 }).withMessage('Driver ID must be a positive integer')
      .toInt(),
    
    validate
  ],

  /**
   * Validate task ID parameter
   */
  taskId: [
    param('taskId')
      .isInt({ min: 1 }).withMessage('Task ID must be a positive integer')
      .toInt(),
    validate
  ],

  /**
   * Validate retrieval completion
   */
  complete: [
    body('cardId')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }).withMessage('Invalid card ID'),
    
    body('requestId')
      .optional()
      .isInt({ min: 1 }).withMessage('Request ID must be a positive integer')
      .toInt(),
    
    body('driverId')
      .optional()
      .isInt({ min: 1 }).withMessage('Driver ID must be a positive integer')
      .toInt(),
    
    // Custom validation: at least one of cardId or requestId required
    body().custom((value, { req }) => {
      if (!req.body.cardId && !req.body.requestId) {
        throw new Error('Either cardId or requestId is required');
      }
      return true;
    }),
    
    validate
  ],

  /**
   * Validate payment method update
   */
  paymentMethod: [
    param('requestId')
      .isInt({ min: 1 }).withMessage('Request ID must be a positive integer')
      .toInt(),
    
    body('paymentMethod')
      .trim()
      .notEmpty().withMessage('Payment method is required')
      .isIn(['cash', 'card', 'online', 'pending']).withMessage('Invalid payment method'),
    
    validate
  ],

  /**
   * Validate cash collection
   */
  collectCash: [
    param('taskId')
      .isInt({ min: 1 }).withMessage('Task ID must be a positive integer')
      .toInt(),
    
    body('amount')
      .optional()
      .isFloat({ min: 0, max: 10000 }).withMessage('Amount must be between 0 and 10000')
      .toFloat(),
    
    validate
  ]
};

// ============================================
// DRIVER VALIDATORS
// ============================================

const driverValidators = {
  /**
   * Validate driver registration
   */
  register: [
    body('fullName')
      .trim()
      .notEmpty().withMessage('Full name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),
    
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
      .isAlphanumeric().withMessage('Username must be alphanumeric'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6, max: 100 }).withMessage('Password must be between 6 and 100 characters'),
    
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone is required')
      .isMobilePhone('any').withMessage('Invalid phone number'),
    
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    
    body('licenseNumber')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('License number must be less than 50 characters'),
    
    body('vehicleInfo')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Vehicle info must be less than 200 characters'),
    
    body('emergencyContact')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Emergency contact must be less than 100 characters'),
    
    body('emergencyPhone')
      .optional()
      .trim()
      .isMobilePhone('any').withMessage('Invalid emergency phone number'),
    
    validate
  ],

  /**
   * Validate driver login
   */
  login: [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ max: 50 }).withMessage('Username too long'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ max: 100 }).withMessage('Password too long'),
    
    validate
  ],

  /**
   * Validate driver logout
   */
  logout: [
    body('driverId')
      .notEmpty().withMessage('Driver ID is required')
      .isInt({ min: 1 }).withMessage('Driver ID must be a positive integer')
      .toInt(),
    
    validate
  ],

  /**
   * Validate password change
   */
  changePassword: [
    param('id')
      .isInt({ min: 1 }).withMessage('Driver ID must be a positive integer')
      .toInt(),
    
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),
    
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 6, max: 100 }).withMessage('Password must be between 6 and 100 characters'),
    
    validate
  ],

  /**
   * Validate password reset
   */
  resetPassword: [
    param('id')
      .isInt({ min: 1 }).withMessage('Driver ID must be a positive integer')
      .toInt(),
    
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 6, max: 100 }).withMessage('Password must be between 6 and 100 characters'),
    
    validate
  ],

  /**
   * Validate driver update
   */
  update: [
    param('id')
      .isInt({ min: 1 }).withMessage('Driver ID must be a positive integer')
      .toInt(),
    
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    
    body('phone')
      .optional()
      .trim()
      .isMobilePhone('any').withMessage('Invalid phone number'),
    
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    
    body('status')
      .optional()
      .isIn(['active', 'online', 'offline', 'suspended']).withMessage('Invalid status'),
    
    validate
  ],

  /**
   * Validate driver ID parameter
   */
  driverId: [
    param('id')
      .isInt({ min: 1 }).withMessage('Driver ID must be a positive integer')
      .toInt(),
    validate
  ]
};

// ============================================
// PAYMENT VALIDATORS
// ============================================

const paymentValidators = {
  /**
   * Validate payment processing
   */
  process: [
    body('requestId')
      .notEmpty().withMessage('Request ID is required')
      .isInt({ min: 1 }).withMessage('Request ID must be a positive integer')
      .toInt(),
    
    body('amount')
      .optional()
      .isFloat({ min: 0, max: 10000 }).withMessage('Amount must be between 0 and 10000')
      .toFloat(),
    
    body('tipAmount')
      .optional()
      .isFloat({ min: 0, max: 1000 }).withMessage('Tip must be between 0 and 1000')
      .toFloat(),
    
    body('paymentMethod')
      .optional()
      .isIn(['cash', 'card', 'online']).withMessage('Invalid payment method'),
    
    validate
  ],

  /**
   * Validate pricing update
   */
  updatePricing: [
    body('base_fee')
      .optional()
      .isFloat({ min: 0, max: 1000 }).withMessage('Base fee must be between 0 and 1000')
      .toFloat(),
    
    body('base_valet_fee')
      .optional()
      .isFloat({ min: 0, max: 1000 }).withMessage('Base valet fee must be between 0 and 1000')
      .toFloat(),
    
    body('priority_fee')
      .optional()
      .isFloat({ min: 0, max: 500 }).withMessage('Priority fee must be between 0 and 500')
      .toFloat(),
    
    body('hourly_rate')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Hourly rate must be between 0 and 100')
      .toFloat(),
    
    body('surge_multiplier')
      .optional()
      .isFloat({ min: 1, max: 5 }).withMessage('Surge multiplier must be between 1 and 5')
      .toFloat(),
    
    body('surge_enabled')
      .optional()
      .isBoolean().withMessage('surge_enabled must be a boolean')
      .toBoolean(),
    
    validate
  ],

  /**
   * Validate card ID for fee calculation
   */
  calculateFee: [
    param('cardId')
      .trim()
      .notEmpty().withMessage('Card ID is required'),
    
    query('isPriority')
      .optional()
      .isBoolean().withMessage('isPriority must be a boolean'),
    
    validate
  ]
};

// ============================================
// STATION VALIDATORS
// ============================================

const stationValidators = {
  /**
   * Validate date range query
   */
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601().withMessage('startDate must be a valid date (YYYY-MM-DD)'),
    
    query('endDate')
      .optional()
      .isISO8601().withMessage('endDate must be a valid date (YYYY-MM-DD)'),
    
    validate
  ],

  /**
   * Validate cash collection at station
   */
  collectCash: [
    param('requestId')
      .isInt({ min: 1 }).withMessage('Request ID must be a positive integer')
      .toInt(),
    
    body('amount')
      .optional()
      .isFloat({ min: 0, max: 10000 }).withMessage('Amount must be between 0 and 10000')
      .toFloat(),
    
    body('collectedBy')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Collector name must be less than 100 characters'),
    
    validate
  ],

  /**
   * Validate day closeout
   */
  closeout: [
    body('closedBy')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Closer name must be less than 100 characters'),
    
    validate
  ]
};

// ============================================
// HOOK VALIDATORS
// ============================================

const hookValidators = {
  /**
   * Validate hook reservation
   */
  reserve: [
    body('hook_number')
      .notEmpty().withMessage('Hook number is required')
      .isInt({ min: 1, max: 200 }).withMessage('Hook number must be between 1 and 200')
      .toInt(),
    
    body('card_id')
      .trim()
      .notEmpty().withMessage('Card ID is required')
      .isLength({ max: 100 }).withMessage('Card ID must be less than 100 characters'),
    
    validate
  ],

  /**
   * Validate hook release
   */
  release: [
    body('hook_number')
      .notEmpty().withMessage('Hook number is required')
      .isInt({ min: 1, max: 200 }).withMessage('Hook number must be between 1 and 200')
      .toInt(),
    
    validate
  ]
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  validate,
  validateId,
  validatePagination,
  sanitizeString,
  requiredString,
  optionalString,
  vehicle: vehicleValidators,
  retrieval: retrievalValidators,
  driver: driverValidators,
  payment: paymentValidators,
  station: stationValidators,
  hook: hookValidators
};
