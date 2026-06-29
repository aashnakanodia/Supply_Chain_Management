const db = require('../config/database');
const AppError = require('../utils/AppError');

async function list({ page = 1, limit = 20, isActive = true } = {}, scope) {
  const params = [];
  const where = ['1=1'];

  if (isActive !== undefined) { params.push(isActive); where.push(`w.is_active = $${params.length}`); }

  // warehouse_staff sees only their own warehouse
  if (scope.role === 'warehouse_staff') {
    params.push(scope.warehouseId);
    where.push(`w.id = $${params.length}`);
  }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT w.id, w.name, w.address, w.city, w.country, w.capacity, w.is_active,
            w.manager_id, u.first_name || ' ' || u.last_name AS manager_name,
            w.created_at
     FROM warehouses w
     LEFT JOIN users u ON u.id = w.manager_id
     WHERE ${where.join(' AND ')}
     ORDER BY w.name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM warehouses w WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { warehouses: rows, total: parseInt(count, 10), page, limit };
}

async function getById(id, scope) {
  if (scope.role === 'warehouse_staff' && scope.warehouseId !== id) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `SELECT w.*, u.first_name || ' ' || u.last_name AS manager_name
     FROM warehouses w
     LEFT JOIN users u ON u.id = w.manager_id
     WHERE w.id = $1`,
    [id],
  );
  if (!rows[0]) throw new AppError('Warehouse not found', 404, 'NOT_FOUND');
  return rows[0];
}

async function create({ name, address, city, country, capacity, managerId }, scope) {
  if (scope.role !== 'admin') throw new AppError('Access denied', 403, 'FORBIDDEN');

  const { rows } = await db.query(
    `INSERT INTO warehouses (name, address, city, country, capacity, manager_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, address || null, city || null, country || null, capacity || null, managerId || null],
  );
  return rows[0];
}

async function update(id, fields, scope) {
  if (scope.role !== 'admin') throw new AppError('Access denied', 403, 'FORBIDDEN');

  const { rows } = await db.query(
    `UPDATE warehouses
     SET name       = COALESCE($1, name),
         address    = COALESCE($2, address),
         city       = COALESCE($3, city),
         country    = COALESCE($4, country),
         capacity   = COALESCE($5, capacity),
         manager_id = COALESCE($6, manager_id),
         is_active  = COALESCE($7, is_active),
         updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [fields.name || null, fields.address || null, fields.city || null,
     fields.country || null, fields.capacity ?? null, fields.managerId || null,
     fields.isActive ?? null, id],
  );
  if (!rows[0]) throw new AppError('Warehouse not found', 404, 'NOT_FOUND');
  return rows[0];
}

module.exports = { list, getById, create, update };
