const productsService = require('../services/products.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');
const { writeAudit } = require('../utils/audit');
const v = require('../utils/validate');

const list = asyncHandler(async (req, res) => {
  const { page, limit, category, search, isActive } = req.query;
  const result = await productsService.list({
    page: +page || 1, limit: +limit || 20, category, search,
    isActive: isActive === 'false' ? false : true,
  });
  res.json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const product = await productsService.getById(req.params.id);
  res.json({ success: true, data: product });
});

const create = asyncHandler(async (req, res) => {
  v.validateCreateProduct(req.body);
  const product = await productsService.create(req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'CREATE_PRODUCT', tableName: 'products', recordId: product.id, newValues: product, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.status(201).json({ success: true, data: product });
});

const update = asyncHandler(async (req, res) => {
  v.validateUpdateProduct(req.body);
  const product = await productsService.update(req.params.id, req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'UPDATE_PRODUCT', tableName: 'products', recordId: req.params.id, newValues: product, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: product });
});

const remove = asyncHandler(async (req, res) => {
  const result = await productsService.remove(req.params.id, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'DELETE_PRODUCT', tableName: 'products', recordId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: result });
});

const reactivate = asyncHandler(async (req, res) => {
  const result = await productsService.reactivate(req.params.id, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'REACTIVATE_PRODUCT', tableName: 'products', recordId: req.params.id, newValues: result, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: result });
});

module.exports = { list, getById, create, update, remove, reactivate };
