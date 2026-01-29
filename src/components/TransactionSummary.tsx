
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction } from '@/pages/Index';

interface TransactionSummaryProps {
  transactions: Transaction[];
}

const TransactionSummary: React.FC<TransactionSummaryProps> = ({ transactions }) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.toISOString().split('T')[0];

  // Calculate daily totals
  const todayTransactions = transactions.filter(t => 
    t.date.split('T')[0] === currentDate
  );
  
  const todayIncome = todayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const todayExpense = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate monthly totals
  const thisMonthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  });

  const monthlyIncome = thisMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyExpense = thisMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayNet = todayIncome - todayExpense;
  const monthlyNet = monthlyIncome - monthlyExpense;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Daily Summary */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Pemasukan</span>
            </div>
            <span className="font-semibold text-green-600">
              Rp {todayIncome.toLocaleString('id-ID')}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Pengeluaran</span>
            </div>
            <span className="font-semibold text-red-600">
              Rp {todayExpense.toLocaleString('id-ID')}
            </span>
          </div>
          
          <div className="pt-2 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Saldo</span>
              <span className={`font-bold ${todayNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rp {Math.abs(todayNet).toLocaleString('id-ID')}
                {todayNet < 0 && ' (-)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Calendar className="h-5 w-5 text-purple-600" />
            Bulan Ini
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Pemasukan</span>
            </div>
            <span className="font-semibold text-green-600">
              Rp {monthlyIncome.toLocaleString('id-ID')}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Pengeluaran</span>
            </div>
            <span className="font-semibold text-red-600">
              Rp {monthlyExpense.toLocaleString('id-ID')}
            </span>
          </div>
          
          <div className="pt-2 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Saldo</span>
              <span className={`font-bold ${monthlyNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rp {Math.abs(monthlyNet).toLocaleString('id-ID')}
                {monthlyNet < 0 && ' (-)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionSummary;
