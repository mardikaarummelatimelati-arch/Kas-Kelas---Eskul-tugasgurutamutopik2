const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

// CRUD Pengguna: Admin Only
router.get('/', isAuthenticated, hasRole('ADMIN'), userController.index);
router.post('/create', isAuthenticated, hasRole('ADMIN'), userController.create);
router.post('/update/:id', isAuthenticated, hasRole('ADMIN'), userController.update);
router.post('/delete/:id', isAuthenticated, hasRole('ADMIN'), userController.delete);

module.exports = router;
