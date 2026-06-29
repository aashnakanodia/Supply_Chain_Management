const alertsService = require('../services/alerts.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');
const { writeAudit } = require('../utils/audit');
const v = require('../utils/validate');

const list = asyncHandler(async (req, res) => {
  const { page, limit, type, severity, isResolved, warehouseId } = req.query;
  const result = await alertsService.list(
    { page: +page || 1, limit: +limit || 20, type, severity, warehouseId,
      isResolved: isResolved === 'true' ? true : isResolved === 'false' ? false : undefined },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

const create = asyncHandler(async (req, res) => {
  v.validateCreateAlert(req.body);
  const alert = await alertsService.create(req.body, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'CREATE_ALERT', tableName: 'alerts', recordId: alert.id, newValues: alert, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.status(201).json({ success: true, data: alert });
});

const markRead = asyncHandler(async (req, res) => {
  const alert = await alertsService.markRead(req.params.id, buildScope(req.user));
  res.json({ success: true, data: alert });
});

const resolve = asyncHandler(async (req, res) => {
  const alert = await alertsService.resolve(req.params.id, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'RESOLVE_ALERT', tableName: 'alerts', recordId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: alert });
});

module.exports = { list, create, markRead, resolve };
