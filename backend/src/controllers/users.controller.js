const usersService = require('../services/users.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');
const { writeAudit } = require('../utils/audit');
const v = require('../utils/validate');

const list = asyncHandler(async (req, res) => {
  const { page, limit, role, isActive } = req.query;
  const result = await usersService.list(
    { page: +page || 1, limit: +limit || 20, role, isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const user = await usersService.getById(req.params.id, buildScope(req.user));
  res.json({ success: true, data: user });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getById(req.user.id, buildScope(req.user));
  res.json({ success: true, data: user });
});

const updateProfile = asyncHandler(async (req, res) => {
  v.validateUpdateProfile(req.body);
  const { firstName, lastName } = req.body;
  const user = await usersService.updateProfile(req.params.id, { firstName, lastName }, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'UPDATE_PROFILE', tableName: 'users', recordId: req.params.id, newValues: { firstName, lastName }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: user });
});

const setActive = asyncHandler(async (req, res) => {
  v.validateSetActive(req.body);
  const { isActive } = req.body;
  const user = await usersService.setActive(req.params.id, isActive, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', tableName: 'users', recordId: req.params.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: user });
});

const changeRole = asyncHandler(async (req, res) => {
  v.validateChangeRole(req.body);
  const { role } = req.body;
  const user = await usersService.changeRole(req.params.id, role, buildScope(req.user));
  await writeAudit({ userId: req.user.id, action: 'CHANGE_ROLE', tableName: 'users', recordId: req.params.id, newValues: { role }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: user });
});

module.exports = { list, getById, getMe, updateProfile, setActive, changeRole };
