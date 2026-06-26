const AppError = require('../utils/AppError');

/**
 * Permission matrix.
 * 'admin' uses '*' wildcard — all permissions granted.
 * All other roles list explicit permissions.
 */
const ROLE_PERMISSIONS = {
  admin: ['*'],

  procurement_manager: [
    'products:read', 'products:write',
    'suppliers:read', 'suppliers:write',
    'warehouses:read', 'warehouses:write',
    'supplier_products:read', 'supplier_products:write',
    'purchase_orders:read', 'purchase_orders:write', 'purchase_orders:approve',
    'purchase_order_items:read', 'purchase_order_items:write',
    'shipments:read', 'shipments:write',
    'inventory:read',
    'stock_movements:read',
    'users:read', 'users:write',
    'alerts:read', 'alerts:write',
    'dashboard:read',
    'chat:read', 'chat:write',
  ],

  warehouse_staff: [
    'inventory:read', 'inventory:write',
    'stock_movements:read', 'stock_movements:write',
    'shipments:read', 'shipments:write',
    'alerts:read',
    'products:read',
    'warehouses:read',
    'purchase_orders:read',
    'purchase_order_items:read',
    'dashboard:read',
    'chat:read', 'chat:write',
  ],

  supplier: [
    'suppliers:read',
    'supplier_products:read',
    'purchase_orders:read',
    'purchase_order_items:read',
    'shipments:read',
    'products:read',
    'chat:read', 'chat:write',
  ],

  viewer: [
    'products:read',
    'inventory:read',
    'stock_movements:read',
    'warehouses:read',
    'suppliers:read',
    'supplier_products:read',
    'purchase_orders:read',
    'purchase_order_items:read',
    'shipments:read',
    'alerts:read',
    'dashboard:read',
    'chat:read', 'chat:write',
  ],
};

/**
 * Returns an Express middleware that checks if the authenticated user holds
 * the specified permission.  Must be used AFTER authenticate middleware.
 *
 * @param {string} permission - e.g. 'inventory:write'
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const { role } = req.user;
    const allowed = ROLE_PERMISSIONS[role];

    if (!allowed) {
      return next(new AppError('Unknown role', 403, 'FORBIDDEN'));
    }

    if (allowed.includes('*') || allowed.includes(permission)) {
      return next();
    }

    next(new AppError(
      `Role '${role}' does not have permission '${permission}'`,
      403,
      'FORBIDDEN',
    ));
  };
}

/**
 * Allows only the listed roles through.
 * Simpler alternative to requirePermission for coarse-grained checks.
 *
 * @param {...string} roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(
        `Access restricted to: ${roles.join(', ')}`,
        403,
        'FORBIDDEN',
      ));
    }
    next();
  };
}

module.exports = { requirePermission, requireRole, ROLE_PERMISSIONS };
