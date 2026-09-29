# Sistem Kas Kelas & Ekstrakurikuler

Sistem Informasi Manajemen Kas Kelas dan Ekstrakurikuler modern berbasis Web dengan arsitektur **Role-Based Access Control (RBAC)**, pencatatan otomatis transaksi (pemasukan & pengeluaran), approval sistem, laporan buku kas, serta transparansi keuangan untuk siswa.

---

## 🌟 Fitur Utama

- **Role-Based Access Control (RBAC)**:
  - **Admin (Wali Kelas / Pembina)**: Kelola periode tagihan, kelola pengguna (Admin/Bendahara/Siswa), verifikasi & approval pengeluaran kas, audit log aktivitas.
  - **Bendahara**: Input pembayaran kas siswa, cetak nota/kuitansi digital, ajukan pengeluaran kas berserta upload bukti nota fisik, lihat rekap dan laporan kas.
  - **Siswa**: Cek status tagihan kas pribadi, riwayat pembayaran, serta transparansi alur kas masuk dan keluar secara real-time.
- **Transparansi & Akuntabilitas**:
  - Audit trail / log aktivitas transaksi.
  - Cetak kuitansi pembayaran siswa.
  - Cetak & ekspor laporan Buku Kas umum.
- **Antarmuka Modern**:
  - Dibangun dengan Tailwind CSS & EJS template engine yang responsif dan user-friendly.

---

## 🛠️ Tech Stack

- **Runtime & Framework**: [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/)
- **ORM & Database**: [Prisma ORM](https://www.prisma.io/), SQLite
- **Template Engine**: [EJS](https://ejs.co/)
- **Styling**: Tailwind CSS
- **Authentication**: Session-based (`express-session`) + `bcryptjs`
- **File Upload**: `multer`

---

## 🚀 Cara Menjalankan Proyek

### 1. Prasyarat
- Pastikan sudah terinstal [Node.js](https://nodejs.org/) (versi 16 atau lebih baru) dan `npm`.

### 2. Clone Repositori
```bash
git clone <URL_REPO_GITHUB>
cd "Kas Kelas & Eskul-tugasgurutamutopik2"
```

### 3. Instal Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment Variable
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi dalam file `.env`:
```env
PORT=3000
DATABASE_URL="file:./dev.db"
SESSION_SECRET="super-secret-kas-kelas-ekskul-key-change-me"
NODE_ENV="development"
```

### 5. Setup Database & Seed Data
Jalankan migrasi database SQLite dan isi data dummy:
```bash
npm run db:setup
```
*Atau jalankan langkah per langkah:*
```bash
npm run prisma:push
npm run prisma:seed
```

### 6. Jalankan Aplikasi
Mode Development:
```bash
npm run dev
```
Mode Production:
```bash
npm start
```
Buka browser dan akses: `http://localhost:3000`

---

## 🔑 Akun Demo (Default Password: `password123`)

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `password123` | Wali Kelas / Pembina |
| **Bendahara** | `bendahara` | `password123` | Bendahara Kelas |
| **Siswa** | `siswa` | `password123` | Siswa / Anggota |

---

## 📁 Struktur Direktori

```text
├── prisma/
│   ├── schema.prisma      # Skema database Prisma
│   └── seed.js            # Script seeding data demo
├── public/
│   ├── css/               # Custom CSS
│   ├── images/            # Aset gambar & ilustrasi
│   └── uploads/receipts/  # Penyimpanan bukti transfer / nota
├── src/
│   ├── config/            # Konfigurasi database Prisma
│   ├── controllers/       # Controller logic aplikasi
│   ├── middlewares/       # Middleware autentikasi & upload
│   ├── routes/            # Rute Express
│   └── utils/             # Helper format tanggal & mata uang
├── views/                 # Template EJS per modul & role
├── server.js              # Entry point server Express
└── package.json
```

---

## 📝 Lisensi
Proyek ini dibuat untuk keperluan tugas dan pembelajaran. Bebas dikembangkan sesuai kebutuhan.
