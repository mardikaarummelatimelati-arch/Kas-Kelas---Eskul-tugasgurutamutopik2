const prisma = require('../config/database');
const { recordKasLog, getKasSummary } = require('../utils/kasHelper');
const { formatRupiah, formatDate, getStatusBadge } = require('../utils/formatter');

// Threshold usulan dana besar yang mewajibkan approval Wali Kelas
const LARGE_EXPENSE_THRESHOLD = 150000;

exports.index = async (req, res) => {
  try {
    const { kategori, status, search } = req.query;

    const where = {};
    if (kategori && kategori !== 'all') {
      where.kategori = kategori;
    }
    if (status && status !== 'all') {
      where.statusApproval = status;
    }
    if (search && search.trim() !== '') {
      where.OR = [
        { judul: { contains: search.trim() } },
        { deskripsi: { contains: search.trim() } }
      ];
    }

    const [expenses, categories] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          createdBy: true,
          approvedBy: true
        },
        orderBy: { tglPengeluaran: 'desc' }
      }),
      prisma.expense.findMany({
        select: { kategori: true },
        distinct: ['kategori']
      })
    ]);

    const summary = await getKasSummary();

    const stats = {
      totalDisetujui: expenses
        .filter(e => e.statusApproval === 'APPROVED')
        .reduce((sum, e) => sum + e.nominal, 0),
      totalPending: expenses
        .filter(e => e.statusApproval === 'PENDING')
        .reduce((sum, e) => sum + e.nominal, 0),
      countPending: expenses.filter(e => e.statusApproval === 'PENDING').length
    };

    res.render('expenses/index', {
      title: 'Pencatatan Kas Keluar & Belanja',
      user: req.session.user,
      expenses,
      categories: categories.map(c => c.kategori),
      stats,
      summary,
      selectedCategory: kategori || 'all',
      selectedStatus: status || 'all',
      searchQuery: search || '',
      threshold: LARGE_EXPENSE_THRESHOLD,
      formatRupiah,
      formatDate,
      getStatusBadge,
      success: req.query.success || null,
      error: req.query.error || null,
      currentPath: '/expenses'
    });
  } catch (error) {
    console.error('Error saat load expenses:', error);
    res.status(500).send('Terjadi kesalahan memuat data kas keluar.');
  }
};

/**
 * Catat Pengeluaran Baru + Upload Foto Nota
 */
exports.create = async (req, res) => {
  try {
    const { judul, nominal, kategori, tglPengeluaran, deskripsi, mintaApproval } = req.body;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    if (!judul || !nominal || !kategori) {
      return res.redirect('/expenses?error=' + encodeURIComponent('Judul, nominal, dan kategori wajib diisi!'));
    }

    const nominalNum = parseFloat(nominal);
    const expenseDate = tglPengeluaran ? new Date(tglPengeluaran) : new Date();
    
    // File foto nota jika ada diupload
    let fotoNotaUrl = null;
    if (req.file) {
      fotoNotaUrl = '/uploads/receipts/' + req.file.filename;
    }

    // Logic Approval Usulan Dana Besar
    // Jika user adalah ADMIN, otomatis APPROVED
    // Jika BENDAHARA:
    //   - Jika nominal > LARGE_EXPENSE_THRESHOLD (Rp 150.000) atau mintaApproval dicentang -> PENDING
    //   - Jika nominal <= LARGE_EXPENSE_THRESHOLD dan tidak minta approval -> APPROVED langsung
    let statusApproval = 'APPROVED';
    let isPending = false;

    if (userRole !== 'ADMIN') {
      if (nominalNum > LARGE_EXPENSE_THRESHOLD || mintaApproval === 'on' || mintaApproval === 'true') {
        statusApproval = 'PENDING';
        isPending = true;
      }
    }

    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          judul: judul.trim(),
          nominal: nominalNum,
          kategori: kategori.trim(),
          tglPengeluaran: expenseDate,
          fotoNotaUrl,
          deskripsi: deskripsi ? deskripsi.trim() : null,
          statusApproval,
          createdById: userId,
          approvedById: userRole === 'ADMIN' ? userId : null,
          tglApproval: userRole === 'ADMIN' ? new Date() : null,
          alasanApproval: userRole === 'ADMIN' ? 'Disetujui langsung oleh Admin' : null
        }
      });

      // Jika langsung approved, kurangi saldo dan catat di KasLog
      if (statusApproval === 'APPROVED') {
        const keterangan = `Belanja ${expense.judul} (${expense.kategori})`;
        await recordKasLog('KELUAR', nominalNum, keterangan, tx);
      }
    });

    if (isPending) {
      return res.redirect('/expenses?success=' + encodeURIComponent(`Pengeluaran sebesar ${formatRupiah(nominalNum)} terdeteksi sebagai Usulan Dana Besar dan berstatus MENUNGGU PERSETUJUAN Wali Kelas.`));
    } else {
      return res.redirect('/expenses?success=' + encodeURIComponent(`Pengeluaran ${judul} sebesar ${formatRupiah(nominalNum)} berhasil dicatat dan saldo kas langsung terpotong!`));
    }
  } catch (error) {
    console.error('Error saat catat pengeluaran:', error);
    return res.redirect('/expenses?error=' + encodeURIComponent('Gagal mencatat pengeluaran kas. ' + error.message));
  }
};

/**
 * Halaman Khusus Approval Usulan Pengeluaran Dana Besar (Admin Only)
 */
exports.approvals = async (req, res) => {
  try {
    const pendingExpenses = await prisma.expense.findMany({
      where: { statusApproval: 'PENDING' },
      include: {
        createdBy: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const approvedHistory = await prisma.expense.findMany({
      where: {
        statusApproval: { in: ['APPROVED', 'REJECTED'] }
      },
      include: {
        createdBy: true,
        approvedBy: true
      },
      orderBy: { tglApproval: 'desc' },
      take: 10
    });

    const summary = await getKasSummary();

    res.render('expenses/approvals', {
      title: 'Persetujuan Usulan Dana Besar',
      user: req.session.user,
      pendingExpenses,
      approvedHistory,
      summary,
      formatRupiah,
      formatDate,
      getStatusBadge,
      success: req.query.success || null,
      error: req.query.error || null,
      currentPath: '/expenses/approvals'
    });
  } catch (error) {
    console.error('Error saat load approvals:', error);
    res.status(500).send('Terjadi kesalahan memuat data persetujuan.');
  }
};

/**
 * Approve Usulan Pengeluaran (Admin Only)
 */
exports.approveExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { alasanApproval } = req.body;
    const adminId = req.session.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) }
    });

    if (!expense) {
      return res.redirect('/expenses/approvals?error=' + encodeURIComponent('Data pengeluaran tidak ditemukan.'));
    }

    if (expense.statusApproval !== 'PENDING') {
      return res.redirect('/expenses/approvals?error=' + encodeURIComponent('Pengeluaran ini sudah diproses sebelumnya.'));
    }

    // Periksa apakah saldo kas mencukupi
    const summary = await getKasSummary();
    if (summary.currentBalance < expense.nominal) {
      return res.redirect('/expenses/approvals?error=' + encodeURIComponent(`Saldo kas saat ini (${formatRupiah(summary.currentBalance)}) tidak mencukupi untuk pengeluaran ${formatRupiah(expense.nominal)}!`));
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update status jadi APPROVED
      await tx.expense.update({
        where: { id: expense.id },
        data: {
          statusApproval: 'APPROVED',
          approvedById: adminId,
          tglApproval: new Date(),
          alasanApproval: alasanApproval ? alasanApproval.trim() : 'Disetujui oleh Wali Kelas / Pembina'
        }
      });

      // 2. Potong saldo kas & catat di KasLog
      const keterangan = `Disetujui: Belanja ${expense.judul} (${expense.kategori})`;
      await recordKasLog('KELUAR', expense.nominal, keterangan, tx);
    });

    return res.redirect('/expenses/approvals?success=' + encodeURIComponent(`Usulan "${expense.judul}" sebesar ${formatRupiah(expense.nominal)} TELAH DISETUJUI dan saldo kas terpotong!`));
  } catch (error) {
    console.error('Error approve expense:', error);
    return res.redirect('/expenses/approvals?error=' + encodeURIComponent('Gagal menyetujui pengeluaran.'));
  }
};

/**
 * Reject Usulan Pengeluaran (Admin Only)
 */
exports.rejectExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { alasanApproval } = req.body;
    const adminId = req.session.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) }
    });

    if (!expense || expense.statusApproval !== 'PENDING') {
      return res.redirect('/expenses/approvals?error=' + encodeURIComponent('Data pengeluaran tidak valid atau sudah diproses.'));
    }

    await prisma.expense.update({
      where: { id: expense.id },
      data: {
        statusApproval: 'REJECTED',
        approvedById: adminId,
        tglApproval: new Date(),
        alasanApproval: alasanApproval ? alasanApproval.trim() : 'Ditolak oleh Wali Kelas'
      }
    });

    return res.redirect('/expenses/approvals?success=' + encodeURIComponent(`Usulan "${expense.judul}" telah DITOLAK.`));
  } catch (error) {
    console.error('Error reject expense:', error);
    return res.redirect('/expenses/approvals?error=' + encodeURIComponent('Gagal menolak usulan pengeluaran.'));
  }
};

/**
 * Hapus Pengeluaran
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });

    if (!expense) {
      return res.redirect('/expenses?error=' + encodeURIComponent('Data tidak ditemukan.'));
    }

    await prisma.$transaction(async (tx) => {
      // Jika yang dihapus berstatus APPROVED, kembalikan saldo kas
      if (expense.statusApproval === 'APPROVED') {
        const keterangan = `Koreksi/Pembatalan Pengeluaran: ${expense.judul}`;
        await recordKasLog('MASUK', expense.nominal, keterangan, tx);
      }

      await tx.expense.delete({
        where: { id: expense.id }
      });
    });

    return res.redirect('/expenses?success=' + encodeURIComponent('Data pengeluaran berhasil dihapus dan saldo disesuaikan.'));
  } catch (error) {
    console.error('Error delete expense:', error);
    return res.redirect('/expenses?error=' + encodeURIComponent('Gagal menghapus pengeluaran.'));
  }
};
