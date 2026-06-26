const db = require('../config/database');
const AppError = require('../utils/AppError');

async function list({ page = 1, limit = 20, userId, action, tableName, recordId } = {}, scope) {
  if (scope.role !== 'admin') throw new AppError('Access denied', 403, 'FORBIDDEN');

  const params = [];
  const where  = ['1=1'];

  if (userId)    { params.push(userId);    where.push(`al.user_id    = $${params.length}`); }
  if (action)    { params.push(action);    where.push(`al.action     = $${params.length}`); }
  if (tableName) { params.push(tableName); where.push(`al.table_name = $${params.length}`); }
  if (recordId)  { params.push(recordId);  where.push(`al.record_id  = $${params.length}`); }

  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT al.id, al.action, al.table_name, al.record_id,
            al.new_values, al.ip_address, al.user_agent, al.created_at,
            u.email                                    AS user_email,
            u.first_name || ' ' || u.last_name         AS user_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY al.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  const countParams = params.slice(0, params.length - 2);
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(*) FROM audit_logs al WHERE ${where.join(' AND ')}`,
    countParams,
  );

  return { auditLogs: rows, total: parseInt(count, 10), page, limit };
}

module.exports = { list };
