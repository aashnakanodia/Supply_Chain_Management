const chatService = require('../services/chat.service');
const asyncHandler = require('../utils/asyncHandler');
const { buildScope } = require('../utils/scope');

const listSessions = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await chatService.listSessions(
    { page: +page || 1, limit: +limit || 20 },
    buildScope(req.user),
  );
  res.json({ success: true, data: result });
});

const createSession = asyncHandler(async (req, res) => {
  const { title } = req.body;
  const session = await chatService.createSession(title, buildScope(req.user));
  res.status(201).json({ success: true, data: session });
});

const getMessages = asyncHandler(async (req, res) => {
  const messages = await chatService.getMessages(req.params.sessionId, buildScope(req.user));
  res.json({ success: true, data: messages });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const scope = buildScope(req.user);

  // Save user message
  const userMsg = await chatService.addMessage(
    req.params.sessionId,
    { role: 'user', content },
    scope,
  );

  // Placeholder: real implementation calls AI provider and saves assistant reply.
  // The AI response would be inserted as a separate 'assistant' message.
  res.status(201).json({ success: true, data: { userMessage: userMsg } });
});

const deleteSession = asyncHandler(async (req, res) => {
  const result = await chatService.deleteSession(req.params.sessionId, buildScope(req.user));
  res.json({ success: true, data: result });
});

module.exports = { listSessions, createSession, getMessages, sendMessage, deleteSession };
