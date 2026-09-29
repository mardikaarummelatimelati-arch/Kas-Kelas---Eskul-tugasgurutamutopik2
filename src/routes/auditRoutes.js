const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { isAuthenticated, hasRole } = require('../middlewares/authMiddleware');

// Audit Log (Admin & Bendahara)
router.get('/', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), auditController.index);

// Cetak Laporan Buku Kas Bulanan (Admin & Bendahara)
router.get('/print', isAuthenticated, hasRole('ADMIN', 'BENDAHARA'), auditController.printReport);

module.exports = router;
