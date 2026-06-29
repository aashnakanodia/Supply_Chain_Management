const router = require('express').Router();
const ctrl = require('../controllers/products.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/',        requirePermission('products:read'),  ctrl.list);
router.get('/:id',     requirePermission('products:read'),  ctrl.getById);
router.post('/',       requirePermission('products:write'), ctrl.create);
router.patch('/:id',   requirePermission('products:write'), ctrl.update);
router.delete('/:id',  requirePermission('products:write'), ctrl.remove);

module.exports = router;
