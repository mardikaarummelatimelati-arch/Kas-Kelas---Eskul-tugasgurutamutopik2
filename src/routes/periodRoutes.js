const express = require('express');
const router = express.Router();
const periodController = require('../controllers/periodController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

// Period routes accessible by Bendahara and Admin
router.get('/', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), periodController.index);
router.post('/create', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), periodController.create);
router.post('/update/:id', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), periodController.update);
router.post('/delete/:id', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), periodController.delete);

module.exports = router;
