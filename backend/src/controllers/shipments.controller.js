const shipmentsService = require('../services/shipments.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');
const { writeAudit } = require('../utils/audit');
const v = require('../utils/validate');

const list = asyncHandler(async (req, res) => {
  const { page, limit, status, warehouseId, purchaseOrderId } = req.query;
  const result = await shipmentsService.list(
    { page: +page || 1, limit: +limit || 20, status, warehouseId, purchaseOrderId },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const shipment = await shipmentsService.getById(req.params.id, buildScope(req.user));
  res.json({ success: true, data: shipment });
});

const create = asyncHandler(async (req, res) => {
  v.validateCreateShipment(req.body);
  const shipment = await shipmentsService.create(req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'CREATE_SHIPMENT', tableName: 'shipments', recordId: shipment.id, newValues: shipment, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.status(201).json({ success: true, data: shipment });
});

const updateStatus = asyncHandler(async (req, res) => {
  v.validateUpdateShipmentStatus(req.body);
  const shipment = await shipmentsService.updateStatus(req.params.id, req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'UPDATE_SHIPMENT_STATUS', tableName: 'shipments', recordId: req.params.id, newValues: { status: req.body.status }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: shipment });
});

module.exports = { list, getById, create, updateStatus };
