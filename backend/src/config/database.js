const { Pool } = require('pg');

const pool = new Pool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT, 10),
  database:           process.env.DB_NAME,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  max:                parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis:  parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected client error:', err.message);
});

/**
 * Run a query on a pooled connection.
 * @param {string} text - SQL query string with $N placeholders
 * @param {any[]} [params] - Parameter values
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[db] query(${Date.now() - start}ms) rows=${result.rowCount}`);
  }
  return result;
}

/**
 * Acquire a client for a transaction.
 * Caller is responsible for client.release().
 */
async function getClient() {
  return pool.connect();
}

async function testConnection() {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
}

module.exports = { query, getClient, testConnection, pool };
