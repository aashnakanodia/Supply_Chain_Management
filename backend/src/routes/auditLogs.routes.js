const router = require('express').Router();
const ctrl = require('../controllers/auditLogs.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', requireRole('admin'), ctrl.list);

module.exports = router;
