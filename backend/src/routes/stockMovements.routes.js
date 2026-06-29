const router = require('express').Router();
const ctrl = require('../controllers/stockMovements.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', requirePermission('stock_movements:read'), ctrl.list);

module.exports = router;
