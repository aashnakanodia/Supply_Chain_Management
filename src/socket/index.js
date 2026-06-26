const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/tokens');
const bus = require('../utils/eventBus');

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || '*',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── JWT auth on every socket connection ───────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Room assignment on connect ────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { role, warehouse_id, supplier_id } = socket.user;

    socket.join(`role:${role}`);
    if (warehouse_id) socket.join(`warehouse:${warehouse_id}`);
    if (supplier_id)  socket.join(`supplier:${supplier_id}`);
  });

  // ── EventBus → Socket.io room routing ────────────────────────────────────

  // Inventory changed — admin + warehouse staff of that warehouse
  bus.on('INVENTORY_CHANGED', (payload) => {
    io.to('role:admin').emit('INVENTORY_CHANGED', payload);
    if (payload.warehouseId) io.to(`warehouse:${payload.warehouseId}`).emit('INVENTORY_CHANGED', payload);
  });

  // New low-stock alert — admin + procurement + that warehouse
  bus.on('NEW_ALERT', (payload) => {
    io.to('role:admin').emit('NEW_ALERT', payload);
    io.to('role:procurement_manager').emit('NEW_ALERT', payload);
    if (payload.warehouseId) io.to(`warehouse:${payload.warehouseId}`).emit('NEW_ALERT', payload);
  });

  // Alert resolved — same audience as creation
  bus.on('ALERT_RESOLVED', (payload) => {
    io.to('role:admin').emit('ALERT_RESOLVED', payload);
    io.to('role:procurement_manager').emit('ALERT_RESOLVED', payload);
    if (payload.warehouseId) io.to(`warehouse:${payload.warehouseId}`).emit('ALERT_RESOLVED', payload);
  });

  // PO approved — admin + procurement + that warehouse + that supplier
  bus.on('PO_APPROVED', (payload) => {
    io.to('role:admin').emit('PO_APPROVED', payload);
    io.to('role:procurement_manager').emit('PO_APPROVED', payload);
    if (payload.warehouseId) io.to(`warehouse:${payload.warehouseId}`).emit('PO_APPROVED', payload);
    if (payload.supplierId)  io.to(`supplier:${payload.supplierId}`).emit('PO_APPROVED', payload);
  });

  // PO status changed (ordered/received/cancelled etc.) — same audience
  bus.on('PO_STATUS_CHANGED', (payload) => {
    io.to('role:admin').emit('PO_STATUS_CHANGED', payload);
    io.to('role:procurement_manager').emit('PO_STATUS_CHANGED', payload);
    if (payload.warehouseId) io.to(`warehouse:${payload.warehouseId}`).emit('PO_STATUS_CHANGED', payload);
    if (payload.supplierId)  io.to(`supplier:${payload.supplierId}`).emit('PO_STATUS_CHANGED', payload);
  });

  // Shipment status changed — admin + procurement + that warehouse + that supplier
  bus.on('SHIPMENT_STATUS_CHANGED', (payload) => {
    io.to('role:admin').emit('SHIPMENT_STATUS_CHANGED', payload);
    io.to('role:procurement_manager').emit('SHIPMENT_STATUS_CHANGED', payload);
    if (payload.warehouseId) io.to(`warehouse:${payload.warehouseId}`).emit('SHIPMENT_STATUS_CHANGED', payload);
    if (payload.supplierId)  io.to(`supplier:${payload.supplierId}`).emit('SHIPMENT_STATUS_CHANGED', payload);
  });

  return io;
}

module.exports = { initSocket };
