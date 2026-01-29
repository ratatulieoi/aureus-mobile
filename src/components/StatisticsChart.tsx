
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/pages/Index';
import { TrendingUp, TrendingDown, Calendar, PieChart } from 'lucide-react';

interface StatisticsChartProps {
  transactions: Transaction[];
}

const StatisticsChart: React.FC<StatisticsChartProps> = ({ transactions }) => {
  // Calculate statistics
  const totalTransactions = transactions.length;
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  
  const avgIncome = incomeTransactions.length > 0 
    ? Math.round(totalIncome / incomeTransactions.length) 
    : 0;
    
  const avgExpense = expenseTransactions.length > 0 
    ? Math.round(totalExpense / expenseTransactions.length) 
    : 0;

  // Find most frequent category
  const categoryCount = transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostFrequentCategory = Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || '-';

  // Calculate monthly data for current month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const thisMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });
  
  const thisMonthIncome = thisMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const thisMonthExpense = thisMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <PieChart className="h-5 w-5 text-blue-600" />
            Ringkasan Statistik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Transaksi</p>
              <p className="text-xl lg:text-2xl font-bold text-blue-800 dark:text-blue-300">{totalTransactions}</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Pemasukan</p>
              <p className="text-lg lg:text-xl font-bold text-green-800 dark:text-green-300">
                Rp {totalIncome.toLocaleString('id-ID')}
              </p>
            </div>
            
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <TrendingDown className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Total Pengeluaran</p>
              <p className="text-lg lg:text-xl font-bold text-red-800 dark:text-red-300">
                Rp {totalExpense.toLocaleString('id-ID')}
              </p>
            </div>
            
            <div className={`text-center p-4 rounded-lg border ${
              netBalance >= 0 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            }`}>
              <div className={`h-6 w-6 mx-auto mb-2 ${netBalance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                {netBalance >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
              </div>
              <p className={`text-sm font-medium ${
                netBalance >= 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                Saldo Bersih
              </p>
              <p className={`text-lg lg:text-xl font-bold ${
                netBalance >= 0 
                  ? 'text-emerald-800 dark:text-emerald-300' 
                  : 'text-orange-800 dark:text-orange-300'
              }`}>
                Rp {Math.abs(netBalance).toLocaleString('id-ID')}
                {netBalance < 0 && ' (-)'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Analisis Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Rata-rata Pemasukan</p>
              <p className="text-lg font-bold text-purple-800 dark:text-purple-300">
                Rp {avgIncome.toLocaleString('id-ID')}
              </p>
            </div>
            
            <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
              <p className="text-sm text-pink-600 dark:text-pink-400 font-medium">Rata-rata Pengeluaran</p>
              <p className="text-lg font-bold text-pink-800 dark:text-pink-300">
                Rp {avgExpense.toLocaleString('id-ID')}
              </p>
            </div>
            
            <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 md:col-span-2 lg:col-span-1">
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Kategori Tersering</p>
              <p className="text-lg font-bold text-indigo-800 dark:text-indigo-300">
                {mostFrequentCategory}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Ringkasan Bulan Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-teal-600" />
              <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">Pemasukan Bulan Ini</p>
              <p className="text-lg font-bold text-teal-800 dark:text-teal-300">
                Rp {thisMonthIncome.toLocaleString('id-ID')}
              </p>
            </div>
            
            <div className="text-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
              <TrendingDown className="h-6 w-6 mx-auto mb-2 text-rose-600" />
              <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">Pengeluaran Bulan Ini</p>
              <p className="text-lg font-bold text-rose-800 dark:text-rose-300">
                Rp {thisMonthExpense.toLocaleString('id-ID')}
              </p>
            </div>
            
            <div className="text-center p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-cyan-600" />
              <p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">Transaksi Bulan Ini</p>
              <p className="text-lg font-bold text-cyan-800 dark:text-cyan-300">
                {thisMonthTransactions.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {transactions.length === 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="text-center py-12">
            <PieChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">Belum ada data untuk ditampilkan</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Mulai tambahkan transaksi untuk melihat statistik!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatisticsChart;
