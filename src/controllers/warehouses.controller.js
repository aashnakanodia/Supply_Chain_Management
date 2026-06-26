const warehousesService = require('../services/warehouses.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');
const { writeAudit } = require('../utils/audit');
const v = require('../utils/validate');

const list = asyncHandler(async (req, res) => {
  const { page, limit, isActive } = req.query;
  const result = await warehousesService.list(
    { page: +page || 1, limit: +limit || 20, isActive: isActive === 'false' ? false : true },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const warehouse = await warehousesService.getById(req.params.id, buildScope(req.user));
  res.json({ success: true, data: warehouse });
});

const create = asyncHandler(async (req, res) => {
  v.validateCreateWarehouse(req.body);
  const warehouse = await warehousesService.create(req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'CREATE_WAREHOUSE', tableName: 'warehouses', recordId: warehouse.id, newValues: warehouse, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.status(201).json({ success: true, data: warehouse });
});

const update = asyncHandler(async (req, res) => {
  v.validateUpdateWarehouse(req.body);
  const warehouse = await warehousesService.update(req.params.id, req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'UPDATE_WAREHOUSE', tableName: 'warehouses', recordId: req.params.id, newValues: warehouse, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: warehouse });
});

module.exports = { list, getById, create, update };
