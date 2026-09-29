const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const periodRoutes = require('./routes/periodRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const auditRoutes = require('./routes/auditRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();

// Body Parser Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static Files
app.use(express.static(path.join(__dirname, '../public')));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'kas-kelas-ekskul-secret-key-default',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24 jam
  }
}));

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Global Template Variables
app.use((req, res, next) => {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.currentPath = req.path;
  next();
});

// Mount Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/users', userRoutes);
app.use('/periods', periodRoutes);
app.use('/incomes', incomeRoutes);
app.use('/expenses', expenseRoutes);
app.use('/audit', auditRoutes);
app.use('/student', studentRoutes);

// Root Redirect
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/auth/login');
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: 'Halaman Tidak Ditemukan (404)',
    user: req.session ? req.session.user : null,
    currentPath: req.originalUrl
  });
});

// 500 Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).render('errors/404', {
    title: 'Terjadi Kesalahan Server (500)',
    user: req.session ? req.session.user : null,
    currentPath: req.originalUrl,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
