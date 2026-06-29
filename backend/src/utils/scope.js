/**
 * Derives a data-scope object from the JWT-verified req.user.
 *
 * This is the single authoritative source of data scope for every service
 * call. Controllers ALWAYS pass scope from req.user — never from req.body,
 * req.query, or req.params — making user-supplied bypass attempts impossible.
 */
function buildScope(user) {
  return {
    userId:      user.id,
    role:        user.role,
    warehouseId: user.warehouse_id || null,
    supplierId:  user.supplier_id  || null,
  };
}

/**
 * Appends scope-enforced WHERE conditions and params.
 * Returns { conditions: string[], params: any[] } with params extended in place.
 *
 * @param {'warehouse_staff'|'supplier'|string} role
 * @param {{ warehouseId?: string, supplierId?: string }} scope
 * @param {any[]} params - Mutable params array (appended to in place)
 * @param {{ warehouseCol?: string, supplierCol?: string }} [cols]
 */
function applyScopeToQuery(scope, params, cols = {}) {
  const conditions = [];
  const warehouseCol = cols.warehouseCol || 'warehouse_id';
  const supplierCol  = cols.supplierCol  || 'supplier_id';

  if (scope.role === 'warehouse_staff') {
    params.push(scope.warehouseId);
    conditions.push(`${warehouseCol} = $${params.length}`);
  } else if (scope.role === 'supplier') {
    params.push(scope.supplierId);
    conditions.push(`${supplierCol} = $${params.length}`);
  }
  // admin, procurement_manager, viewer — no extra filter

  return conditions;
}

module.exports = { buildScope, applyScopeToQuery };
