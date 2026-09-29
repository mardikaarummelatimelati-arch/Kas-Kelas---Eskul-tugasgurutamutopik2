const prisma = require('../config/database');
const { getKasSummary } = require('../utils/kasHelper');
const { formatRupiah, formatDate, getStatusBadge } = require('../utils/formatter');

exports.index = async (req, res) => {
  try {
    const { jenisMutasi } = req.query;

    const where = {};
    if (jenisMutasi && ['MASUK', 'KELUAR'].includes(jenisMutasi)) {
      where.jenisMutasi = jenisMutasi;
    }

    const [logs, summary] = await Promise.all([
      prisma.kasLog.findMany({
        where,
        orderBy: { id: 'desc' }
      }),
      getKasSummary()
    ]);

    // Verifikasi integritas saldo audit
    const latestLog = logs[0];
    const isSynchronized = latestLog
      ? Math.abs(latestLog.saldoSesudah - summary.currentBalance) < 0.01
      : true;

    res.render('audit/index', {
      title: 'Audit Log & Rekapitulasi Kas',
      user: req.session.user,
      logs,
      summary,
      isSynchronized,
      selectedJenis: jenisMutasi || 'all',
      formatRupiah,
      formatDate,
      getStatusBadge,
      currentPath: '/audit'
    });
  } catch (error) {
    console.error('Error saat load audit log:', error);
    res.status(500).send('Terjadi kesalahan memuat audit log.');
  }
};

/**
 * Mencetak Laporan Buku Kas Bulanan (Print / PDF)
 */
exports.printReport = async (req, res) => {
  try {
    const { bulan, tahun } = req.query;

    const selectedBulan = bulan || 'Semua';
    const selectedTahun = tahun ? parseInt(tahun) : 2026;

    // Ambil data KasLog berurutan secara kronologis (id asc)
    const logs = await prisma.kasLog.findMany({
      orderBy: { id: 'asc' }
    });

    // Ambil data Admin (Wali Kelas) dan Bendahara untuk ttd laporan
    const [waliKelas, bendaharaUser] = await Promise.all([
      prisma.user.findFirst({ where: { role: 'ADMIN' } }),
      prisma.user.findFirst({ where: { role: 'BENDAHARA' } })
    ]);

    const summary = await getKasSummary();

    // Hitung total mutasi
    let totalMasuk = 0;
    let totalKeluar = 0;

    const formattedRows = logs.map((log, index) => {
      if (log.jenisMutasi === 'MASUK') {
        totalMasuk += log.nominal;
      } else {
        totalKeluar += log.nominal;
      }

      return {
        no: index + 1,
        tanggal: formatDate(log.createdAt, 'short'),
        keterangan: log.keterangan,
        debet: log.jenisMutasi === 'MASUK' ? log.nominal : 0,
        kredit: log.jenisMutasi === 'KELUAR' ? log.nominal : 0,
        saldo: log.saldoSesudah
      };
    });

    res.render('reports/print-buku-kas', {
      title: `Buku Kas Umum - ${selectedBulan} ${selectedTahun}`,
      user: req.session.user,
      logs: formattedRows,
      bulan: selectedBulan,
      tahun: selectedTahun,
      totalMasuk,
      totalKeluar,
      saldoAkhir: summary.currentBalance,
      waliKelas: waliKelas || { nama: 'Wali Kelas', nisn: 'NIP. -' },
      bendahara: bendaharaUser || { nama: 'Bendahara Kelas', nisn: 'NISN. -' },
      formatRupiah,
      formatDate
    });
  } catch (error) {
    console.error('Error saat membuat print report:', error);
    res.status(500).send('Terjadi kesalahan menyiapkan laporan cetak.');
  }
};
