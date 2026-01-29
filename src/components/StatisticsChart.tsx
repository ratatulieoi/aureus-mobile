import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { Transaction } from '@/pages/Index';

interface StatisticsChartProps {
  transactions: Transaction[];
}

const StatisticsChart: React.FC<StatisticsChartProps> = ({ transactions }) => {
  // Process data for the bar chart (last 7 days)
  const getLast7Days = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      
      const dayTransactions = transactions.filter(t => t.date.split('T')[0] === dayStr);
      const income = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      data.push({ name: dayName, income, expense });
    }
    return data;
  };

  const chartData = getLast7Days();

  // Summary stats
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Activity Chart */}
      <div className="bg-card border border-border p-6 rounded-[32px] shadow-sm space-y-6">
        <div className="flex justify-between items-center">
           <div>
              <h4 className="font-bold text-sm flex items-center gap-2">
                 <Activity className="h-4 w-4 text-indigo-600" />
                 Aktivitas Mingguan
              </h4>
              <p className="text-[10px] text-muted-foreground font-medium">Pengeluaran vs Pemasukan 7 hari terakhir</p>
           </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                tickFormatter={(v) => `${v/1000}k`}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="expense" fill="#F43F5E" radius={[6, 6, 0, 0]} barSize={12} />
              <Bar dataKey="income" fill="#10B981" radius={[6, 6, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-2 gap-4">
         <div className="bg-card border border-border p-6 rounded-[32px] shadow-sm">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
               <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Savings Rate</p>
            <h3 className="text-2xl font-black">{savingsRate}%</h3>
            <div className="flex items-center gap-1 mt-2 text-emerald-600">
               <ArrowUpRight className="h-3 w-3" />
               <span className="text-[10px] font-bold">Excellent</span>
            </div>
         </div>

         <div className="bg-card border border-border p-6 rounded-[32px] shadow-sm">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center text-rose-500 mb-4">
               <TrendingDown className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Burn</p>
            <h3 className="text-2xl font-black">Rp {totalExpense.toLocaleString('id-ID')}</h3>
            <div className="flex items-center gap-1 mt-2 text-rose-500">
               <ArrowDownRight className="h-3 w-3" />
               <span className="text-[10px] font-bold">Keep tracking</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default StatisticsChart;