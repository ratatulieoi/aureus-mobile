
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import { Transaction, Budget } from '@/pages/Index';

interface SmartInsightsProps {
  transactions: Transaction[];
  budgets: Budget[];
}

const SmartInsights: React.FC<SmartInsightsProps> = ({ transactions, budgets }) => {
  const generateInsights = () => {
    const insights: Array<{
      type: 'success' | 'warning' | 'info' | 'danger';
      icon: React.ReactNode;
      title: string;
      message: string;
    }> = [];

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Current month transactions
    const thisMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    // Last month transactions
    const lastMonthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const thisMonthIncome = thisMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const thisMonthExpense = thisMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const lastMonthIncome = lastMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const lastMonthExpense = lastMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // Income trend analysis
    if (lastMonthIncome > 0) {
      const incomeChange = ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100;
      if (incomeChange > 10) {
        insights.push({
          type: 'success',
          icon: <TrendingUp className="h-4 w-4" />,
          title: 'Pemasukan Meningkat!',
          message: `Pemasukan Anda naik ${incomeChange.toFixed(1)}% dibanding bulan lalu. Pertahankan!`
        });
      } else if (incomeChange < -10) {
        insights.push({
          type: 'warning',
          icon: <TrendingDown className="h-4 w-4" />,
          title: 'Pemasukan Menurun',
          message: `Pemasukan turun ${Math.abs(incomeChange).toFixed(1)}% dibanding bulan lalu. Perlu perhatian.`
        });
      }
    }

    // Expense trend analysis
    if (lastMonthExpense > 0) {
      const expenseChange = ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100;
      if (expenseChange > 20) {
        insights.push({
          type: 'danger',
          icon: <AlertTriangle className="h-4 w-4" />,
          title: 'Pengeluaran Melonjak!',
          message: `Pengeluaran naik ${expenseChange.toFixed(1)}% dibanding bulan lalu. Cek kategori terbesar.`
        });
      } else if (expenseChange < -10) {
        insights.push({
          type: 'success',
          icon: <TrendingDown className="h-4 w-4" />,
          title: 'Pengeluaran Terkendali',
          message: `Pengeluaran turun ${Math.abs(expenseChange).toFixed(1)}% dibanding bulan lalu. Bagus!`
        });
      }
    }

    // Budget analysis
    const monthlyBudgets = budgets.filter(b => b.month === currentMonth && b.year === currentYear);
    if (monthlyBudgets.length > 0) {
      const overBudgetCategories = monthlyBudgets.filter(budget => {
        const spent = thisMonthTransactions
          .filter(t => t.type === 'expense' && t.category === budget.category)
          .reduce((sum, t) => sum + t.amount, 0);
        return spent > budget.amount;
      });

      if (overBudgetCategories.length > 0) {
        insights.push({
          type: 'danger',
          icon: <Target className="h-4 w-4" />,
          title: 'Budget Terlampaui',
          message: `${overBudgetCategories.length} kategori melebihi budget. Periksa pengeluaran Anda.`
        });
      }

      const nearLimitCategories = monthlyBudgets.filter(budget => {
        const spent = thisMonthTransactions
          .filter(t => t.type === 'expense' && t.category === budget.category)
          .reduce((sum, t) => sum + t.amount, 0);
        const percentage = (spent / budget.amount) * 100;
        return percentage > 80 && percentage <= 100;
      });

      if (nearLimitCategories.length > 0) {
        insights.push({
          type: 'warning',
          icon: <AlertTriangle className="h-4 w-4" />,
          title: 'Mendekati Limit Budget',
          message: `${nearLimitCategories.length} kategori sudah mencapai 80% budget. Hati-hati!`
        });
      }
    }

    // Category analysis
    const expensesByCategory = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategory = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => b - a)[0];

    if (topCategory && topCategory[1] > thisMonthExpense * 0.4) {
      insights.push({
        type: 'info',
        icon: <Lightbulb className="h-4 w-4" />,
        title: 'Kategori Dominan',
        message: `${topCategory[0]} menghabiskan ${((topCategory[1] / thisMonthExpense) * 100).toFixed(1)}% total pengeluaran.`
      });
    }

    // Savings rate
    if (thisMonthIncome > 0) {
      const savingsRate = ((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100;
      if (savingsRate > 20) {
        insights.push({
          type: 'success',
          icon: <TrendingUp className="h-4 w-4" />,
          title: 'Tingkat Tabungan Bagus',
          message: `Anda menabung ${savingsRate.toFixed(1)}% dari pendapatan. Luar biasa!`
        });
      } else if (savingsRate < 0) {
        insights.push({
          type: 'danger',
          icon: <AlertTriangle className="h-4 w-4" />,
          title: 'Pengeluaran > Pemasukan',
          message: 'Pengeluaran melebihi pemasukan bulan ini. Review anggaran Anda.'
        });
      }
    }

    // Transaction frequency
    const dailyTransactions = thisMonthTransactions.length / currentDate.getDate();
    if (dailyTransactions > 5) {
      insights.push({
        type: 'info',
        icon: <Lightbulb className="h-4 w-4" />,
        title: 'Aktivitas Transaksi Tinggi',
        message: `Rata-rata ${dailyTransactions.toFixed(1)} transaksi per hari. Pertimbangkan konsolidasi.`
      });
    }

    return insights;
  };

  const insights = generateInsights();

  if (insights.length === 0) {
    return null;
  }

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'danger':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const getTextStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'danger':
        return 'text-red-700 dark:text-red-300';
      case 'info':
      default:
        return 'text-blue-700 dark:text-blue-300';
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Brain className="h-5 w-5 text-purple-600" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getInsightStyle(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className={getTextStyle(insight.type)}>
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium mb-1 ${getTextStyle(insight.type)}`}>
                    {insight.title}
                  </h4>
                  <p className={`text-sm ${getTextStyle(insight.type)}`}>
                    {insight.message}
                  </p>
                </div>
                <Badge variant={insight.type === 'success' ? 'default' : 'secondary'} className="text-xs">
                  {insight.type === 'success' ? 'Bagus' : 
                   insight.type === 'warning' ? 'Perhatian' :
                   insight.type === 'danger' ? 'Penting' : 'Info'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartInsights;
