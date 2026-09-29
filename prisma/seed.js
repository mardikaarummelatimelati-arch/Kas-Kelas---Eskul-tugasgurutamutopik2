const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Memulai Seeding Data Sistem Kas Kelas & Ekskul ---');

  // Bersihkan data lama jika ada
  await prisma.kasLog.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.income.deleteMany({});
  await prisma.kasPeriod.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Buat User Demo 3 Level RBAC + Siswa Kelas
  console.log('1. Menambahkan User...');
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: defaultPassword,
      nama: 'Drs. H. Bambang Sudarsono, M.Pd.',
      role: 'ADMIN',
      nisn: '197805122005011003',
      kelas: 'Wali Kelas XII RPL 1'
    }
  });

  const bendahara = await prisma.user.create({
    data: {
      username: 'bendahara',
      password: defaultPassword,
      nama: 'Sarah Amelia Putri',
      role: 'BENDAHARA',
      nisn: '0068492011',
      kelas: 'XII RPL 1'
    }
  });

  const siswaDemo = await prisma.user.create({
    data: {
      username: 'siswa',
      password: defaultPassword,
      nama: 'Muhammad Rizky Pratama',
      role: 'SISWA',
      nisn: '0068492012',
      kelas: 'XII RPL 1'
    }
  });

  const studentList = [
    { username: 'adinda', nama: 'Adinda Safitri', nisn: '0068492013' },
    { username: 'budi', nama: 'Budi Santoso', nisn: '0068492014' },
    { username: 'citra', nama: 'Citra Dewi Lestari', nisn: '0068492015' },
    { username: 'dimas', nama: 'Dimas Arya Putra', nisn: '0068492016' },
    { username: 'farhan', nama: 'Farhan Maulana', nisn: '0068492017' }
  ];

  const students = [siswaDemo];
  for (const s of studentList) {
    const created = await prisma.user.create({
      data: {
        username: s.username,
        password: defaultPassword,
        nama: s.nama,
        role: 'SISWA',
        nisn: s.nisn,
        kelas: 'XII RPL 1'
      }
    });
    students.push(created);
  }

  // 2. Buat Master Periode Tagihan Kas
  console.log('2. Menambahkan Master Periode Tagihan...');
  const periodAgustus = await prisma.kasPeriod.create({
    data: {
      namaPeriode: 'Kas Wajib Bulan Agustus 2026',
      nominalWajib: 20000,
      bulan: 'Agustus',
      tahun: 2026
    }
  });

  const periodSeptember = await prisma.kasPeriod.create({
    data: {
      namaPeriode: 'Kas Wajib Bulan September 2026',
      nominalWajib: 20000,
      bulan: 'September',
      tahun: 2026
    }
  });

  const periodClassmeeting = await prisma.kasPeriod.create({
    data: {
      namaPeriode: 'Iuran Persiapan Kebersihan & Classmeeting',
      nominalWajib: 15000,
      bulan: 'September',
      tahun: 2026
    }
  });

  // 3. Buat Pembayaran Kas Masuk (Incomes)
  console.log('3. Menambahkan Riwayat Pembayaran Kas Siswa...');
  let totalMasuk = 0;

  // Periode Agustus (Semua lunas)
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    await prisma.income.create({
      data: {
        periodId: periodAgustus.id,
        studentId: student.id,
        nominal: 20000,
        tglBayar: new Date('2026-08-05T08:30:00Z'),
        status: 'LUNAS',
        bendaharaId: bendahara.id,
        metodeBayar: 'TUNAI',
        catatan: 'Pembayaran kas bulan Agustus'
      }
    });
    totalMasuk += 20000;
  }

  // Periode September (Sebagian lunas, sebagian belum)
  // Rizky (siswaDemo) lunas
  await prisma.income.create({
    data: {
      periodId: periodSeptember.id,
      studentId: siswaDemo.id,
      nominal: 20000,
      tglBayar: new Date('2026-09-05T09:15:00Z'),
      status: 'LUNAS',
      bendaharaId: bendahara.id,
      metodeBayar: 'TUNAI',
      catatan: 'Lunas iuran September'
    }
  });
  totalMasuk += 20000;

  // Adinda lunas
  await prisma.income.create({
    data: {
      periodId: periodSeptember.id,
      studentId: students[1].id,
      nominal: 20000,
      tglBayar: new Date('2026-09-08T10:00:00Z'),
      status: 'LUNAS',
      bendaharaId: bendahara.id,
      metodeBayar: 'TRANSFER',
      catatan: 'Transfer via QRIS kelas'
    }
  });
  totalMasuk += 20000;

  // Budi santoso - belum lunas
  await prisma.income.create({
    data: {
      periodId: periodSeptember.id,
      studentId: students[2].id,
      nominal: 20000,
      status: 'BELUM',
      catatan: 'Menunggu uang saku tanggal 30'
    }
  });

  // Citra Dewi - lunas
  await prisma.income.create({
    data: {
      periodId: periodSeptember.id,
      studentId: students[3].id,
      nominal: 20000,
      tglBayar: new Date('2026-09-12T11:20:00Z'),
      status: 'LUNAS',
      bendaharaId: bendahara.id,
      metodeBayar: 'TUNAI',
      catatan: 'Lunas'
    }
  });
  totalMasuk += 20000;

  // Dimas - belum lunas
  await prisma.income.create({
    data: {
      periodId: periodSeptember.id,
      studentId: students[4].id,
      nominal: 20000,
      status: 'BELUM',
      catatan: 'Belum dibayar'
    }
  });

  // Farhan - lunas
  await prisma.income.create({
    data: {
      periodId: periodSeptember.id,
      studentId: students[5].id,
      nominal: 20000,
      tglBayar: new Date('2026-09-15T08:00:00Z'),
      status: 'LUNAS',
      bendaharaId: bendahara.id,
      metodeBayar: 'TUNAI',
      catatan: 'Lunas'
    }
  });
  totalMasuk += 20000;

  // Periode Classmeeting
  // Siswa demo (Rizky) BELUM Lunas - untuk pengujian tunggakan siswa
  await prisma.income.create({
    data: {
      periodId: periodClassmeeting.id,
      studentId: siswaDemo.id,
      nominal: 15000,
      status: 'BELUM',
      catatan: 'Tagihan iuran tambahan kegiatan'
    }
  });

  // Adinda lunas
  await prisma.income.create({
    data: {
      periodId: periodClassmeeting.id,
      studentId: students[1].id,
      nominal: 15000,
      tglBayar: new Date('2026-09-18T13:00:00Z'),
      status: 'LUNAS',
      bendaharaId: bendahara.id,
      metodeBayar: 'TUNAI',
      catatan: 'Iuran classmeeting'
    }
  });
  totalMasuk += 15000;

  // 4. Buat Pengeluaran (Expenses)
  console.log('4. Menambahkan Pengeluaran Kas (Belanja & Usulan)...');
  let totalKeluar = 0;

  // Pengeluaran 1: Approved
  await prisma.expense.create({
    data: {
      judul: 'Pembelian Spidol Whiteboard & Penghapus',
      nominal: 35000,
      kategori: 'Peralatan Kelas',
      tglPengeluaran: new Date('2026-08-15T10:30:00Z'),
      fotoNotaUrl: '/images/nota-spidol.svg',
      deskripsi: 'Beli 3 buah spidol Snowman boardmarker hitam & biru + 1 penghapus magnet',
      statusApproval: 'APPROVED',
      createdById: bendahara.id,
      approvedById: admin.id,
      tglApproval: new Date('2026-08-15T11:00:00Z'),
      alasanApproval: 'Disetujui untuk kelancaran KBM'
    }
  });
  totalKeluar += 35000;

  // Pengeluaran 2: Approved
  await prisma.expense.create({
    data: {
      judul: 'Alat Kebersihan (Sapu Ijuk, Pel & Karbol)',
      nominal: 50000,
      kategori: 'Kebersihan',
      tglPengeluaran: new Date('2026-08-25T14:15:00Z'),
      fotoNotaUrl: '/images/nota-kebersihan.svg',
      deskripsi: 'Penggantian sapu ijuk yang patah dan isi ulang pewangi lantai kelas',
      statusApproval: 'APPROVED',
      createdById: bendahara.id,
      approvedById: admin.id,
      tglApproval: new Date('2026-08-25T15:00:00Z'),
      alasanApproval: 'Disetujui agar kelas tetap bersih & nyaman'
    }
  });
  totalKeluar += 50000;

  // Pengeluaran 3: Approved
  await prisma.expense.create({
    data: {
      judul: 'Fotokopi Modul Praktik & Absensi Piket',
      nominal: 45000,
      kategori: 'Fotokopi',
      tglPengeluaran: new Date('2026-09-10T09:45:00Z'),
      fotoNotaUrl: '/images/nota-fotokopi.svg',
      deskripsi: 'Fotokopi materi pelajaran tamu industri dan form ceklis kebersihan piket',
      statusApproval: 'APPROVED',
      createdById: bendahara.id,
      approvedById: admin.id,
      tglApproval: new Date('2026-09-10T10:00:00Z'),
      alasanApproval: 'Disetujui'
    }
  });
  totalKeluar += 45000;

  // Pengeluaran 4: PENDING (Usulan Pengeluaran Dana Besar > Rp 150.000)
  await prisma.expense.create({
    data: {
      judul: 'Usulan Pengadaan Kipas Angin Dinding Cosmos 16 Inch',
      nominal: 285000,
      kategori: 'Peralatan Kelas',
      tglPengeluaran: new Date('2026-09-24T11:00:00Z'),
      fotoNotaUrl: '/images/nota-kipas.svg',
      deskripsi: 'Ruang kelas sangat panas saat siang hari. Diusulkan membeli kipas dinding beserta kabel roll dan pemasangan oleh teknisi sekolah.',
      statusApproval: 'PENDING',
      createdById: bendahara.id
    }
  });

  // 5. Buat KasLog Riwayat Mutasi Saldo
  console.log('5. Mengisi KasLog Audit Trail...');
  let rollingSaldo = 0;

  // Log 1: Kas Masuk Awal Agustus
  const mutasi1 = 120000;
  await prisma.kasLog.create({
    data: {
      saldoSebelum: rollingSaldo,
      saldoSesudah: rollingSaldo + mutasi1,
      jenisMutasi: 'MASUK',
      nominal: mutasi1,
      keterangan: 'Penerimaan Iuran Kas Wajib Bulan Agustus 2026 (6 Siswa)',
      createdAt: new Date('2026-08-14T17:00:00Z')
    }
  });
  rollingSaldo += mutasi1;

  // Log 2: Belanja Spidol
  const mutasi2 = 35000;
  await prisma.kasLog.create({
    data: {
      saldoSebelum: rollingSaldo,
      saldoSesudah: rollingSaldo - mutasi2,
      jenisMutasi: 'KELUAR',
      nominal: mutasi2,
      keterangan: 'Belanja Pembelian Spidol Whiteboard & Penghapus',
      createdAt: new Date('2026-08-15T11:05:00Z')
    }
  });
  rollingSaldo -= mutasi2;

  // Log 3: Belanja Alat Kebersihan
  const mutasi3 = 50000;
  await prisma.kasLog.create({
    data: {
      saldoSebelum: rollingSaldo,
      saldoSesudah: rollingSaldo - mutasi3,
      jenisMutasi: 'KELUAR',
      nominal: mutasi3,
      keterangan: 'Belanja Alat Kebersihan (Sapu Ijuk, Pel & Karbol)',
      createdAt: new Date('2026-08-25T15:05:00Z')
    }
  });
  rollingSaldo -= mutasi3;

  // Log 4: Kas Masuk September
  const mutasi4 = 80000;
  await prisma.kasLog.create({
    data: {
      saldoSebelum: rollingSaldo,
      saldoSesudah: rollingSaldo + mutasi4,
      jenisMutasi: 'MASUK',
      nominal: mutasi4,
      keterangan: 'Penerimaan Iuran Kas Bulan September 2026 (4 Siswa)',
      createdAt: new Date('2026-09-15T09:00:00Z')
    }
  });
  rollingSaldo += mutasi4;

  // Log 5: Belanja Fotokopi
  const mutasi5 = 45000;
  await prisma.kasLog.create({
    data: {
      saldoSebelum: rollingSaldo,
      saldoSesudah: rollingSaldo - mutasi5,
      jenisMutasi: 'KELUAR',
      nominal: mutasi5,
      keterangan: 'Biaya Fotokopi Modul Praktik & Absensi Piket',
      createdAt: new Date('2026-09-10T10:05:00Z')
    }
  });
  rollingSaldo -= mutasi5;

  // Log 6: Iuran Classmeeting
  const mutasi6 = 15000;
  await prisma.kasLog.create({
    data: {
      saldoSebelum: rollingSaldo,
      saldoSesudah: rollingSaldo + mutasi6,
      jenisMutasi: 'MASUK',
      nominal: mutasi6,
      keterangan: 'Penerimaan Iuran Classmeeting (Adinda Safitri)',
      createdAt: new Date('2026-09-18T13:05:00Z')
    }
  });
  rollingSaldo += mutasi6;

  console.log(`--- Seeding Selesai! ---`);
  console.log(`Total Pemasukan: Rp ${totalMasuk.toLocaleString('id-ID')}`);
  console.log(`Total Pengeluaran Disetujui: Rp ${totalKeluar.toLocaleString('id-ID')}`);
  console.log(`Saldo Kas Terkini: Rp ${(totalMasuk - totalKeluar).toLocaleString('id-ID')}`);
  console.log(`Akun Siap Digunakan:`);
  console.log(`1. Admin     : username 'admin'     | password 'password123'`);
  console.log(`2. Bendahara : username 'bendahara' | password 'password123'`);
  console.log(`3. Siswa     : username 'siswa'     | password 'password123'`);
}

main()
  .catch((e) => {
    console.error('Error saat seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
