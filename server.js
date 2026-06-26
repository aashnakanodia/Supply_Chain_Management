require('dotenv').config();

const { validateEnv } = require('./src/config/env');
validateEnv();

const http = require('http');
const app  = require('./src/app');
const { initSocket }   = require('./src/socket');
const { testConnection } = require('./src/config/database');

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  try {
    await testConnection();
    console.log('[db] Connected to PostgreSQL');

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`[server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
      console.log(`[server] API base:    http://localhost:${PORT}/api/v1`);
      console.log(`[server] Socket.io:   ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[startup] Failed to connect to database:', err.message);
    process.exit(1);
  }
}

start();
