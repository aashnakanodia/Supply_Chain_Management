const db = require('../config/database');
const AppError = require('../utils/AppError');

async function list({ page = 1, limit = 20, category, search, isActive = true } = {}) {
  const params = [];
  const where = ['1=1'];

  if (isActive !== undefined) { params.push(isActive); where.push(`is_active = $${params.length}`); }
  if (category) { params.push(category); where.push(`category = $${params.length}`); }
  if (search)   { params.push(`%${search}%`); where.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length})`); }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT id, sku, name, description, category, unit, unit_price, reorder_level, lead_time_days, is_active, created_at
     FROM products
     WHERE ${where.join(' AND ')}
     ORDER BY name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM products WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { products: rows, total: parseInt(count, 10), page, limit };
}

async function getById(id) {
  const { rows } = await db.query(
    `SELECT id, sku, name, description, category, unit, unit_price, reorder_level, lead_time_days, is_active, created_at, updated_at
     FROM products WHERE id = $1`,
    [id],
  );
  if (!rows[0]) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return rows[0];
}

async function create({ sku, name, description, category, unit, unitPrice, reorderLevel, leadTimeDays }, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `INSERT INTO products (sku, name, description, category, unit, unit_price, reorder_level, lead_time_days)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [sku, name, description || null, category || null, unit || 'piece', unitPrice ?? 0, reorderLevel ?? 0, leadTimeDays ?? 0],
  );
  return rows[0];
}

async function update(id, fields, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `UPDATE products
     SET name           = COALESCE($1, name),
         description    = COALESCE($2, description),
         category       = COALESCE($3, category),
         unit           = COALESCE($4, unit),
         unit_price     = COALESCE($5, unit_price),
         reorder_level  = COALESCE($6, reorder_level),
         lead_time_days = COALESCE($7, lead_time_days),
         updated_at     = NOW()
     WHERE id = $8
     RETURNING *`,
    [fields.name || null, fields.description || null, fields.category || null,
     fields.unit || null, fields.unitPrice ?? null, fields.reorderLevel ?? null,
     fields.leadTimeDays ?? null, id],
  );
  if (!rows[0]) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return rows[0];
}

async function remove(id, scope) {
  if (scope.role !== 'admin') throw new AppError('Access denied', 403, 'FORBIDDEN');
  const { rows } = await db.query(
    `UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [id],
  );
  if (!rows[0]) throw new AppError('Product not found', 404, 'NOT_FOUND');
  return { id };
}

module.exports = { list, getById, create, update, remove };
