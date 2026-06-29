const router = require('express').Router();
const ctrl = require('../controllers/alerts.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/',              requirePermission('alerts:read'),  ctrl.list);
router.post('/',             requirePermission('alerts:write'), ctrl.create);
router.patch('/:id/read',    requirePermission('alerts:read'),  ctrl.markRead);
router.patch('/:id/resolve', requirePermission('alerts:read'),  ctrl.resolve);

module.exports = router;
