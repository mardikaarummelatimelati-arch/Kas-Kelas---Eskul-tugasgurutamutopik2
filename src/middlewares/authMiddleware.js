/**
 * Authentication and Role-Based Access Control (RBAC) Middlewares
 */

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/auth/login?error=' + encodeURIComponent('Silakan login terlebih dahulu untuk mengakses sistem.'));
}

function isGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return next();
}

/**
 * Checks if the logged in user has one of the allowed roles
 * @param  {...string} roles Allowed roles ('ADMIN', 'BENDAHARA', 'SISWA')
 */
function hasRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login?error=' + encodeURIComponent('Sesi Anda telah berakhir. Silakan login kembali.'));
    }

    const userRole = req.session.user.role;
    if (roles.includes(userRole)) {
      return next();
    }

    // Role unauthorized -> 403 Forbidden
    res.status(403);
    return res.render('errors/403', {
      title: 'Akses Ditolak (403 Forbidden)',
      message: `Role Anda (${userRole}) tidak memiliki izin untuk mengakses halaman atau fitur ini.`,
      user: req.session.user,
      currentPath: req.originalUrl
    });
  };
}

module.exports = {
  isAuthenticated,
  isGuest,
  hasRole
};
