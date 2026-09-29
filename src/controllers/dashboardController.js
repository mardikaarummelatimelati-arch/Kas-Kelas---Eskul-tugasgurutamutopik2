const prisma = require('../config/database');
const { getKasSummary } = require('../utils/kasHelper');
const { formatRupiah, formatDate, getStatusBadge } = require('../utils/formatter');

exports.index = async (req, res) => {
  try {
    const user = req.session.user;
    const summary = await getKasSummary();

    if (user.role === 'ADMIN') {
      // Data untuk Admin Dashboard
      const [pendingExpenses, recentLogs, totalUsers, totalPeriods, categoryExpenses] = await Promise.all([
        prisma.expense.findMany({
          where: { statusApproval: 'PENDING' },
          include: { createdBy: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.kasLog.findMany({
          orderBy: { id: 'desc' },
          take: 7
        }),
        prisma.user.count({ where: { role: 'SISWA' } }),
        prisma.kasPeriod.count(),
        prisma.expense.groupBy({
          by: ['kategori'],
          where: { statusApproval: 'APPROVED' },
          _sum: { nominal: true }
        })
      ]);

      return res.render('dashboard/admin', {
        title: 'Dashboard Wali Kelas / Pembina',
        user,
        summary,
        pendingExpenses,
        recentLogs,
        totalUsers,
        totalPeriods,
        categoryExpenses,
        formatRupiah,
        formatDate,
        getStatusBadge,
        currentPath: '/dashboard'
      });
    }

    if (user.role === 'BENDAHARA') {
      // Data untuk Bendahara Dashboard
      const [periods, recentIncomes, recentExpenses, totalSiswa] = await Promise.all([
        prisma.kasPeriod.findMany({
          orderBy: { id: 'desc' },
          include: {
            incomes: true
          },
          take: 3
        }),
        prisma.income.findMany({
          where: { status: 'LUNAS' },
          include: {
            student: true,
            period: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 6
        }),
        prisma.expense.findMany({
          orderBy: { tglPengeluaran: 'desc' },
          take: 5
        }),
        prisma.user.count({ where: { role: 'SISWA' } })
      ]);

      // Calculate collection rate per period
      const periodsWithStats = periods.map(p => {
        const totalTagihan = p.incomes.length;
        const totalLunas = p.incomes.filter(i => i.status === 'LUNAS').length;
        const persentase = totalTagihan > 0 ? Math.round((totalLunas / totalTagihan) * 100) : 0;
        return {
          ...p,
          totalTagihan,
          totalLunas,
          persentase
        };
      });

      return res.render('dashboard/bendahara', {
        title: 'Dashboard Bendahara Kelas',
        user,
        summary,
        periods: periodsWithStats,
        recentIncomes,
        recentExpenses,
        totalSiswa,
        formatRupiah,
        formatDate,
        getStatusBadge,
        currentPath: '/dashboard'
      });
    }

    if (user.role === 'SISWA') {
      // Data untuk Siswa Dashboard
      const [myIncomes, recentApprovedExpenses] = await Promise.all([
        prisma.income.findMany({
          where: { studentId: user.id },
          include: {
            period: true,
            bendahara: true
          },
          orderBy: { id: 'desc' }
        }),
        prisma.expense.findMany({
          where: { statusApproval: 'APPROVED' },
          orderBy: { tglPengeluaran: 'desc' },
          take: 5
        })
      ]);

      const myPaid = myIncomes
        .filter(i => i.status === 'LUNAS')
        .reduce((acc, curr) => acc + curr.nominal, 0);

      const myUnpaid = myIncomes
        .filter(i => i.status === 'BELUM')
        .reduce((acc, curr) => acc + curr.nominal, 0);

      return res.render('dashboard/siswa', {
        title: 'Dashboard Transparansi Kas Siswa',
        user,
        summary,
        myIncomes,
        myPaid,
        myUnpaid,
        recentApprovedExpenses,
        formatRupiah,
        formatDate,
        getStatusBadge,
        currentPath: '/dashboard'
      });
    }

    // Default fallback
    return res.redirect('/auth/login');
  } catch (error) {
    console.error('Error saat load dashboard:', error);
    res.status(500).send('Terjadi kesalahan saat memuat dashboard.');
  }
};
