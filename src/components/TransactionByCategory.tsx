import React from 'react';
import { motion } from 'framer-motion';
import { Tag, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction } from '@/pages/Index';

interface TransactionByCategoryProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  selectedMonth: number;
  selectedYear: number;
}

const TransactionByCategory: React.FC<TransactionByCategoryProps> = ({ 
  transactions,
  selectedMonth,
  selectedYear
}) => {
  const monthlyTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const categories = Array.from(new Set(monthlyTransactions.map(t => t.category)));
  
  const stats = categories.map(cat => {
    const items = monthlyTransactions.filter(t => t.category === cat);
    const total = items.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    const expense = items.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const income = items.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    return { name: cat, total, expense, income, count: items.length };
  }).sort((a, b) => b.expense - a.expense);

  const totalMonthlyExpense = stats.reduce((sum, s) => sum + s.expense, 0);

  return (
    <div className="space-y-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card border border-border p-5 rounded-[32px] shadow-sm flex flex-col gap-4"
        >
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600">
                   <Tag className="h-5 w-5" />
                </div>
                <div>
                   <h4 className="font-bold text-sm">{s.name}</h4>
                   <p className="text-[10px] font-medium text-muted-foreground">{s.count} transaksi</p>
                </div>
             </div>
             <div className="text-right">
                <p className="font-black text-sm">Rp {s.expense.toLocaleString('id-ID')}</p>
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Pengeluaran</p>
             </div>
          </div>

          <div className="space-y-1.5">
             <div className="flex justify-between text-[10px] font-bold text-muted-foreground px-1">
                <span>Pangsa Pasar</span>
                <span>{totalMonthlyExpense > 0 ? Math.round((s.expense / totalMonthlyExpense) * 100) : 0}%</span>
             </div>
             <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${totalMonthlyExpense > 0 ? (s.expense / totalMonthlyExpense) * 100 : 0}%` }}
                   className="h-full bg-indigo-600 rounded-full"
                />
             </div>
          </div>

          <div className="flex gap-4 pt-1">
             {s.income > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                   <TrendingUp className="h-3 w-3 text-emerald-600" />
                   <span className="text-[10px] font-bold text-emerald-700">Rp {s.income.toLocaleString('id-ID')}</span>
                </div>
             )}
          </div>
        </motion.div>
      ))}

      {stats.length === 0 && (
        <div className="py-20 text-center text-muted-foreground opacity-30">
           <Tag className="h-16 w-16 mx-auto mb-4" />
           <p className="font-bold italic">No categories tracked yet</p>
        </div>
      )}
    </div>
  );
};

export default TransactionByCategory;