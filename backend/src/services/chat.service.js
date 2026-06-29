const db = require('../config/database');
const AppError = require('../utils/AppError');

// Chat is always scoped to the authenticated user — no cross-user access possible.

async function listSessions({ page = 1, limit = 20 } = {}, scope) {
  const offset = (page - 1) * limit;
  const { rows } = await db.query(
    `SELECT id, title, is_active, created_at, updated_at
     FROM chat_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`,
    [scope.userId, limit, offset],
  );
  return { sessions: rows, page, limit };
}

async function createSession(title, scope) {
  const { rows } = await db.query(
    `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING *`,
    [scope.userId, title || 'New Conversation'],
  );
  return rows[0];
}

async function getSession(sessionId, scope) {
  const { rows } = await db.query(
    `SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, scope.userId],
  );
  if (!rows[0]) throw new AppError('Session not found', 404, 'NOT_FOUND');
  return rows[0];
}

async function getMessages(sessionId, scope) {
  await getSession(sessionId, scope); // ownership check

  const { rows } = await db.query(
    `SELECT id, role, content, tokens_used, created_at
     FROM chat_messages
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId],
  );
  return rows;
}

async function addMessage(sessionId, { role, content, tokensUsed }, scope) {
  await getSession(sessionId, scope); // ownership check

  const { rows } = await db.query(
    `INSERT INTO chat_messages (session_id, role, content, tokens_used)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [sessionId, role, content, tokensUsed || null],
  );

  // Keep session updated_at current for recency sorting
  await db.query(
    `UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`,
    [sessionId],
  );

  return rows[0];
}

async function deleteSession(sessionId, scope) {
  const { rowCount } = await db.query(
    `DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, scope.userId],
  );
  if (!rowCount) throw new AppError('Session not found', 404, 'NOT_FOUND');
  return { id: sessionId };
}

module.exports = { listSessions, createSession, getSession, getMessages, addMessage, deleteSession };
