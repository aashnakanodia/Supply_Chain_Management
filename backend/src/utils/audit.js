const db = require('../config/database');

async function writeAudit({ userId, action, tableName, recordId, newValues, ipAddress, userAgent }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6::inet, $7)`,
      [
        userId   || null,
        action,
        tableName || null,
        recordId  || null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
        userAgent || null,
      ],
    );
  } catch (_) {
    // Audit failures must never break the main request
  }
}

module.exports = { writeAudit };
