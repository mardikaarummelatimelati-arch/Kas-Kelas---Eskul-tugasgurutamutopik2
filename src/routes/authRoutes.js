const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest, isAuthenticated } = require('../middlewares/authMiddleware');

router.get('/login', isGuest, authController.showLogin);
router.post('/login', isGuest, authController.login);
router.get('/quick-login/:role', authController.quickLogin);
router.get('/logout', isAuthenticated, authController.logout);
router.post('/logout', isAuthenticated, authController.logout);

module.exports = router;
