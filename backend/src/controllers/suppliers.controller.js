const suppliersService = require('../services/suppliers.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');
const { writeAudit } = require('../utils/audit');
const v = require('../utils/validate');

const list = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.query;
  const result = await suppliersService.list(
    { page: +page || 1, limit: +limit || 20, search, isActive: isActive === 'false' ? false : true },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const supplier = await suppliersService.getById(req.params.id, buildScope(req.user));
  res.json({ success: true, data: supplier });
});

const create = asyncHandler(async (req, res) => {
  v.validateCreateSupplier(req.body);
  const supplier = await suppliersService.create(req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'CREATE_SUPPLIER', tableName: 'suppliers', recordId: supplier.id, newValues: supplier, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.status(201).json({ success: true, data: supplier });
});

const update = asyncHandler(async (req, res) => {
  v.validateUpdateSupplier(req.body);
  const supplier = await suppliersService.update(req.params.id, req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'UPDATE_SUPPLIER', tableName: 'suppliers', recordId: req.params.id, newValues: supplier, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: supplier });
});

const listProducts = asyncHandler(async (req, res) => {
  const products = await suppliersService.listProducts(req.params.id, buildScope(req.user));
  res.json({ success: true, data: products });
});

const upsertProduct = asyncHandler(async (req, res) => {
  const result = await suppliersService.upsertProduct(
    req.params.id, req.params.productId, req.body, buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

module.exports = { list, getById, create, update, listProducts, upsertProduct };
