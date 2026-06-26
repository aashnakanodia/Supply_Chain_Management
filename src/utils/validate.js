const AppError = require('./AppError');

const VALID_ROLES     = ['admin', 'procurement_manager', 'warehouse_staff', 'supplier', 'viewer'];
const VALID_PO_STATUS = ['draft', 'pending', 'approved', 'ordered', 'received', 'cancelled'];
const VALID_SHP_STATUS = ['pending', 'in_transit', 'arrived', 'completed', 'cancelled'];
const VALID_ALERT_TYPES = ['low_stock', 'overstock', 'expiry', 'delayed_shipment', 'system'];
const VALID_SEVERITIES  = ['low', 'medium', 'high', 'critical'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function required(val, name) {
  if (val === undefined || val === null || val === '') throw new AppError(`${name} is required`, 422, 'VALIDATION_ERROR');
}
function isString(val, name, max = 500) {
  if (val !== undefined && val !== null) {
    if (typeof val !== 'string') throw new AppError(`${name} must be a string`, 422, 'VALIDATION_ERROR');
    if (val.trim().length === 0) throw new AppError(`${name} cannot be blank`, 422, 'VALIDATION_ERROR');
    if (val.length > max) throw new AppError(`${name} must be at most ${max} characters`, 422, 'VALIDATION_ERROR');
  }
}
function isEmail(val, name) {
  if (val !== undefined && val !== null && !EMAIL_RE.test(val)) {
    throw new AppError(`${name} must be a valid email address`, 422, 'VALIDATION_ERROR');
  }
}
function isUUID(val, name) {
  if (val !== undefined && val !== null && !UUID_RE.test(val)) {
    throw new AppError(`${name} must be a valid UUID`, 422, 'VALIDATION_ERROR');
  }
}
function isNumber(val, name, { min, max, integer } = {}) {
  if (val !== undefined && val !== null) {
    const n = Number(val);
    if (isNaN(n)) throw new AppError(`${name} must be a number`, 422, 'VALIDATION_ERROR');
    if (integer && !Number.isInteger(n)) throw new AppError(`${name} must be an integer`, 422, 'VALIDATION_ERROR');
    if (min !== undefined && n < min) throw new AppError(`${name} must be at least ${min}`, 422, 'VALIDATION_ERROR');
    if (max !== undefined && n > max) throw new AppError(`${name} must be at most ${max}`, 422, 'VALIDATION_ERROR');
  }
}
function isBoolean(val, name) {
  if (val !== undefined && val !== null && typeof val !== 'boolean') {
    throw new AppError(`${name} must be true or false`, 422, 'VALIDATION_ERROR');
  }
}
function isOneOf(val, name, allowed) {
  if (val !== undefined && val !== null && !allowed.includes(val)) {
    throw new AppError(`${name} must be one of: ${allowed.join(', ')}`, 422, 'VALIDATION_ERROR');
  }
}
function isDate(val, name) {
  if (val !== undefined && val !== null) {
    if (isNaN(Date.parse(val))) throw new AppError(`${name} must be a valid date (YYYY-MM-DD)`, 422, 'VALIDATION_ERROR');
  }
}
function isArray(val, name, { min = 1 } = {}) {
  if (!Array.isArray(val) || val.length < min) {
    throw new AppError(`${name} must be an array with at least ${min} item(s)`, 422, 'VALIDATION_ERROR');
  }
}

// ── Per-resource validators ───────────────────────────────────────────────────

function validateRegister(body) {
  const { email, password, firstName, lastName, role, warehouseId, supplierId } = body;
  required(email, 'email');       isEmail(email, 'email');
  required(password, 'password'); isString(password, 'password', 128);
  if (password && password.length < 8) throw new AppError('password must be at least 8 characters', 422, 'VALIDATION_ERROR');
  required(firstName, 'firstName'); isString(firstName, 'firstName', 100);
  required(lastName,  'lastName');  isString(lastName,  'lastName',  100);
  required(role, 'role');           isOneOf(role, 'role', VALID_ROLES);
  if (warehouseId) isUUID(warehouseId, 'warehouseId');
  if (supplierId)  isUUID(supplierId,  'supplierId');
}

function validateLogin(body) {
  const { email, password } = body;
  required(email, 'email');
  required(password, 'password');
}

function validateChangePassword(body) {
  const { currentPassword, newPassword } = body;
  required(currentPassword, 'currentPassword');
  required(newPassword, 'newPassword');
  if (newPassword && newPassword.length < 8) throw new AppError('newPassword must be at least 8 characters', 422, 'VALIDATION_ERROR');
}

function validateCreateProduct(body) {
  const { sku, name, category, unit, unitPrice, reorderLevel, leadTimeDays } = body;
  required(sku,  'sku');  isString(sku,  'sku',  100);
  required(name, 'name'); isString(name, 'name', 200);
  isString(category, 'category', 100);
  isString(unit, 'unit', 50);
  isNumber(unitPrice,     'unitPrice',     { min: 0 });
  isNumber(reorderLevel,  'reorderLevel',  { min: 0, integer: true });
  isNumber(leadTimeDays,  'leadTimeDays',  { min: 0, integer: true });
}

function validateUpdateProduct(body) {
  const { name, category, unit, unitPrice, reorderLevel, leadTimeDays } = body;
  isString(name, 'name', 200);
  isString(category, 'category', 100);
  isString(unit, 'unit', 50);
  isNumber(unitPrice,    'unitPrice',    { min: 0 });
  isNumber(reorderLevel, 'reorderLevel', { min: 0, integer: true });
  isNumber(leadTimeDays, 'leadTimeDays', { min: 0, integer: true });
}

function validateCreateWarehouse(body) {
  const { name, address, city, country, capacity } = body;
  required(name, 'name'); isString(name, 'name', 200);
  isString(address, 'address', 500);
  isString(city,    'city',    100);
  isString(country, 'country', 100);
  isNumber(capacity, 'capacity', { min: 1, integer: true });
}

function validateUpdateWarehouse(body) {
  const { name, address, city, country, capacity } = body;
  isString(name,    'name',    200);
  isString(address, 'address', 500);
  isString(city,    'city',    100);
  isString(country, 'country', 100);
  isNumber(capacity, 'capacity', { min: 1, integer: true });
}

function validateCreateSupplier(body) {
  const { name, email, contactName, phone, address, city, country, paymentTerms, leadTimeDays } = body;
  required(name, 'name'); isString(name, 'name', 200);
  isEmail(email, 'email');
  isString(contactName,   'contactName',   200);
  isString(phone,         'phone',         50);
  isString(address,       'address',       500);
  isString(city,          'city',          100);
  isString(country,       'country',       100);
  isString(paymentTerms,  'paymentTerms',  200);
  isNumber(leadTimeDays,  'leadTimeDays',  { min: 0, integer: true });
}

function validateUpdateSupplier(body) {
  const { name, email, contactName, phone, address, city, country, paymentTerms, leadTimeDays } = body;
  isString(name,          'name',          200);
  isEmail(email,          'email');
  isString(contactName,   'contactName',   200);
  isString(phone,         'phone',         50);
  isString(address,       'address',       500);
  isString(city,          'city',          100);
  isString(country,       'country',       100);
  isString(paymentTerms,  'paymentTerms',  200);
  isNumber(leadTimeDays,  'leadTimeDays',  { min: 0, integer: true });
}

function validateCreateInventory(body) {
  const { warehouseId, productId, quantity, reorderPoint } = body;
  required(warehouseId, 'warehouseId'); isUUID(warehouseId, 'warehouseId');
  required(productId,   'productId');   isUUID(productId,   'productId');
  required(quantity,    'quantity');    isNumber(quantity,    'quantity',    { min: 0, integer: true });
  if (reorderPoint !== undefined) isNumber(reorderPoint, 'reorderPoint', { min: 0, integer: true });
}

function validateAdjustStock(body) {
  const { quantity, reason } = body;
  required(quantity, 'quantity');
  isNumber(quantity, 'quantity', { integer: true });
  if (Number(quantity) === 0) throw new AppError('quantity cannot be 0', 422, 'VALIDATION_ERROR');
  isString(reason, 'reason', 500);
}

function validateCreatePO(body) {
  const { supplierId, warehouseId, items, expectedDate, notes } = body;
  required(supplierId,  'supplierId');  isUUID(supplierId,  'supplierId');
  required(warehouseId, 'warehouseId'); isUUID(warehouseId, 'warehouseId');
  required(items, 'items'); isArray(items, 'items', { min: 1 });
  isDate(expectedDate, 'expectedDate');
  isString(notes, 'notes', 1000);
  items.forEach((item, i) => {
    required(item.productId,  `items[${i}].productId`);  isUUID(item.productId,  `items[${i}].productId`);
    required(item.quantity,   `items[${i}].quantity`);   isNumber(item.quantity,  `items[${i}].quantity`,  { min: 1, integer: true });
    required(item.unitPrice,  `items[${i}].unitPrice`);  isNumber(item.unitPrice, `items[${i}].unitPrice`, { min: 0 });
  });
}

function validateUpdatePOStatus(body) {
  required(body.status, 'status');
  isOneOf(body.status, 'status', VALID_PO_STATUS);
}

function validateCreateShipment(body) {
  const { purchaseOrderId, warehouseId, carrier, trackingNumber, expectedArrival, notes } = body;
  required(purchaseOrderId, 'purchaseOrderId'); isUUID(purchaseOrderId, 'purchaseOrderId');
  if (warehouseId) isUUID(warehouseId, 'warehouseId');
  isString(carrier,        'carrier',        200);
  isString(trackingNumber, 'trackingNumber', 200);
  isDate(expectedArrival,  'expectedArrival');
  isString(notes, 'notes', 1000);
}

function validateUpdateShipmentStatus(body) {
  required(body.status, 'status');
  isOneOf(body.status, 'status', VALID_SHP_STATUS);
  isDate(body.actualArrival, 'actualArrival');
}

function validateCreateAlert(body) {
  const { type, severity, title, message, warehouseId, productId } = body;
  required(type,    'type');    isOneOf(type,     'type',     VALID_ALERT_TYPES);
  required(title,   'title');   isString(title,   'title',    300);
  required(message, 'message'); isString(message, 'message',  2000);
  if (severity)   isOneOf(severity,   'severity',   VALID_SEVERITIES);
  if (warehouseId) isUUID(warehouseId, 'warehouseId');
  if (productId)   isUUID(productId,   'productId');
}

function validateUpdateProfile(body) {
  const { firstName, lastName } = body;
  isString(firstName, 'firstName', 100);
  isString(lastName,  'lastName',  100);
}

function validateSetActive(body) {
  required(body.isActive, 'isActive');
  isBoolean(body.isActive, 'isActive');
}

function validateChangeRole(body) {
  required(body.role, 'role');
  isOneOf(body.role, 'role', VALID_ROLES);
}

module.exports = {
  validateRegister, validateLogin, validateChangePassword,
  validateCreateProduct, validateUpdateProduct,
  validateCreateWarehouse, validateUpdateWarehouse,
  validateCreateSupplier, validateUpdateSupplier,
  validateCreateInventory, validateAdjustStock,
  validateCreatePO, validateUpdatePOStatus,
  validateCreateShipment, validateUpdateShipmentStatus,
  validateCreateAlert,
  validateUpdateProfile, validateSetActive, validateChangeRole,
};
