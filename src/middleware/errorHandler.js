const AppError = require('../utils/AppError');

/**
 * Formats any thrown error into the canonical API response shape:
 *   { success: false, error: { message, code } }
 *
 * Operational errors (AppError) expose their message.
 * Unexpected errors log the stack and return a generic 500.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // pg unique-violation → 409
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: { message: 'A record with that value already exists', code: 'CONFLICT' },
    });
  }

  // pg foreign-key violation → 422
  if (err.code === '23503') {
    return res.status(422).json({
      success: false,
      error: { message: 'Referenced record does not exist', code: 'FOREIGN_KEY_VIOLATION' },
    });
  }

  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code:    err.code,
      },
    });
  }

  // Unexpected / programming error — never leak internals
  console.error('[error]', err);
  return res.status(500).json({
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code:    'INTERNAL_SERVER_ERROR',
    },
  });
}

module.exports = errorHandler;
