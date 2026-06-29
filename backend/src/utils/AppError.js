class AppError extends Error {
  /**
   * @param {string} message - Human-readable description
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Machine-readable error code (e.g. 'INVALID_TOKEN')
   */
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || httpCodeToErrorCode(statusCode);
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function httpCodeToErrorCode(statusCode) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
  };
  return map[statusCode] || 'UNKNOWN_ERROR';
}

module.exports = AppError;
