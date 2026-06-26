const auditLogsService = require('../services/auditLogs.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');

const list = asyncHandler(async (req, res) => {
  const { page, limit, userId, action, tableName, recordId } = req.query;
  const result = await auditLogsService.list(
    { page: +page || 1, limit: +limit || 50, userId, action, tableName, recordId },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

module.exports = { list };
