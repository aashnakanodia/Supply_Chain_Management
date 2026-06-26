const db = require('../config/database');
const AppError = require('../utils/AppError');

function _enforceSupplierScope(scope, id) {
  if (scope.role === 'supplier' && scope.supplierId !== id) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
}

async function list({ page = 1, limit = 20, search, isActive = true } = {}, scope) {
  const params = [];
  const where  = ['1=1'];

  if (isActive !== undefined) { params.push(isActive); where.push(`is_active = $${params.length}`); }
  if (search) { params.push(`%${search}%`); where.push(`name ILIKE $${params.length}`); }

  // Supplier-role users see only their own record
  if (scope.role === 'supplier') {
    params.push(scope.supplierId);
    where.push(`id = $${params.length}`);
  }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT id, name, contact_name, email, phone, city, country, payment_terms, lead_time_days, is_active, created_at
     FROM suppliers
     WHERE ${where.join(' AND ')}
     ORDER BY name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM suppliers WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { suppliers: rows, total: parseInt(count, 10), page, limit };
}

async function getById(id, scope) {
  _enforceSupplierScope(scope, id);

  const { rows } = await db.query('SELECT * FROM suppliers WHERE id = $1', [id]);
  if (!rows[0]) throw new AppError('Supplier not found', 404, 'NOT_FOUND');
  return rows[0];
}

async function create(fields, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `INSERT INTO suppliers (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [fields.name, fields.contactName || null, fields.email || null, fields.phone || null,
     fields.address || null, fields.city || null, fields.country || null,
     fields.paymentTerms || null, fields.leadTimeDays ?? 0],
  );
  return rows[0];
}

async function update(id, fields, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager' && scope.supplierId !== id) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `UPDATE suppliers
     SET name           = COALESCE($1, name),
         contact_name   = COALESCE($2, contact_name),
         email          = COALESCE($3, email),
         phone          = COALESCE($4, phone),
         address        = COALESCE($5, address),
         city           = COALESCE($6, city),
         country        = COALESCE($7, country),
         payment_terms  = COALESCE($8, payment_terms),
         lead_time_days = COALESCE($9, lead_time_days),
         updated_at     = NOW()
     WHERE id = $10
     RETURNING *`,
    [fields.name || null, fields.contactName || null, fields.email || null, fields.phone || null,
     fields.address || null, fields.city || null, fields.country || null,
     fields.paymentTerms || null, fields.leadTimeDays ?? null, id],
  );
  if (!rows[0]) throw new AppError('Supplier not found', 404, 'NOT_FOUND');
  return rows[0];
}

// Supplier products (catalogue)
async function listProducts(supplierId, scope) {
  _enforceSupplierScope(scope, supplierId);

  const { rows } = await db.query(
    `SELECT sp.*, p.sku, p.name AS product_name, p.unit
     FROM supplier_products sp
     JOIN products p ON p.id = sp.product_id
     WHERE sp.supplier_id = $1
     ORDER BY p.name`,
    [supplierId],
  );
  return rows;
}

async function upsertProduct(supplierId, productId, fields, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `INSERT INTO supplier_products (supplier_id, product_id, unit_price, lead_time_days, min_order_qty, is_preferred)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (supplier_id, product_id)
     DO UPDATE SET unit_price     = EXCLUDED.unit_price,
                   lead_time_days = EXCLUDED.lead_time_days,
                   min_order_qty  = EXCLUDED.min_order_qty,
                   is_preferred   = EXCLUDED.is_preferred,
                   updated_at     = NOW()
     RETURNING *`,
    [supplierId, productId, fields.unitPrice, fields.leadTimeDays ?? 0,
     fields.minOrderQty ?? 1, fields.isPreferred ?? false],
  );
  return rows[0];
}

module.exports = { list, getById, create, update, listProducts, upsertProduct };
