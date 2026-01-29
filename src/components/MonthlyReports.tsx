import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Share2, 
  Download, 
  ChevronDown, 
  CheckCircle2, 
  FileSpreadsheet,
  FileType
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Transaction } from '@/pages/Index';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface MonthlyReportsProps {
  transactions: Transaction[];
  minimalist?: boolean;
}

const MonthlyReports: React.FC<MonthlyReportsProps> = ({ transactions, minimalist = false }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const availableYears = Array.from(
    new Set(transactions.map(t => new Date(t.date).getFullYear()))
  ).sort((a, b) => b - a);

  if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const generateCSV = () => {
    const headers = ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Keterangan'];
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('id-ID'),
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      t.category,
      t.amount.toString(),
      t.description
    ]);
    
    return [headers, ...rows].map(e => e.join(",")).join("\n");
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    const csvData = generateCSV();
    const fileName = `Aureus_Report_${months[selectedMonth]}_${selectedYear}.csv`;

    try {
      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: csvData,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'Export Report',
          text: `Financial report for ${months[selectedMonth]} ${selectedYear}`,
          url: result.uri,
          dialogTitle: 'Share Financial Report',
        });
      } else {
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
      }
    } catch (error) {
      console.error('Export failed', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const fileName = `Aureus_Report_${months[selectedMonth]}_${selectedYear}.pdf`;

    try {
      const doc = new jsPDF() as any;
      
      // Header
      doc.setFontSize(20);
      doc.text('AUREUS FINANCIAL REPORT', 14, 22);
      doc.setFontSize(12);
      doc.text(`Periode: ${months[selectedMonth]} ${selectedYear}`, 14, 30);
      
      const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      doc.text(`Total Pemasukan: Rp ${income.toLocaleString('id-ID')}`, 14, 40);
      doc.text(`Total Pengeluaran: Rp ${expense.toLocaleString('id-ID')}`, 14, 47);
      doc.text(`Saldo Akhir: Rp ${(income - expense).toLocaleString('id-ID')}`, 14, 54);

      doc.autoTable({
        startY: 65,
        head: [['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Keterangan']],
        body: filteredTransactions.map(t => [
          new Date(t.date).toLocaleDateString('id-ID'),
          t.type === 'income' ? 'Income' : 'Expense',
          t.category,
          `Rp ${t.amount.toLocaleString('id-ID')}`,
          t.description
        ]),
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
      });

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });

        await Share.share({
          url: result.uri,
        });
      } else {
        doc.save(fileName);
      }
    } catch (error) {
      console.error('PDF Export failed', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (minimalist) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-2xl bg-card border border-border"
        onClick={handleExportPDF}
      >
        <FileText className="h-5 w-5 text-indigo-600" />
      </Button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="bg-card border-border rounded-2xl h-12 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="bg-card border-border rounded-2xl h-12 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-[32px] gap-3 group hover:border-indigo-200 transition-colors"
        >
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <FileType className="h-6 w-6" />
          </div>
          <span className="font-bold text-sm">Export PDF</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleExportCSV}
          disabled={isExporting}
          className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-[32px] gap-3 group hover:border-emerald-200 transition-colors"
        >
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <span className="font-bold text-sm">Export CSV</span>
        </motion.button>
      </div>

      <div className="bg-indigo-600/5 border border-indigo-600/10 rounded-3xl p-6 text-center">
        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Insight</p>
        <p className="text-sm text-indigo-900/70 dark:text-indigo-100/70 leading-relaxed">
          {filteredTransactions.length > 0 
            ? `Ditemukan ${filteredTransactions.length} transaksi untuk periode ini. Laporan siap dibagikan.`
            : "Tidak ada transaksi untuk periode ini."}
        </p>
      </div>
    </div>
  );
};

export default MonthlyReports;