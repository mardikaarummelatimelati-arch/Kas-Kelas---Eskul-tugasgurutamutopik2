const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

// Khusus Siswa: Status Tagihan Pribadi
router.get('/tagihan', isAuthenticated, hasRole('SISWA'), studentController.tagihan);

// Transparansi Saldo & Pengeluaran Kas (Bisa diakses Siswa & semua role)
router.get('/transparansi', isAuthenticated, studentController.transparansi);

module.exports = router;
