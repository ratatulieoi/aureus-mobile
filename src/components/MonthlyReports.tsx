import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Square, ArrowUp, ArrowDown, File } from 'lucide-react';
import type { Transaction } from '@/domain/types';
import { serializeCsvRows } from '@/domain/csv';
import { buildPrintReportDocument } from '@/domain/report';
import { filterTransactionsByPeriod } from '@/domain/period';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { toast } from '@/components/ui/use-toast';
import { writeNativeExportFile } from '@/platform/export-file';

interface MonthlyReportsProps {
  transactions: Transaction[];
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const MonthlyReports: React.FC<MonthlyReportsProps> = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const availableYears = Array.from(new Set(transactions.map((transaction) => new Date(transaction.date).getFullYear()))).sort((a, b) => b - a);
  if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

  const filteredTransactions = filterTransactionsByPeriod(transactions, { isAllTime: false, month: selectedMonth, year: selectedYear });
  const income = filteredTransactions.filter(({ type }) => type === 'income').reduce((sum, { amount }) => sum + amount, 0);
  const expense = filteredTransactions.filter(({ type }) => type === 'expense').reduce((sum, { amount }) => sum + amount, 0);
  const net = income - expense;
  const period = `${MONTHS[selectedMonth]} ${selectedYear}`;

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
      toast({ title: 'Gagal Mengekspor', description: 'Terjadi kesalahan saat menyimpan file.', variant: 'destructive' });
    }
  };

  const downloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Gagal Membuka Laporan', description: 'Izinkan pop-up untuk mencetak laporan.', variant: 'destructive' });
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
      toast({ title: 'Gagal Membuat Laporan', description: 'Laporan cetak tidak dapat dibuat.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-base"><File aria-hidden="true" className="h-5 w-5 text-primary" />Laporan Bulanan</CardTitle></CardHeader>
      <CardContent>
        <section className="aureus-filter-bar" aria-label="Pilih periode dan ekspor laporan">
          <div className="form-field"><Label htmlFor="report-month">Bulan laporan</Label><Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}><SelectTrigger id="report-month"><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((month, index) => <SelectItem key={month} value={index.toString()}>{month}</SelectItem>)}</SelectContent></Select></div>
          <div className="form-field"><Label htmlFor="report-year">Tahun laporan</Label><Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}><SelectTrigger id="report-year"><SelectValue /></SelectTrigger><SelectContent>{availableYears.map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}</SelectContent></Select></div>
          <div className="filter-actions"><Button onClick={downloadCSV} variant="outline"><ArrowDown aria-hidden="true" />Ekspor CSV</Button><Button onClick={downloadPDF} variant="outline"><ArrowDown aria-hidden="true" />Cetak PDF</Button></div>
        </section>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="min-w-0 rounded-lg border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowUp aria-hidden="true" className="h-4 w-4 text-success" />Pemasukan</div><div className="mt-2 break-words text-xl font-bold tabular-nums text-success sm:text-2xl">+ Rp {income.toLocaleString('id-ID')}</div></div>
          <div className="min-w-0 rounded-lg border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowDown aria-hidden="true" className="h-4 w-4 text-destructive" />Pengeluaran</div><div className="mt-2 break-words text-xl font-bold tabular-nums text-destructive sm:text-2xl">− Rp {expense.toLocaleString('id-ID')}</div></div>
          <div className="min-w-0 rounded-lg border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Square aria-hidden="true" className="h-4 w-4 text-primary" />Saldo</div><div className={`mt-2 break-words text-xl font-bold tabular-nums sm:text-2xl ${net >= 0 ? 'text-foreground' : 'text-destructive'}`}>{net < 0 && '− '}Rp {Math.abs(net).toLocaleString('id-ID')}</div></div>
        </div>
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Total <span className="font-semibold text-foreground">{filteredTransactions.length}</span> transaksi pada <span className="font-semibold text-foreground">{period}</span></div>
      </CardContent>
    </Card>
  );
};

export default MonthlyReports;
