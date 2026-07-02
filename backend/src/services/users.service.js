const db = require('../config/database');
const AppError = require('../utils/AppError');

async function getById(id, scope) {
  // Non-admins can only fetch their own profile
  if (scope.role !== 'admin' && scope.userId !== id) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `SELECT id, email, first_name, last_name, role, warehouse_id, supplier_id,
            is_active, last_login_at, created_at, updated_at
     FROM users WHERE id = $1`,
    [id],
  );
  if (!rows[0]) throw new AppError('User not found', 404, 'NOT_FOUND');
  return rows[0];
}

async function list({ page = 1, limit = 20, role, isActive } = {}, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const params = [];
  const where = ['1=1'];
  if (role)     { params.push(role);     where.push(`u.role = $${params.length}`); }
  if (isActive !== undefined) { params.push(isActive); where.push(`u.is_active = $${params.length}`); }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT id, email, first_name, last_name, role, warehouse_id, supplier_id,
            is_active, last_login_at, created_at
     FROM users u
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM users u WHERE ${where.slice(0, params.length - 2 + 1).join(' AND ')}`,
    params.slice(0, params.length - 2),
  );

  return { users: rows, total: parseInt(count, 10), page, limit };
}

async function updateProfile(id, { firstName, lastName }, scope) {
  if (scope.role !== 'admin' && scope.userId !== id) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `UPDATE users SET first_name = COALESCE($1, first_name),
                      last_name  = COALESCE($2, last_name),
                      updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, first_name, last_name, role, warehouse_id, supplier_id, updated_at`,
    [firstName || null, lastName || null, id],
  );
  if (!rows[0]) throw new AppError('User not found', 404, 'NOT_FOUND');
  return rows[0];
}

async function setActive(id, isActive, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (scope.userId === id) throw new AppError('Cannot deactivate your own account', 422);

  const { rows } = await db.query(
    `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, email, is_active`,
    [isActive, id],
  );
  if (!rows[0]) throw new AppError('User not found', 404, 'NOT_FOUND');
  return rows[0];
}

async function changeRole(id, role, { warehouseId, supplierId } = {}, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (scope.userId === id) throw new AppError('Cannot change your own role', 422);

  // Clear the foreign-key that no longer applies; set the one that does.
  // DB constraints enforce: warehouse_staff requires warehouse_id, supplier requires supplier_id.
  const { rows } = await db.query(
    `UPDATE users
     SET role         = $1,
         warehouse_id = CASE WHEN $1 = 'warehouse_staff' THEN $2::uuid ELSE NULL END,
         supplier_id  = CASE WHEN $1 = 'supplier'        THEN $3::uuid ELSE NULL END,
         updated_at   = NOW()
     WHERE id = $4
     RETURNING id, email, role, warehouse_id, supplier_id`,
    [role, warehouseId || null, supplierId || null, id],
  );
  if (!rows[0]) throw new AppError('User not found', 404, 'NOT_FOUND');
  return rows[0];
}

module.exports = { getById, list, updateProfile, setActive, changeRole };
