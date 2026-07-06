const chatService = require('../services/chat.service');
const aiService   = require('../services/ai.service');
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
  await chatService.addMessage(
    req.params.sessionId,
    { role: 'user', content },
    scope,
  );

  // Load full history for context, then call Gemini
  const history = await chatService.getMessages(req.params.sessionId, scope);
  let aiResult;
  try {
    aiResult = await aiService.generateReply(history, req.user, scope);
  } catch (aiErr) {
    console.error('[AI] generateReply failed:', aiErr?.message || aiErr);

    const msg   = String(aiErr?.message || '');
    const is429 = aiErr?.status === 429
      || msg.includes('429')
      || msg.includes('RESOURCE_EXHAUSTED')
      || msg.includes('quota');

    if (is429) {
      const secMatch  = msg.match(/\b(\d+)s\b/);
      const delaySec  = secMatch ? parseInt(secMatch[1], 10) : null;
      // _retryExhausted = auto-retry already ran and also failed → daily quota gone
      const isDaily   = aiErr._retryExhausted || !delaySec || delaySec > 60;
      aiResult = {
        text: isDaily
          ? "I've reached the daily API limit (20 requests/day on the free tier). The quota resets at midnight UTC — please try again then."
          : `I'm being rate-limited for a moment. Please wait about ${delaySec} seconds and send your message again.`,
        tokensUsed: 0,
      };
    } else {
      throw aiErr;
    }
  }
  const { text, tokensUsed } = aiResult;

  // Persist assistant reply
  const assistantMsg = await chatService.addMessage(
    req.params.sessionId,
    { role: 'assistant', content: text, tokensUsed },
    scope,
  );

  res.status(201).json({ success: true, data: { message: assistantMsg } });
});

const deleteSession = asyncHandler(async (req, res) => {
  const result = await chatService.deleteSession(req.params.sessionId, buildScope(req.user));
  res.json({ success: true, data: result });
});

module.exports = { listSessions, createSession, getMessages, sendMessage, deleteSession };
