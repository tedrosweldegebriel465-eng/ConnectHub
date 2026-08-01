/**
 * ============================================
 * ERROR MIDDLEWARE
 * Version: 2.0.0
 * Description: Centralized error handling with
 *              detailed error responses and logging
 * ============================================
 */

const logger = require('../utils/logger');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode, code = 'API_ERROR') {
    super(message);
    this.statusCode = statusCode || 500;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // Log error
  logger.error(`Error: ${message}`, {
    statusCode,
    code,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // ===== Mongoose Errors =====

  // Duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyPattern)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // Validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    message = 'Validation failed';
    
    return res.status(statusCode).json({
      success: false,
      code,
      message,
      errors,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // CastError (invalid ID)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Document not found
  if (err.name === 'DocumentNotFoundError') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  }

  // ===== JWT Errors =====

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid or malformed token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired, please login again';
  }

  // ===== Multer Errors =====

  if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'UPLOAD_ERROR';
    
    switch (err.code) {
      case 'FILE_TOO_LARGE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = err.message || 'Upload error';
    }
  }

  // ===== Rate Limiting Errors =====

  if (err.name === 'RateLimitError') {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Too many requests, please try again later';
  }

  // ===== Custom API Errors =====

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  }

  // ===== Response =====

  const response = {
    success: false,
    code,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Add validation details if available
  if (err.errors) {
    response.errors = err.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }

  // Add rate limit info if available
  if (err.retryAfter) {
    response.retryAfter = err.retryAfter;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const error = new ApiError(
    `Cannot find ${req.method} ${req.url}`,
    404,
    'NOT_FOUND'
  );
  next(error);
};

/**
 * Async wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = (err) => {
  logger.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
};

/**
 * Handle unhandled rejections
 */
const handleUnhandledRejection = (err) => {
  logger.error('Unhandled Rejection:', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  ApiError,
  handleUncaughtException,
  handleUnhandledRejection,
};