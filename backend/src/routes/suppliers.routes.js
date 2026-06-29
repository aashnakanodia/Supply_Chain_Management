const router = require('express').Router();
const ctrl = require('../controllers/suppliers.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/',                              requirePermission('suppliers:read'),          ctrl.list);
router.get('/:id',                           requirePermission('suppliers:read'),          ctrl.getById);
router.post('/',                             requirePermission('suppliers:write'),         ctrl.create);
router.patch('/:id',                         requirePermission('suppliers:write'),         ctrl.update);
router.get('/:id/products',                  requirePermission('supplier_products:read'),  ctrl.listProducts);
router.put('/:id/products/:productId',       requirePermission('supplier_products:write'), ctrl.upsertProduct);

module.exports = router;
