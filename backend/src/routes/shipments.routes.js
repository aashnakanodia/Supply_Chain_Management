const router = require('express').Router();
const ctrl = require('../controllers/shipments.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/',              requirePermission('shipments:read'),  ctrl.list);
router.get('/:id',           requirePermission('shipments:read'),  ctrl.getById);
router.post('/',             requirePermission('shipments:write'), ctrl.create);
router.patch('/:id/status',  requirePermission('shipments:write'), ctrl.updateStatus);

module.exports = router;
