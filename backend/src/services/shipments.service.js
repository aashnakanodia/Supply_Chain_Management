const db = require('../config/database');
const AppError = require('../utils/AppError');
const bus = require('../utils/eventBus');

function _applyScope(scope, params, where) {
  if (scope.role === 'warehouse_staff') {
    params.push(scope.warehouseId);
    where.push(`s.warehouse_id = $${params.length}`);
  } else if (scope.role === 'supplier') {
    // Suppliers see shipments tied to their purchase orders
    params.push(scope.supplierId);
    where.push(`po.supplier_id = $${params.length}`);
  }
}

function _nextShipmentNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  return `SHP-${ts}`;
}

async function list({ page = 1, limit = 20, status, warehouseId, purchaseOrderId } = {}, scope) {
  const params = [];
  const where  = ['1=1'];

  _applyScope(scope, params, where);

  if (status)          { params.push(status);          where.push(`s.status = $${params.length}`); }
  if (purchaseOrderId) { params.push(purchaseOrderId); where.push(`s.purchase_order_id = $${params.length}`); }
  if (warehouseId && scope.role !== 'warehouse_staff') {
    params.push(warehouseId);
    where.push(`s.warehouse_id = $${params.length}`);
  }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const supplierJoin = scope.role === 'supplier'
    ? `JOIN purchase_orders po ON po.id = s.purchase_order_id`
    : `LEFT JOIN purchase_orders po ON po.id = s.purchase_order_id`;

  const { rows } = await db.query(
    `SELECT s.id, s.shipment_number, s.status, s.carrier, s.tracking_number,
            s.shipped_date, s.expected_arrival, s.actual_arrival, s.created_at,
            w.name AS warehouse_name,
            po.po_number
     FROM shipments s
     JOIN warehouses w ON w.id = s.warehouse_id
     ${supplierJoin}
     WHERE ${where.join(' AND ')}
     ORDER BY s.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*)
     FROM shipments s
     JOIN warehouses w ON w.id = s.warehouse_id
     ${supplierJoin}
     WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { shipments: rows, total: parseInt(count, 10), page, limit };
}

async function getById(id, scope) {
  const { rows } = await db.query(
    `SELECT s.*, w.name AS warehouse_name, po.po_number, po.supplier_id
     FROM shipments s
     JOIN warehouses w        ON w.id = s.warehouse_id
     JOIN purchase_orders po  ON po.id = s.purchase_order_id
     WHERE s.id = $1`,
    [id],
  );
  const shipment = rows[0];
  if (!shipment) throw new AppError('Shipment not found', 404, 'NOT_FOUND');

  if (scope.role === 'warehouse_staff' && shipment.warehouse_id !== scope.warehouseId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (scope.role === 'supplier' && shipment.supplier_id !== scope.supplierId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  return shipment;
}

async function create({ purchaseOrderId, warehouseId, carrier, trackingNumber, shippedDate, expectedArrival, notes }, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager' && scope.role !== 'warehouse_staff') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  if (scope.role === 'warehouse_staff') {
    warehouseId = scope.warehouseId; // always override with scoped value
  }

  const { rows } = await db.query(
    `INSERT INTO shipments (shipment_number, purchase_order_id, warehouse_id, carrier, tracking_number, shipped_date, expected_arrival, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [_nextShipmentNumber(), purchaseOrderId, warehouseId, carrier || null, trackingNumber || null,
     shippedDate || null, expectedArrival || null, notes || null],
  );
  return rows[0];
}

async function updateStatus(id, { status, actualArrival, notes }, scope) {
  if (scope.role !== 'admin' && scope.role !== 'procurement_manager' && scope.role !== 'warehouse_staff') {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  const shipment = await getById(id, scope); // enforces scope

  const { rows } = await db.query(
    `UPDATE shipments
     SET status         = COALESCE($1, status),
         actual_arrival = COALESCE($2, actual_arrival),
         notes          = COALESCE($3, notes),
         updated_at     = NOW()
     WHERE id = $4
     RETURNING *`,
    [status || null, actualArrival || null, notes || null, id],
  );
  const updated = rows[0];
  bus.emit('SHIPMENT_STATUS_CHANGED', {
    shipmentId:     updated.id,
    shipmentNumber: updated.shipment_number,
    status:         updated.status,
    warehouseId:    updated.warehouse_id,
    supplierId:     shipment.supplier_id,
  });
  return updated;
}

module.exports = { list, getById, create, updateStatus };
