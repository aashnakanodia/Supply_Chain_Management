const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const authRoutes          = require('./routes/auth.routes');
const usersRoutes         = require('./routes/users.routes');
const productsRoutes      = require('./routes/products.routes');
const warehousesRoutes    = require('./routes/warehouses.routes');
const inventoryRoutes     = require('./routes/inventory.routes');
const suppliersRoutes     = require('./routes/suppliers.routes');
const purchaseOrdersRoutes = require('./routes/purchaseOrders.routes');
const shipmentsRoutes     = require('./routes/shipments.routes');
const alertsRoutes        = require('./routes/alerts.routes');
const chatRoutes            = require('./routes/chat.routes');
const stockMovementsRoutes  = require('./routes/stockMovements.routes');
const dashboardRoutes       = require('./routes/dashboard.routes');
const auditLogsRoutes       = require('./routes/auditLogs.routes');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || '*',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max:      parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: { message: 'Too many requests', code: 'TOO_MANY_REQUESTS' } },
});
app.use('/api', limiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes (v1) ───────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`,            authRoutes);
app.use(`${API}/users`,           usersRoutes);
app.use(`${API}/products`,        productsRoutes);
app.use(`${API}/warehouses`,      warehousesRoutes);
app.use(`${API}/inventory`,       inventoryRoutes);
app.use(`${API}/suppliers`,       suppliersRoutes);
app.use(`${API}/purchase-orders`, purchaseOrdersRoutes);
app.use(`${API}/shipments`,       shipmentsRoutes);
app.use(`${API}/alerts`,          alertsRoutes);
app.use(`${API}/chat`,            chatRoutes);
app.use(`${API}/stock-movements`, stockMovementsRoutes);
app.use(`${API}/dashboard`,       dashboardRoutes);
app.use(`${API}/audit-logs`,      auditLogsRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Route not found', code: 'NOT_FOUND' } });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
