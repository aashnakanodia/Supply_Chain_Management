const db = require('../config/database');
const AppError = require('../utils/AppError');
const bus = require('../utils/eventBus');

function _applyScope(scope, params, where) {
  // warehouse_staff see only alerts for their warehouse (or global alerts without a warehouse)
  if (scope.role === 'warehouse_staff') {
    params.push(scope.warehouseId);
    where.push(`(a.warehouse_id = $${params.length} OR a.warehouse_id IS NULL)`);
  }
  // suppliers see only system-level alerts with no warehouse filter
  if (scope.role === 'supplier') {
    where.push(`a.warehouse_id IS NULL`);
  }
}

async function list({ page = 1, limit = 20, type, severity, isResolved, warehouseId } = {}, scope) {
  const params = [];
  const where  = ['1=1'];

  _applyScope(scope, params, where);

  if (type)       { params.push(type);       where.push(`a.type = $${params.length}`); }
  if (severity)   { params.push(severity);   where.push(`a.severity = $${params.length}`); }
  if (isResolved !== undefined) { params.push(isResolved); where.push(`a.is_resolved = $${params.length}`); }
  if (warehouseId && scope.role !== 'warehouse_staff') {
    params.push(warehouseId);
    where.push(`a.warehouse_id = $${params.length}`);
  }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT a.id, a.type, a.severity, a.title, a.message, a.warehouse_id, a.product_id,
            a.is_read, a.is_resolved, a.created_at,
            w.name AS warehouse_name,
            p.name AS product_name
     FROM alerts a
     LEFT JOIN warehouses w ON w.id = a.warehouse_id
     LEFT JOIN products   p ON p.id = a.product_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*)
     FROM alerts a
     LEFT JOIN warehouses w ON w.id = a.warehouse_id
     LEFT JOIN products   p ON p.id = a.product_id
     WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { alerts: rows, total: parseInt(count, 10), page, limit };
}

async function create({ type, severity, title, message, warehouseId, productId }, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `INSERT INTO alerts (type, severity, title, message, warehouse_id, product_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [type, severity || 'medium', title, message, warehouseId || null, productId || null],
  );
  const alert = rows[0];
  bus.emit('NEW_ALERT', { alertId: alert.id, type: alert.type, severity: alert.severity, title: alert.title, warehouseId: alert.warehouse_id, productId: alert.product_id });
  return alert;
}

async function markRead(id, scope) {
  const { rows } = await db.query(
    `UPDATE alerts SET is_read = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id, warehouse_id`,
    [id],
  );
  const alert = rows[0];
  if (!alert) throw new AppError('Alert not found', 404, 'NOT_FOUND');
  if (scope.role === 'warehouse_staff' && alert.warehouse_id && alert.warehouse_id !== scope.warehouseId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  return alert;
}

async function resolve(id, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager' && scope.role !== 'warehouse_staff') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const { rows } = await db.query(
    `UPDATE alerts SET is_resolved = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id, warehouse_id`,
    [id],
  );
  const alert = rows[0];
  if (!alert) throw new AppError('Alert not found', 404, 'NOT_FOUND');
  if (scope.role === 'warehouse_staff' && alert.warehouse_id && alert.warehouse_id !== scope.warehouseId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  bus.emit('ALERT_RESOLVED', { alertId: id, warehouseId: alert.warehouse_id });
  return alert;
}

module.exports = { list, create, markRead, resolve };
