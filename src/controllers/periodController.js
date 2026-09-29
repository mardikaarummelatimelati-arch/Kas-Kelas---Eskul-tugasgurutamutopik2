const prisma = require('../config/database');
const { formatRupiah, formatDate } = require('../utils/formatter');

exports.index = async (req, res) => {
  try {
    const periods = await prisma.kasPeriod.findMany({
      orderBy: [
        { tahun: 'desc' },
        { id: 'desc' }
      ],
      include: {
        incomes: {
          include: {
            student: true
          }
        }
      }
    });

    const periodsWithStats = periods.map(p => {
      const totalSiswa = p.incomes.length;
      const totalLunas = p.incomes.filter(i => i.status === 'LUNAS').length;
      const totalBelum = totalSiswa - totalLunas;
      const terkumpul = p.incomes
        .filter(i => i.status === 'LUNAS')
        .reduce((sum, item) => sum + item.nominal, 0);
      const target = totalSiswa * p.nominalWajib;
      const persentase = totalSiswa > 0 ? Math.round((totalLunas / totalSiswa) * 100) : 0;

      return {
        ...p,
        totalSiswa,
        totalLunas,
        totalBelum,
        terkumpul,
        target,
        persentase
      };
    });

    res.render('periods/index', {
      title: 'Periode Tagihan Iuran Kas',
      user: req.session.user,
      periods: periodsWithStats,
      formatRupiah,
      formatDate,
      success: req.query.success || null,
      error: req.query.error || null,
      currentPath: '/periods'
    });
  } catch (error) {
    console.error('Error saat load periods:', error);
    res.status(500).send('Terjadi kesalahan memuat data periode.');
  }
};

exports.create = async (req, res) => {
  try {
    const { namaPeriode, nominalWajib, bulan, tahun, generateTagihan } = req.body;

    if (!namaPeriode || !nominalWajib || !bulan || !tahun) {
      return res.redirect('/periods?error=' + encodeURIComponent('Semua field wajib diisi lengkap!'));
    }

    const nominalNum = parseFloat(nominalWajib);
    const tahunNum = parseInt(tahun);

    // Buat periode baru
    const newPeriod = await prisma.kasPeriod.create({
      data: {
        namaPeriode: namaPeriode.trim(),
        nominalWajib: nominalNum,
        bulan: bulan.trim(),
        tahun: tahunNum
      }
    });

    // Otomatis generate tagihan awal ke seluruh siswa aktif
    if (generateTagihan === 'true' || generateTagihan === 'on' || generateTagihan === true) {
      const activeStudents = await prisma.user.findMany({
        where: { role: 'SISWA' }
      });

      if (activeStudents.length > 0) {
        const incomeRecords = activeStudents.map(student => ({
          periodId: newPeriod.id,
          studentId: student.id,
          nominal: nominalNum,
          status: 'BELUM',
          catatan: `Tagihan awal ${namaPeriode}`
        }));

        await prisma.income.createMany({
          data: incomeRecords
        });
      }
    }

    return res.redirect('/periods?success=' + encodeURIComponent(`Periode ${namaPeriode} berhasil ditambahkan dan tagihan dibuat!`));
  } catch (error) {
    console.error('Error saat create period:', error);
    return res.redirect('/periods?error=' + encodeURIComponent('Gagal membuat periode tagihan kas.'));
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { namaPeriode, nominalWajib, bulan, tahun } = req.body;

    await prisma.kasPeriod.update({
      where: { id: parseInt(id) },
      data: {
        namaPeriode: namaPeriode.trim(),
        nominalWajib: parseFloat(nominalWajib),
        bulan: bulan.trim(),
        tahun: parseInt(tahun)
      }
    });

    return res.redirect('/periods?success=' + encodeURIComponent('Periode tagihan berhasil diperbarui!'));
  } catch (error) {
    console.error('Error update period:', error);
    return res.redirect('/periods?error=' + encodeURIComponent('Gagal memperbarui periode tagihan.'));
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.kasPeriod.delete({
      where: { id: parseInt(id) }
    });

    return res.redirect('/periods?success=' + encodeURIComponent('Periode tagihan dan riwayat terkait berhasil dihapus.'));
  } catch (error) {
    console.error('Error delete period:', error);
    return res.redirect('/periods?error=' + encodeURIComponent('Gagal menghapus periode.'));
  }
};
