const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');
const v = require('../utils/validate');

const register = asyncHandler(async (req, res) => {
  v.validateRegister(req.body);
  const { email, password, firstName, lastName, role, warehouseId, supplierId } = req.body;
  const user = await authService.register({ email, password, firstName, lastName, role, warehouseId, supplierId });
  await writeAudit({ action: 'REGISTER', tableName: 'users', recordId: user.id, newValues: { email, role }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.status(201).json({ success: true, data: user });
});

const login = asyncHandler(async (req, res) => {
  v.validateLogin(req.body);
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  await writeAudit({ userId: result.user.id, action: 'LOGIN', tableName: 'users', recordId: result.user.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: { message: 'refreshToken required', code: 'BAD_REQUEST' } });
  }
  const tokens = await authService.refreshTokens(refreshToken);
  res.json({ success: true, data: tokens });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

const changePassword = asyncHandler(async (req, res) => {
  v.validateChangePassword(req.body);
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(req.user.id, { currentPassword, newPassword });
  await writeAudit({ userId: req.user.id, action: 'CHANGE_PASSWORD', tableName: 'users', recordId: req.user.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  res.json({ success: true, data: result });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ success: false, error: { message: 'Valid email is required', code: 'VALIDATION_ERROR' } });
  }
  await authService.forgotPassword(email.trim().toLowerCase());
  // Always 200 — never leak whether email exists
  res.json({ success: true, data: { message: 'If that email is registered, a reset link has been sent.' } });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token)       return res.status(400).json({ success: false, error: { message: 'Token is required', code: 'VALIDATION_ERROR' } });
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, error: { message: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' } });
  }
  await authService.resetPassword(token, newPassword);
  res.json({ success: true, data: { message: 'Password reset successfully. You can now sign in.' } });
});

module.exports = { register, login, refresh, me, changePassword, forgotPassword, resetPassword };
