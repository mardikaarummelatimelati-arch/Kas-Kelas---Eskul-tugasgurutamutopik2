const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

exports.index = async (req, res) => {
  try {
    const { role, search } = req.query;

    const where = {};
    if (role && ['ADMIN', 'BENDAHARA', 'SISWA'].includes(role)) {
      where.role = role;
    }
    if (search && search.trim() !== '') {
      where.OR = [
        { nama: { contains: search.trim() } },
        { username: { contains: search.trim() } },
        { nisn: { contains: search.trim() } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { role: 'asc' },
        { nama: 'asc' }
      ]
    });

    const counts = {
      all: await prisma.user.count(),
      admin: await prisma.user.count({ where: { role: 'ADMIN' } }),
      bendahara: await prisma.user.count({ where: { role: 'BENDAHARA' } }),
      siswa: await prisma.user.count({ where: { role: 'SISWA' } })
    };

    res.render('users/index', {
      title: 'Manajemen Pengguna (User RBAC)',
      user: req.session.user,
      users,
      counts,
      selectedRole: role || '',
      searchQuery: search || '',
      success: req.query.success || null,
      error: req.query.error || null,
      currentPath: '/users'
    });
  } catch (error) {
    console.error('Error saat load daftar user:', error);
    res.status(500).send('Terjadi kesalahan memuat data pengguna.');
  }
};

exports.create = async (req, res) => {
  try {
    const { username, password, nama, role, nisn, kelas } = req.body;

    if (!username || !password || !nama || !role) {
      return res.redirect('/users?error=' + encodeURIComponent('Field username, password, nama, dan role wajib diisi!'));
    }

    // Check unique username
    const existing = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() }
    });
    if (existing) {
      return res.redirect('/users?error=' + encodeURIComponent('Username sudah digunakan, silakan pilih yang lain.'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        password: hashedPassword,
        nama: nama.trim(),
        role,
        nisn: nisn ? nisn.trim() : null,
        kelas: kelas ? kelas.trim() : null
      }
    });

    return res.redirect('/users?success=' + encodeURIComponent(`User ${nama} (${role}) berhasil ditambahkan!`));
  } catch (error) {
    console.error('Error create user:', error);
    return res.redirect('/users?error=' + encodeURIComponent('Gagal menambahkan pengguna.'));
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, role, nisn, kelas, password } = req.body;

    const data = {
      nama: nama.trim(),
      role,
      nisn: nisn ? nisn.trim() : null,
      kelas: kelas ? kelas.trim() : null
    };

    if (password && password.trim() !== '') {
      data.password = await bcrypt.hash(password.trim(), 10);
    }

    await prisma.user.update({
      where: { id: parseInt(id) },
      data
    });

    return res.redirect('/users?success=' + encodeURIComponent('Data pengguna berhasil diperbarui!'));
  } catch (error) {
    console.error('Error update user:', error);
    return res.redirect('/users?error=' + encodeURIComponent('Gagal memperbarui pengguna.'));
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Don't allow user to delete themselves
    if (req.session.user.id === userId) {
      return res.redirect('/users?error=' + encodeURIComponent('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.'));
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return res.redirect('/users?success=' + encodeURIComponent('Pengguna berhasil dihapus.'));
  } catch (error) {
    console.error('Error delete user:', error);
    return res.redirect('/users?error=' + encodeURIComponent('Gagal menghapus pengguna. Periksa apakah user memiliki riwayat transaksi.'));
  }
};
