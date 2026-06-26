const db = require('../config/database');

async function getSummary(scope) {
  const isWarehouseStaff = scope.role === 'warehouse_staff';
  const whId = isWarehouseStaff ? scope.warehouseId : null;

  const whFilter      = whId ? 'AND warehouse_id = $1'                                  : '';
  const smWhFilter    = whId ? 'AND sm.warehouse_id = $1'                               : '';
  const alertWhFilter = whId ? 'AND (a.warehouse_id = $1 OR a.warehouse_id IS NULL)'    : '';
  const p             = whId ? [whId] : [];

  const [products, lowStock, pendingPOs, openAlerts, inTransit, recentMovements, warehouses] =
    await Promise.all([
      db.query(`SELECT COUNT(*) FROM products WHERE is_active = TRUE`),

      db.query(
        `SELECT COUNT(*) FROM inventory_items WHERE quantity <= reorder_point ${whFilter}`, p,
      ),

      db.query(
        `SELECT COUNT(*), COALESCE(SUM(total_amount), 0) AS total_value
         FROM purchase_orders WHERE status = 'pending' ${whFilter}`, p,
      ),

      db.query(
        `SELECT severity, COUNT(*) FROM alerts a
         WHERE is_resolved = FALSE ${alertWhFilter}
         GROUP BY severity`, p,
      ),

      db.query(
        `SELECT COUNT(*) FROM shipments WHERE status = 'in_transit' ${whFilter}`, p,
      ),

      db.query(
        `SELECT sm.movement_type, sm.quantity, sm.created_at,
                p.name AS product_name, w.name AS warehouse_name
         FROM stock_movements sm
         JOIN products   p ON p.id = sm.product_id
         JOIN warehouses w ON w.id = sm.warehouse_id
         WHERE 1=1 ${smWhFilter}
         ORDER BY sm.created_at DESC LIMIT 5`, p,
      ),

      isWarehouseStaff
        ? Promise.resolve({ rows: [] })
        : db.query(`SELECT COUNT(*) FROM warehouses WHERE is_active = TRUE`),
    ]);

  const alertsBySeverity = {};
  for (const row of openAlerts.rows) {
    alertsBySeverity[row.severity] = parseInt(row.count, 10);
  }

  return {
    products:  { total: parseInt(products.rows[0].count, 10) },
    inventory: { lowStockItems: parseInt(lowStock.rows[0].count, 10) },
    purchaseOrders: {
      pendingCount: parseInt(pendingPOs.rows[0].count, 10),
      pendingValue: parseFloat(pendingPOs.rows[0].total_value),
    },
    alerts: {
      openTotal: Object.values(alertsBySeverity).reduce((a, b) => a + b, 0),
      bySeverity: alertsBySeverity,
    },
    shipments: { inTransit: parseInt(inTransit.rows[0].count, 10) },
    ...(isWarehouseStaff ? {} : { warehouses: { total: parseInt(warehouses.rows[0].count, 10) } }),
    recentStockMovements: recentMovements.rows,
  };
}

module.exports = { getSummary };
