const poService = require('../services/purchaseOrders.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');
const { writeAudit } = require('../utils/audit');
const v = require('../utils/validate');

const list = asyncHandler(async (req, res) => {
  const { page, limit, status, supplierId, warehouseId } = req.query;
  const result = await poService.list(
    { page: +page || 1, limit: +limit || 20, status, supplierId, warehouseId },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const po = await poService.getById(req.params.id, buildScope(req.user));
  res.json({ success: true, data: po });
});

const create = asyncHandler(async (req, res) => {
  v.validateCreatePO(req.body);
  const po = await poService.create(req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'CREATE_PO', tableName: 'purchase_orders', recordId: po.id, newValues: po, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.status(201).json({ success: true, data: po });
});

const approve = asyncHandler(async (req, res) => {
  const po = await poService.approve(req.params.id, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'APPROVE_PO', tableName: 'purchase_orders', recordId: req.params.id, newValues: { status: po.status }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: po });
});

const updateStatus = asyncHandler(async (req, res) => {
  v.validateUpdatePOStatus(req.body);
  const { status, notes } = req.body;
  const po = await poService.updateStatus(req.params.id, status, buildScope(req.user), notes);
  await writeAudit({ userId: req.user.id, action: 'UPDATE_PO_STATUS', tableName: 'purchase_orders', recordId: req.params.id, newValues: { status }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: po });
});

module.exports = { list, getById, create, approve, updateStatus };
