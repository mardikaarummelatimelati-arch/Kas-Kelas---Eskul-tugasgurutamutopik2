const prisma = require('../config/database');

/**
 * Calculates current total Kas summary:
 * - totalIncome (all LUNAS payments)
 * - totalExpense (all APPROVED expenses)
 * - currentBalance = totalIncome - totalExpense
 * - pendingExpensesCount
 */
async function getKasSummary() {
  // Sum of all LUNAS incomes
  const incomeResult = await prisma.income.aggregate({
    _sum: {
      nominal: true
    },
    where: {
      status: 'LUNAS'
    }
  });

  // Sum of all APPROVED expenses
  const expenseResult = await prisma.expense.aggregate({
    _sum: {
      nominal: true
    },
    where: {
      statusApproval: 'APPROVED'
    }
  });

  // Pending expenses count & sum
  const pendingExpenseResult = await prisma.expense.aggregate({
    _sum: {
      nominal: true
    },
    _count: {
      id: true
    },
    where: {
      statusApproval: 'PENDING'
    }
  });

  const totalIncome = incomeResult._sum.nominal || 0;
  const totalExpense = expenseResult._sum.nominal || 0;
  const currentBalance = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    currentBalance,
    pendingExpensesCount: pendingExpenseResult._count.id || 0,
    pendingExpensesTotal: pendingExpenseResult._sum.nominal || 0
  };
}

/**
 * Records a mutation into KasLog table with consistent saldo tracking
 * @param {string} jenisMutasi - 'MASUK' | 'KELUAR'
 * @param {number} nominal - Amount of transaction
 * @param {string} keterangan - Detail information
 * @param {object} tx - Optional Prisma transaction client
 */
async function recordKasLog(jenisMutasi, nominal, keterangan, tx = null) {
  const db = tx || prisma;

  // Get the most recent KasLog to determine latest saldoSebelum
  const latestLog = await db.kasLog.findFirst({
    orderBy: {
      id: 'desc'
    }
  });

  let saldoSebelum = 0;
  if (latestLog) {
    saldoSebelum = latestLog.saldoSesudah;
  } else {
    // If no log exists yet, recalculate from existing data
    const summary = await getKasSummary();
    if (jenisMutasi === 'MASUK') {
      saldoSebelum = summary.currentBalance - nominal;
    } else {
      saldoSebelum = summary.currentBalance + nominal;
    }
  }

  const saldoSesudah = jenisMutasi === 'MASUK'
    ? saldoSebelum + nominal
    : saldoSebelum - nominal;

  const newLog = await db.kasLog.create({
    data: {
      saldoSebelum,
      saldoSesudah,
      jenisMutasi,
      nominal,
      keterangan
    }
  });

  return newLog;
}

module.exports = {
  getKasSummary,
  recordKasLog
};
