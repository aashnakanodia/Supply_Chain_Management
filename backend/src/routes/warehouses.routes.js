const router = require('express').Router();
const ctrl = require('../controllers/warehouses.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/',       requirePermission('warehouses:read'),  ctrl.list);
router.get('/:id',    requirePermission('warehouses:read'),  ctrl.getById);
router.post('/',      requirePermission('warehouses:write'), ctrl.create);
router.patch('/:id',  requirePermission('warehouses:write'), ctrl.update);

module.exports = router;
