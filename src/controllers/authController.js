const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

exports.showLogin = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }

  const error = req.query.error || null;
  const success = req.query.success || null;

  res.render('auth/login', {
    title: 'Login Sistem Kas Kelas & Ekskul',
    error,
    success
  });
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.render('auth/login', {
        title: 'Login Sistem Kas Kelas & Ekskul',
        error: 'Username dan password wajib diisi!',
        success: null,
        username
      });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() }
    });

    if (!user) {
      return res.render('auth/login', {
        title: 'Login Sistem Kas Kelas & Ekskul',
        error: 'Username tidak ditemukan.',
        success: null,
        username
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login Sistem Kas Kelas & Ekskul',
        error: 'Password yang Anda masukkan salah.',
        success: null,
        username
      });
    }

    // Set session user (exclude password hash)
    req.session.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      nisn: user.nisn,
      kelas: user.kelas
    };

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Error saat login:', error);
    res.render('auth/login', {
      title: 'Login Sistem Kas Kelas & Ekskul',
      error: 'Terjadi kesalahan sistem saat memproses login.',
      success: null
    });
  }
};

/**
 * 1-Click Quick Login for Evaluator / Testing
 */
exports.quickLogin = async (req, res) => {
  try {
    const { role } = req.params;
    let targetUsername = 'admin';

    if (role === 'bendahara') targetUsername = 'bendahara';
    if (role === 'siswa') targetUsername = 'siswa';

    const user = await prisma.user.findUnique({
      where: { username: targetUsername }
    });

    if (!user) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Akun demo tidak ditemukan'));
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      nisn: user.nisn,
      kelas: user.kelas
    };

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Error saat quick login:', error);
    res.redirect('/auth/login?error=' + encodeURIComponent('Gagal melakukan quick login demo'));
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Gagal destroy session:', err);
    }
    res.redirect('/auth/login?success=' + encodeURIComponent('Anda telah berhasil keluar dari sistem.'));
  });
};
