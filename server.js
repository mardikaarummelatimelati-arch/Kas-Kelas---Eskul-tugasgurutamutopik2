const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` SISTEM MANAJEMEN KAS KELAS & EKSTRAKURIKULER BERJALAN `);
  console.log(`=======================================================`);
  console.log(` Server URL : http://localhost:${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Role RBAC  : ADMIN, BENDAHARA, SISWA`);
  console.log(` Siap digunakan & diuji!`);
  console.log(`=======================================================`);
});
