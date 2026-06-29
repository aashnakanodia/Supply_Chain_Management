const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/register',         ctrl.register);
router.post('/login',            ctrl.login);
router.post('/refresh',          ctrl.refresh);
router.get('/me',                authenticate, ctrl.me);
router.post('/change-password',  authenticate, ctrl.changePassword);
router.post('/forgot-password',  ctrl.forgotPassword);
router.post('/reset-password',   ctrl.resetPassword);

module.exports = router;
