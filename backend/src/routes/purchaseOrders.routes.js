const router = require('express').Router();
const ctrl = require('../controllers/purchaseOrders.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/',                requirePermission('purchase_orders:read'),    ctrl.list);
router.get('/:id',             requirePermission('purchase_orders:read'),    ctrl.getById);
router.post('/',               requirePermission('purchase_orders:write'),   ctrl.create);
router.post('/:id/approve',    requirePermission('purchase_orders:approve'), ctrl.approve);
router.patch('/:id/status',    requirePermission('purchase_orders:write'),   ctrl.updateStatus);

module.exports = router;
