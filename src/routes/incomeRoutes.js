const express = require('express');
const router = express.Router();
const incomeController = require('../controllers/incomeController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

// Daftar Kas Masuk & Pencatatan (Bendahara & Admin)
router.get('/', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), incomeController.index);
router.post('/pay/:id', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), incomeController.markPaid);
router.post('/revert/:id', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), incomeController.revertPayment);
router.post('/manual', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), incomeController.createManual);

// Kuitansi Digital (Accessible by Siswa for their own receipt, and Bendahara/Admin)
router.get('/receipt/:id', isAuthenticated, incomeController.showReceipt);

module.exports = router;
