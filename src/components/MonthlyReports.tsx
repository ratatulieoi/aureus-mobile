import React, { useState } from 'react';
import { ArrowDownToLine, FileSpreadsheet, Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Transaction } from '@/domain/types';
import { serializeCsvRows } from '@/domain/csv';
import { buildPrintReportDocument } from '@/domain/report';
import { filterTransactionsByPeriod } from '@/domain/period';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { toast } from '@/components/ui/use-toast';
import { writeNativeExportFile } from '@/platform/export-file';

interface MonthlyReportsProps {
  transactions: Transaction[];
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const formatRupiah = (amount: number) => `Rp ${Math.abs(amount).toLocaleString('id-ID')}`;

const MonthlyReports: React.FC<MonthlyReportsProps> = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = Array.from(new Set(transactions.map((transaction) => new Date(transaction.date).getFullYear()))).sort((a, b) => b - a);
  if (!availableYears.includes(new Date().getFullYear())) availableYears.unshift(new Date().getFullYear());

  const filteredTransactions = filterTransactionsByPeriod(transactions, { isAllTime: false, month: selectedMonth, year: selectedYear });
  const income = filteredTransactions.filter(({ type }) => type === 'income').reduce((sum, { amount }) => sum + amount, 0);
  const expense = filteredTransactions.filter(({ type }) => type === 'expense').reduce((sum, { amount }) => sum + amount, 0);
  const net = income - expense;
  const period = `${MONTHS[selectedMonth]} ${selectedYear}`;
  const hasTransactions = filteredTransactions.length > 0;

  const downloadCSV = async () => {
    const csvData = [
      ['Laporan Bulanan', period],
      [''],
      ['Ringkasan'],
      ['Pemasukan', `Rp ${income.toLocaleString('id-ID')}`],
      ['Pengeluaran', `Rp ${expense.toLocaleString('id-ID')}`],
      ['Saldo', `${net < 0 ? '-' : ''}Rp ${Math.abs(net).toLocaleString('id-ID')}`],
      [''],
      ['Detail Transaksi'],
      ['Tanggal', 'Jenis', 'Jumlah', 'Kategori', 'Keterangan'],
      ...filteredTransactions.map((transaction) => [
        new Date(transaction.date).toLocaleDateString('id-ID'),
        transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        `Rp ${transaction.amount.toLocaleString('id-ID')}`,
        transaction.category,
        transaction.description,
      ]),
    ];
    const csvContent = `\uFEFF${serializeCsvRows(csvData)}`;
    const fileName = `laporan-${MONTHS[selectedMonth]}-${selectedYear}.csv`;

    try {
      if (Capacitor.isNativePlatform()) {
        const result = await writeNativeExportFile(fileName, csvContent);
        await Share.share({ title: 'Ekspor Laporan Keuangan', text: `Laporan keuangan bulan ${period}`, url: result.uri, dialogTitle: 'Bagikan CSV' });
      } else {
        const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        try {
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          link.remove();
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Gagal mengekspor', description: 'File CSV belum tersimpan. Coba lagi.', variant: 'destructive' });
    }
  };

  const downloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Laporan belum dibuka', description: 'Izinkan pop-up untuk mencetak laporan.', variant: 'destructive' });
      return;
    }
    try {
      buildPrintReportDocument(printWindow.document, { period, income, expense, net, transactions: filteredTransactions });
      printWindow.document.close();
      printWindow.focus();
      printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });
      printWindow.print();
    } catch (error) {
      console.error('Print report failed:', error);
      printWindow.close();
      toast({ title: 'Laporan belum dibuat', description: 'Laporan cetak tidak dapat dibuat. Coba lagi.', variant: 'destructive' });
    }
  };

  return (
    <section className="utility-screen report-screen" aria-labelledby="report-title">
      <header className="utility-screen-header">
        <h2 id="report-title">Laporan & ekspor</h2>
        <p>Pilih periode, periksa ringkasannya, lalu unduh laporan.</p>
      </header>

      <section className="report-period" aria-labelledby="report-period-title">
        <h3 id="report-period-title">Periode laporan</h3>
        <div className="report-period-controls">
          <div className="form-field">
            <label htmlFor="report-month">Bulan</label>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
              <SelectTrigger id="report-month"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((month, index) => <SelectItem key={month} value={index.toString()}>{month}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="form-field">
            <label htmlFor="report-year">Tahun</label>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
              <SelectTrigger id="report-year"><SelectValue /></SelectTrigger>
              <SelectContent>{availableYears.map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="report-summary" aria-labelledby="report-summary-title">
        <div className="report-summary-lead">
          <div>
            <p id="report-summary-title">Saldo periode</p>
            <strong className={net < 0 ? 'is-negative' : ''}>{net < 0 ? '− ' : ''}{formatRupiah(net)}</strong>
          </div>
          <span>{filteredTransactions.length} transaksi</span>
        </div>
        <dl className="report-breakdown">
          <div><dt>Pemasukan</dt><dd className="is-income">+ {formatRupiah(income)}</dd></div>
          <div><dt>Pengeluaran</dt><dd className="is-expense">− {formatRupiah(expense)}</dd></div>
        </dl>
      </section>

      {!hasTransactions && (
        <p className="report-empty" role="status">Belum ada transaksi pada {period}. Pilih periode lain untuk membuat laporan.</p>
      )}

      <section className="report-export" aria-labelledby="report-export-title">
        <div className="utility-section-heading">
          <h3 id="report-export-title">Unduh laporan</h3>
          <p>Ekspor hanya memuat transaksi pada {period}.</p>
        </div>
        <div className="report-export-list">
          <button type="button" onClick={downloadCSV} disabled={!hasTransactions}>
            <span className="report-export-icon"><FileSpreadsheet aria-hidden="true" /></span>
            <span><strong>Ekspor CSV</strong><small>Data lengkap untuk spreadsheet</small></span>
            <ArrowDownToLine aria-hidden="true" />
          </button>
          <button type="button" onClick={downloadPDF} disabled={!hasTransactions}>
            <span className="report-export-icon"><Printer aria-hidden="true" /></span>
            <span><strong>Cetak atau simpan PDF</strong><small>Ringkasan siap cetak</small></span>
            <ArrowDownToLine aria-hidden="true" />
          </button>
        </div>
      </section>
    </section>
  );
};

export default MonthlyReports;
