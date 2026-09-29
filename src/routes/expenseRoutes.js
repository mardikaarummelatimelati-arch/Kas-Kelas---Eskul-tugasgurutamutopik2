const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const upload = require('../middlewares/uploadMiddleware');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

// Daftar Pengeluaran & Input Nota Belanja (Bendahara & Admin)
router.get('/', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), expenseController.index);
router.post('/create', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), upload.single('fotoNota'), expenseController.create);
router.post('/delete/:id', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), expenseController.delete);

// Approval Usulan Pengeluaran Dana Besar (Admin Only)
router.get('/approvals', isAuthenticated, hasRole('ADMIN'), expenseController.approvals);
router.post('/approve/:id', isAuthenticated, hasRole('ADMIN'), expenseController.approveExpense);
router.post('/reject/:id', isAuthenticated, hasRole('ADMIN'), expenseController.rejectExpense);

module.exports = router;
