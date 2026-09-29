const prisma = require('../config/database');
const { recordKasLog } = require('../utils/kasHelper');
const { formatRupiah, formatDate, getStatusBadge, terbilang } = require('../utils/formatter');

exports.index = async (req, res) => {
  try {
    const { periodId, status, search } = req.query;

    const where = {};
    if (periodId && periodId !== 'all') {
      where.periodId = parseInt(periodId);
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search && search.trim() !== '') {
      where.student = {
        OR: [
          { nama: { contains: search.trim() } },
          { username: { contains: search.trim() } },
          { nisn: { contains: search.trim() } }
        ]
      };
    }

    const [incomes, periods, students] = await Promise.all([
      prisma.income.findMany({
        where,
        include: {
          period: true,
          student: true,
          bendahara: true
        },
        orderBy: [
          { periodId: 'desc' },
          { status: 'asc' },
          { id: 'asc' }
        ]
      }),
      prisma.kasPeriod.findMany({
        orderBy: { id: 'desc' }
      }),
      prisma.user.findMany({
        where: { role: 'SISWA' },
        orderBy: { nama: 'asc' }
      })
    ]);

    // Statistics
    const totalSemua = incomes.length;
    const totalLunas = incomes.filter(i => i.status === 'LUNAS').length;
    const totalMenunggak = incomes.filter(i => i.status === 'BELUM').length;
    const nominalTerkumpul = incomes
      .filter(i => i.status === 'LUNAS')
      .reduce((sum, item) => sum + item.nominal, 0);

    res.render('incomes/index', {
      title: 'Pencatatan Kas Masuk (Iuran Siswa)',
      user: req.session.user,
      incomes,
      periods,
      students,
      stats: {
        totalSemua,
        totalLunas,
        totalMenunggak,
        nominalTerkumpul
      },
      selectedPeriod: periodId || 'all',
      selectedStatus: status || 'all',
      searchQuery: search || '',
      formatRupiah,
      formatDate,
      getStatusBadge,
      success: req.query.success || null,
      error: req.query.error || null,
      currentPath: '/incomes'
    });
  } catch (error) {
    console.error('Error saat load data kas masuk:', error);
    res.status(500).send('Terjadi kesalahan memuat data pembayaran.');
  }
};

/**
 * Catat / Update Pembayaran dari Siswa (Tandai LUNAS)
 */
exports.markPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { nominal, metodeBayar, tglBayar, catatan } = req.body;
    const bendaharaId = req.session.user.id;

    const income = await prisma.income.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: true,
        period: true
      }
    });

    if (!income) {
      return res.redirect('/incomes?error=' + encodeURIComponent('Data tagihan tidak ditemukan.'));
    }

    if (income.status === 'LUNAS') {
      return res.redirect('/incomes?error=' + encodeURIComponent('Tagihan ini sudah berstatus LUNAS.'));
    }

    const nominalValue = nominal ? parseFloat(nominal) : income.nominal;
    const paymentDate = tglBayar ? new Date(tglBayar) : new Date();

    // Gunakan prisma transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update status Income jadi LUNAS
      await tx.income.update({
        where: { id: income.id },
        data: {
          nominal: nominalValue,
          status: 'LUNAS',
          tglBayar: paymentDate,
          metodeBayar: metodeBayar || 'TUNAI',
          catatan: catatan ? catatan.trim() : income.catatan,
          bendaharaId
        }
      });

      // 2. Catat mutasi Kas Masuk ke KasLog
      const keterangan = `Penerimaan Iuran ${income.period.namaPeriode} dari ${income.student.nama} (${income.student.kelas || 'Siswa'})`;
      await recordKasLog('MASUK', nominalValue, keterangan, tx);
    });

    return res.redirect('/incomes?success=' + encodeURIComponent(`Pembayaran ${income.student.nama} sebesar ${formatRupiah(nominalValue)} berhasil dicatat & LUNAS!`));
  } catch (error) {
    console.error('Error catat pembayaran:', error);
    return res.redirect('/incomes?error=' + encodeURIComponent('Gagal mencatat pembayaran kas masuk.'));
  }
};

/**
 * Batalkan status lunas jika salah input
 */
exports.revertPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const income = await prisma.income.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: true,
        period: true
      }
    });

    if (!income || income.status !== 'LUNAS') {
      return res.redirect('/incomes?error=' + encodeURIComponent('Hanya tagihan LUNAS yang dapat dibatalkan.'));
    }

    await prisma.$transaction(async (tx) => {
      // Revert status
      await tx.income.update({
        where: { id: income.id },
        data: {
          status: 'BELUM',
          tglBayar: null,
          bendaharaId: null
        }
      });

      // Potong kembali saldo di KasLog (koreksi mutasi)
      const keterangan = `Koreksi/Pembatalan Pembayaran ${income.period.namaPeriode} siswa ${income.student.nama}`;
      await recordKasLog('KELUAR', income.nominal, keterangan, tx);
    });

    return res.redirect('/incomes?success=' + encodeURIComponent(`Pembayaran ${income.student.nama} berhasil dibatalkan dan saldo kas disinkronkan kembali.`));
  } catch (error) {
    console.error('Error revert payment:', error);
    return res.redirect('/incomes?error=' + encodeURIComponent('Gagal membatalkan pembayaran.'));
  }
};

/**
 * Buat Tagihan Kas Masuk Manual
 */
exports.createManual = async (req, res) => {
  try {
    const { periodId, studentId, nominal, status, metodeBayar, catatan } = req.body;
    const bendaharaId = req.session.user.id;

    const isLunas = status === 'LUNAS';
    const nominalNum = parseFloat(nominal);

    await prisma.$transaction(async (tx) => {
      const created = await tx.income.create({
        data: {
          periodId: parseInt(periodId),
          studentId: parseInt(studentId),
          nominal: nominalNum,
          status: isLunas ? 'LUNAS' : 'BELUM',
          tglBayar: isLunas ? new Date() : null,
          bendaharaId: isLunas ? bendaharaId : null,
          metodeBayar: metodeBayar || 'TUNAI',
          catatan: catatan ? catatan.trim() : null
        },
        include: {
          student: true,
          period: true
        }
      });

      if (isLunas) {
        const keterangan = `Penerimaan Iuran ${created.period.namaPeriode} dari ${created.student.nama}`;
        await recordKasLog('MASUK', nominalNum, keterangan, tx);
      }
    });

    return res.redirect('/incomes?success=' + encodeURIComponent('Tagihan kas masuk berhasil ditambahkan!'));
  } catch (error) {
    console.error('Error create manual income:', error);
    return res.redirect('/incomes?error=' + encodeURIComponent('Gagal menambahkan data kas masuk manual.'));
  }
};

/**
 * Tampilkan Bukti Pembayaran / Kuitansi Digital (Unduh / Print)
 */
exports.showReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;

    const income = await prisma.income.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: true,
        period: true,
        bendahara: true
      }
    });

    if (!income) {
      return res.status(404).send('Bukti pembayaran tidak ditemukan.');
    }

    // Role check: Siswa can only view their own receipts
    if (user.role === 'SISWA' && income.studentId !== user.id) {
      return res.status(403).send('Anda tidak memiliki akses untuk melihat kuitansi siswa lain.');
    }

    // Format nomor kuitansi resmi
    const dateObj = income.tglBayar ? new Date(income.tglBayar) : new Date(income.createdAt);
    const yyyymmdd = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
    const receiptNo = `KWT-${yyyymmdd}-${String(income.id).padStart(4, '0')}`;

    res.render('incomes/receipt', {
      title: `Kuitansi Digital #${receiptNo}`,
      user,
      income,
      receiptNo,
      nominalTerbilang: terbilang(income.nominal),
      formatRupiah,
      formatDate
    });
  } catch (error) {
    console.error('Error saat load kuitansi:', error);
    res.status(500).send('Terjadi kesalahan memuat kuitansi digital.');
  }
};
