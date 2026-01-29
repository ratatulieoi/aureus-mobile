import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { Transaction, Budget } from '@/pages/Index';

interface SmartInsightsProps {
  transactions: Transaction[];
  budgets: Budget[];
}

const SmartInsights: React.FC<SmartInsightsProps> = ({ transactions, budgets }) => {
  const generateInsights = () => {
    const insights: any[] = [];
    const now = new Date();
    const thisMonth = transactions.filter(t => new Date(t.date).getMonth() === now.getMonth());
    const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    if (expense > income && income > 0) {
      insights.push({
        icon: <AlertCircle className="h-5 w-5" />,
        color: 'rose',
        title: 'Defisit Terdeteksi',
        msg: 'Pengeluaranmu melampaui pemasukan bulan ini. Coba cek anggaran lagi.'
      });
    } else if (income > 0 && expense < income * 0.5) {
      insights.push({
        icon: <ShieldCheck className="h-5 w-5" />,
        color: 'emerald',
        title: 'Kesehatan Keuangan',
        msg: 'Bagus! Kamu berhasil menabung lebih dari 50% pendapatanmu bulan ini.'
      });
    }

    const budgetStatus = budgets.map(b => {
      const spent = thisMonth.filter(t => t.category === b.category).reduce((s, t) => s + t.amount, 0);
      return { ...b, spent, percent: (spent / b.amount) * 100 };
    });

    const critical = budgetStatus.find(b => b.percent > 90);
    if (critical) {
      insights.push({
        icon: <Zap className="h-5 w-5" />,
        color: 'amber',
        title: 'Limit Anggaran',
        msg: `Kategori ${critical.category} sudah mencapai ${Math.round(critical.percent)}%. Hampir habis!`
      });
    }

    return insights;
  };

  const insights = generateInsights();
  if (insights.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
         <Sparkles className="h-4 w-4 text-indigo-600" />
         <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Intelligence</h3>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`min-w-[280px] snap-center p-6 rounded-[32px] border bg-card border-border shadow-sm flex flex-col gap-4`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl bg-${ins.color}-50 dark:bg-${ins.color}-950/20 text-${ins.color}-600`}>
                {ins.icon}
              </div>
              <h4 className="font-bold text-sm">{ins.title}</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {ins.msg}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SmartInsights;