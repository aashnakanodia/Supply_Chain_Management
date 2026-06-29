const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../config/database');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/tokens');
const AppError = require('../utils/AppError');
const { sendPasswordResetEmail } = require('../utils/mailer');

const BCRYPT_ROUNDS = 12;

const ROLE_REQUIRES_WAREHOUSE = new Set(['warehouse_staff']);
const ROLE_REQUIRES_SUPPLIER  = new Set(['supplier']);

async function register({ email, password, firstName, lastName, role, warehouseId, supplierId }) {
  if (ROLE_REQUIRES_WAREHOUSE.has(role) && !warehouseId) {
    throw new AppError('warehouse_id is required for warehouse_staff', 422, 'VALIDATION_ERROR');
  }
  if (ROLE_REQUIRES_SUPPLIER.has(role) && !supplierId) {
    throw new AppError('supplier_id is required for supplier role', 422, 'VALIDATION_ERROR');
  }

  // Verify foreign keys before insert to give clean errors
  if (warehouseId) {
    const { rowCount } = await db.query('SELECT 1 FROM warehouses WHERE id = $1 AND is_active = TRUE', [warehouseId]);
    if (!rowCount) throw new AppError('Warehouse not found', 404, 'NOT_FOUND');
  }
  if (supplierId) {
    const { rowCount } = await db.query('SELECT 1 FROM suppliers WHERE id = $1 AND is_active = TRUE', [supplierId]);
    if (!rowCount) throw new AppError('Supplier not found', 404, 'NOT_FOUND');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, warehouse_id, supplier_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, first_name, last_name, role, warehouse_id, supplier_id, created_at`,
    [email, passwordHash, firstName, lastName, role, warehouseId || null, supplierId || null],
  );

  return rows[0];
}

async function login({ email, password }) {
  const { rows } = await db.query(
    `SELECT id, email, password_hash, first_name, last_name, role, warehouse_id, supplier_id, is_active
     FROM users WHERE email = $1`,
    [email],
  );

  const user = rows[0];
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  if (!user.is_active) throw new AppError('Account is deactivated', 403, 'ACCOUNT_DISABLED');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const tokenPayload = {
    id:           user.id,
    email:        user.email,
    role:         user.role,
    warehouse_id: user.warehouse_id,
    supplier_id:  user.supplier_id,
  };

  return {
    accessToken:  signAccessToken(tokenPayload),
    refreshToken: signRefreshToken({ id: user.id }),
    user: {
      id:          user.id,
      email:       user.email,
      firstName:   user.first_name,
      lastName:    user.last_name,
      role:        user.role,
      warehouseId: user.warehouse_id,
      supplierId:  user.supplier_id,
    },
  };
}

async function refreshTokens(refreshToken) {
  const payload = verifyRefreshToken(refreshToken); // throws on invalid/expired

  const { rows } = await db.query(
    `SELECT id, email, role, warehouse_id, supplier_id, is_active FROM users WHERE id = $1`,
    [payload.id],
  );

  const user = rows[0];
  if (!user) throw new AppError('User not found', 401, 'UNAUTHORIZED');
  if (!user.is_active) throw new AppError('Account is deactivated', 403, 'ACCOUNT_DISABLED');

  const tokenPayload = {
    id:           user.id,
    email:        user.email,
    role:         user.role,
    warehouse_id: user.warehouse_id,
    supplier_id:  user.supplier_id,
  };

  return {
    accessToken:  signAccessToken(tokenPayload),
    refreshToken: signRefreshToken({ id: user.id }),
  };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await db.query(
    `SELECT id, password_hash FROM users WHERE id = $1`, [userId],
  );
  const user = rows[0];
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [newHash, userId],
  );

  return { message: 'Password changed successfully' };
}

async function forgotPassword(email) {
  const { rows } = await db.query(
    `SELECT id, first_name FROM users WHERE email = $1 AND is_active = TRUE`,
    [email],
  );
  // Always silently succeed — don't reveal whether email is registered
  if (!rows[0]) return;

  const user = rows[0];
  // Invalidate any previous unused tokens
  await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await db.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, token, expiresAt],
  );

  const appUrl   = process.env.APP_URL || 'http://localhost:5173';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  await sendPasswordResetEmail({ to: email, name: user.first_name, resetUrl });
}

async function resetPassword(token, newPassword) {
  const { rows } = await db.query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
    [token],
  );
  if (!rows[0]) throw new AppError('Reset link is invalid or has expired.', 400, 'INVALID_TOKEN');

  const { id: tokenId, user_id } = rows[0];
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, user_id]);
  await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);
}

module.exports = { register, login, refreshTokens, changePassword, forgotPassword, resetPassword };
