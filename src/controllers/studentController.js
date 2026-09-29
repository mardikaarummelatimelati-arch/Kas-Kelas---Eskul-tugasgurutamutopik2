const prisma = require('../config/database');
const { getKasSummary } = require('../utils/kasHelper');
const { formatRupiah, formatDate, getStatusBadge } = require('../utils/formatter');

/**
 * Halaman Khusus Tagihan Pribadi Siswa (Lunas / Menunggak)
 */
exports.tagihan = async (req, res) => {
  try {
    const studentId = req.session.user.id;

    const incomes = await prisma.income.findMany({
      where: { studentId },
      include: {
        period: true,
        bendahara: true
      },
      orderBy: { id: 'desc' }
    });

    const totalTagihan = incomes.reduce((sum, item) => sum + item.nominal, 0);
    const totalLunas = incomes
      .filter(i => i.status === 'LUNAS')
      .reduce((sum, item) => sum + item.nominal, 0);
    const totalTunggakan = incomes
      .filter(i => i.status === 'BELUM')
      .reduce((sum, item) => sum + item.nominal, 0);

    const countLunas = incomes.filter(i => i.status === 'LUNAS').length;
    const countBelum = incomes.filter(i => i.status === 'BELUM').length;

    res.render('student/tagihan', {
      title: 'Status Tagihan & Iuran Kas Saya',
      user: req.session.user,
      incomes,
      stats: {
        totalTagihan,
        totalLunas,
        totalTunggakan,
        countLunas,
        countBelum
      },
      formatRupiah,
      formatDate,
      getStatusBadge,
      currentPath: '/student/tagihan'
    });
  } catch (error) {
    console.error('Error saat load tagihan siswa:', error);
    res.status(500).send('Terjadi kesalahan memuat status tagihan.');
  }
};

/**
 * Halaman Transparansi Saldo & Riwayat Pengeluaran Kas Kelas
 */
exports.transparansi = async (req, res) => {
  try {
    const [summary, approvedExpenses, periods] = await Promise.all([
      getKasSummary(),
      prisma.expense.findMany({
        where: { statusApproval: 'APPROVED' },
        orderBy: { tglPengeluaran: 'desc' },
        include: {
          approvedBy: true
        }
      }),
      prisma.kasPeriod.findMany({
        orderBy: { id: 'desc' },
        include: {
          incomes: true
        }
      })
    ]);

    // Breakdown per kategori
    const categoryTotals = {};
    approvedExpenses.forEach(exp => {
      categoryTotals[exp.kategori] = (categoryTotals[exp.kategori] || 0) + exp.nominal;
    });

    res.render('student/transparansi', {
      title: 'Transparansi Saldo & Pengeluaran Kas',
      user: req.session.user,
      summary,
      expenses: approvedExpenses,
      periods,
      categoryTotals,
      formatRupiah,
      formatDate,
      getStatusBadge,
      currentPath: '/student/transparansi'
    });
  } catch (error) {
    console.error('Error saat load transparansi:', error);
    res.status(500).send('Terjadi kesalahan memuat transparansi kas.');
  }
};
