const inventoryService = require('../services/inventory.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');
const { writeAudit } = require('../utils/audit');
const v = require('../utils/validate');

const create = asyncHandler(async (req, res) => {
  v.validateCreateInventory(req.body);
  const { warehouseId, productId, quantity, reorderPoint } = req.body;
  const item = await inventoryService.create({ warehouseId, productId, quantity, reorderPoint }, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'CREATE_INVENTORY', tableName: 'inventory_items', recordId: item.id, newValues: { warehouseId, productId, quantity, reorderPoint }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.status(201).json({ success: true, data: item });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, warehouseId, productId, lowStock } = req.query;
  const result = await inventoryService.list(
    { page: +page || 1, limit: +limit || 20, warehouseId, productId, lowStock: lowStock === 'true' },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const item = await inventoryService.getById(req.params.id, buildScope(req.user));
  res.json({ success: true, data: item });
});

const adjust = asyncHandler(async (req, res) => {
  v.validateAdjustStock(req.body);
  const { quantity, reason } = req.body;
  const item = await inventoryService.adjust(req.params.id, { quantity, reason }, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'ADJUST_STOCK', tableName: 'inventory_items', recordId: req.params.id, newValues: { quantity, reason }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: item });
});

module.exports = { create, list, getById, adjust };
