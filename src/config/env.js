const REQUIRED_VARS = [
  { key: 'DB_HOST',             hint: 'PostgreSQL host (e.g. localhost)' },
  { key: 'DB_PORT',             hint: 'PostgreSQL port (e.g. 5432)' },
  { key: 'DB_NAME',             hint: 'Database name' },
  { key: 'DB_USER',             hint: 'Database user' },
  { key: 'DB_PASSWORD',         hint: 'Database password' },
  { key: 'JWT_ACCESS_SECRET',   hint: 'Run: openssl rand -hex 64' },
  { key: 'JWT_REFRESH_SECRET',  hint: 'Run: openssl rand -hex 64' },
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter(({ key }) => !process.env[key]);

  if (missing.length > 0) {
    const lines = missing.map(({ key, hint }) => `  ${key}  →  ${hint}`).join('\n');
    console.error('\n[startup] Missing required environment variables:\n' + lines + '\n');
    console.error('[startup] Copy .env.example to .env and fill in the values.\n');
    process.exit(1);
  }
}

module.exports = { validateEnv };
