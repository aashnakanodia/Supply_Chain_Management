const router = require('express').Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.post('/',           requirePermission('inventory:write'), ctrl.create);
router.get('/',            requirePermission('inventory:read'),  ctrl.list);
router.get('/:id',         requirePermission('inventory:read'),  ctrl.getById);
router.post('/:id/adjust', requirePermission('inventory:write'), ctrl.adjust);

module.exports = router;
