/**
 * Wraps an async route handler so unhandled promise rejections are forwarded
 * to Express's next(err) — eliminates try/catch boilerplate in controllers.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
