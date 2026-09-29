/**
 * Utility Formatter Functions for Kas Kelas & Ekskul
 */

function formatRupiah(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

function formatDate(date, format = 'full') {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  if (format === 'short') {
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  if (format === 'time') {
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getStatusBadge(status) {
  switch (status) {
    case 'LUNAS':
    case 'APPROVED':
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        label: status === 'LUNAS' ? 'Lunas' : 'Disetujui',
        icon: 'check-circle'
      };
    case 'PENDING':
    case 'BELUM':
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-200',
        label: status === 'BELUM' ? 'Menunggak' : 'Menunggu Approval',
        icon: 'clock'
      };
    case 'REJECTED':
      return {
        bg: 'bg-rose-100',
        text: 'text-rose-800',
        border: 'border-rose-200',
        label: 'Ditolak',
        icon: 'x-circle'
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-200',
        label: status,
        icon: 'info'
      };
  }
}

function terbilang(nominal) {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  const n = Math.floor(Math.abs(Number(nominal)));
  if (isNaN(n) || n === 0) return 'Nol Rupiah';

  function konversi(angka) {
    if (angka < 12) {
      return ' ' + bilangan[angka];
    } else if (angka < 20) {
      return konversi(angka - 10) + ' Belas';
    } else if (angka < 100) {
      return konversi(Math.floor(angka / 10)) + ' Puluh' + konversi(angka % 10);
    } else if (angka < 200) {
      return ' Seratus' + konversi(angka - 100);
    } else if (angka < 1000) {
      return konversi(Math.floor(angka / 100)) + ' Ratus' + konversi(angka % 100);
    } else if (angka < 2000) {
      return ' Seribu' + konversi(angka - 1000);
    } else if (angka < 1000000) {
      return konversi(Math.floor(angka / 1000)) + ' Ribu' + konversi(angka % 1000);
    } else if (angka < 1000000000) {
      return konversi(Math.floor(angka / 1000000)) + ' Juta' + konversi(angka % 1000000);
    } else if (angka < 1000000000000) {
      return konversi(Math.floor(angka / 1000000000)) + ' Milyar' + konversi(angka % 1000000000);
    }
    return '';
  }

  return (konversi(n).trim() + ' Rupiah').replace(/\s+/g, ' ');
}

module.exports = {
  formatRupiah,
  formatDate,
  getStatusBadge,
  terbilang
};

