
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingUp, TrendingDown, FileText, Download } from 'lucide-react';
import { Transaction } from '@/pages/Index';

interface MonthlyReportsProps {
  transactions: Transaction[];
}

const MonthlyReports: React.FC<MonthlyReportsProps> = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const availableYears = Array.from(
    new Set(transactions.map(t => new Date(t.date).getFullYear()))
  ).sort((a, b) => b - a);

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const income = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const net = income - expense;

  const downloadCSV = () => {
    const csvData = [
      ['Laporan Bulanan', `${months[selectedMonth]} ${selectedYear}`],
      [''],
      ['Ringkasan'],
      ['Pemasukan', `Rp ${income.toLocaleString('id-ID')}`],
      ['Pengeluaran', `Rp ${expense.toLocaleString('id-ID')}`],
      ['Saldo', `Rp ${Math.abs(net).toLocaleString('id-ID')}${net < 0 ? ' (-)' : ''}`],
      [''],
      ['Detail Transaksi'],
      ['Tanggal', 'Jenis', 'Jumlah', 'Kategori', 'Keterangan'],
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString('id-ID'),
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        `Rp ${t.amount.toLocaleString('id-ID')}`,
        t.category,
        t.description || 'Tidak ada keterangan'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan-${months[selectedMonth]}-${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Laporan Bulanan ${months[selectedMonth]} ${selectedYear}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 30px; }
            .summary-item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
            .income { background-color: #d4edda; }
            .expense { background-color: #f8d7da; }
            .balance { background-color: #d1ecf1; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Laporan Bulanan</h1>
            <h2>${months[selectedMonth]} ${selectedYear}</h2>
          </div>
          
          <div class="summary">
            <h3>Ringkasan</h3>
            <div class="summary-item income">
              <strong>Pemasukan: Rp ${income.toLocaleString('id-ID')}</strong>
            </div>
            <div class="summary-item expense">
              <strong>Pengeluaran: Rp ${expense.toLocaleString('id-ID')}</strong>
            </div>
            <div class="summary-item balance">
              <strong>Saldo: Rp ${Math.abs(net).toLocaleString('id-ID')}${net < 0 ? ' (-)' : ''}</strong>
            </div>
          </div>

          <h3>Detail Transaksi (${filteredTransactions.length} transaksi)</h3>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Jumlah</th>
                <th>Kategori</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map(t => `
                <tr>
                  <td>${new Date(t.date).toLocaleDateString('id-ID')}</td>
                  <td>${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td>
                  <td>Rp ${t.amount.toLocaleString('id-ID')}</td>
                  <td>${t.category}</td>
                  <td>${t.description || 'Tidak ada keterangan'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="h-5 w-5 text-blue-600" />
          Laporan Bulanan
        </CardTitle>
        
        <div className="flex flex-wrap gap-3 mt-4">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 ml-auto">
            <Button 
              onClick={downloadCSV} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button 
              onClick={downloadPDF} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Pemasukan</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              Rp {income.toLocaleString('id-ID')}
            </div>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">Pengeluaran</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              Rp {expense.toLocaleString('id-ID')}
            </div>
          </div>
          
          <div className={`${net >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'} p-4 rounded-lg border`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Saldo</span>
            </div>
            <div className={`text-2xl font-bold ${net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              Rp {Math.abs(net).toLocaleString('id-ID')}
              {net < 0 && ' (-)'}
            </div>
          </div>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          Total {filteredTransactions.length} transaksi pada {months[selectedMonth]} {selectedYear}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyReports;
