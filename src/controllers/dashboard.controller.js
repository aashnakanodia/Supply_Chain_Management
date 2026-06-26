const dashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getSummary(buildScope(req.user));
  res.json({ success: true, data: summary });
});

module.exports = { getSummary };
