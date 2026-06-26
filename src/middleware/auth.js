const { verifyAccessToken } = require('../utils/tokens');
const AppError = require('../utils/AppError');

/**
 * Verifies the Bearer token and attaches req.user.
 * req.user = { id, email, role, warehouse_id, supplier_id }
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authorization header missing or malformed', 401, 'MISSING_TOKEN'));
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token); // throws AppError on failure
  req.user = payload;
  next();
}

/**
 * Optional auth — attaches req.user if token present, does not fail if absent.
 * Useful for routes that serve both public and authenticated views.
 */
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(authHeader.slice(7));
    } catch {
      // ignore — treat as unauthenticated
    }
  }
  next();
}

module.exports = { authenticate, optionalAuthenticate };
