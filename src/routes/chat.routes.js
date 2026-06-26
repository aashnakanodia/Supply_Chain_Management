const router = require('express').Router();
const ctrl = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);
router.use(requirePermission('chat:read'));

router.get('/sessions',                          ctrl.listSessions);
router.post('/sessions',                         ctrl.createSession);
router.delete('/sessions/:sessionId',            ctrl.deleteSession);
router.get('/sessions/:sessionId/messages',      ctrl.getMessages);
router.post('/sessions/:sessionId/messages',     ctrl.sendMessage);

module.exports = router;
