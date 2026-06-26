const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

router.use(authenticate);

router.get('/me',          ctrl.getMe);
router.get('/',            requirePermission('users:read'), ctrl.list);
router.get('/:id',         ctrl.getById);
router.patch('/:id',       ctrl.updateProfile);
router.patch('/:id/active', requirePermission('users:read'),  ctrl.setActive);
router.patch('/:id/role',   requirePermission('users:write'), ctrl.changeRole);

module.exports = router;
