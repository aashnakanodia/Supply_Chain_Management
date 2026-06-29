const stockMovementsService = require('../services/stockMovements.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');

const list = asyncHandler(async (req, res) => {
  const { page, limit, warehouseId, productId, movementType, referenceType } = req.query;
  const result = await stockMovementsService.list(
    { page: +page || 1, limit: +limit || 20, warehouseId, productId, movementType, referenceType },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

module.exports = { list };
