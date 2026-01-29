import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, AlertCircle, CheckCircle2, MoreVertical, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Budget, Transaction } from '@/pages/Index';

interface BudgetManagerProps {
  budgets: Budget[];
  transactions: Transaction[];
  onAddBudget: (budget: Omit<Budget, 'id'>) => void;
  onDeleteBudget: (id: string) => void;
  selectedMonth: number;
  selectedYear: number;
}

const CATEGORIES = ['Makanan & Minuman', 'Transportasi', 'Belanja', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Tagihan', 'Investasi', 'Lainnya'];

const BudgetManager: React.FC<BudgetManagerProps> = ({
  budgets,
  transactions,
  onAddBudget,
  onDeleteBudget,
  selectedMonth,
  selectedYear
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newAmt, setNewAmt] = useState('');

  const monthlyBudgets = budgets.filter(b => b.month === selectedMonth && b.year === selectedYear);
  const monthlyExpenses = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && t.type === 'expense';
  });

  const getStatus = (b: Budget) => {
    const spent = monthlyExpenses.filter(t => t.category === b.category).reduce((s, t) => s + t.amount, 0);
    const percent = (spent / b.amount) * 100;
    return { spent, percent, remaining: b.amount - spent };
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
               <Target className="h-4 w-4 text-indigo-600" />
               Current Goals
            </h2>
         </div>
         <Button 
            onClick={() => setShowAdd(!showAdd)} 
            className="rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 gap-2 shadow-lg shadow-indigo-100 dark:shadow-none"
         >
            <Plus className="h-4 w-4" /> Add
         </Button>
      </div>

      <AnimatePresence>
         {showAdd && (
            <motion.div 
               initial={{ height: 0, opacity: 0 }} 
               animate={{ height: 'auto', opacity: 1 }} 
               exit={{ height: 0, opacity: 0 }}
               className="overflow-hidden"
            >
               <div className="bg-card border border-border p-6 rounded-[32px] space-y-4 mb-4">
                  <Select value={newCat} onValueChange={setNewCat}>
                     <SelectTrigger className="bg-muted/50 border-none rounded-2xl h-12">
                        <SelectValue placeholder="Pilih Kategori" />
                     </SelectTrigger>
                     <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                     </SelectContent>
                  </Select>
                  <Input 
                     type="number" 
                     placeholder="Batas Anggaran (Rp)" 
                     className="bg-muted/50 border-none rounded-2xl h-12 px-4 font-bold"
                     value={newAmt}
                     onChange={(e) => setNewAmt(e.target.value)}
                  />
                  <div className="flex gap-2 pt-2">
                     <Button 
                        onClick={() => {
                           if (newCat && newAmt) {
                              onAddBudget({ category: newCat, amount: parseFloat(newAmt), month: selectedMonth, year: selectedYear });
                              setNewCat(''); setNewAmt(''); setShowAdd(false);
                           }
                        }}
                        className="flex-1 bg-indigo-600 text-white rounded-2xl h-12 font-bold"
                     >
                        Create Budget
                     </Button>
                     <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-2xl h-12">Cancel</Button>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <div className="space-y-4">
         {monthlyBudgets.map((b) => {
            const { spent, percent, remaining } = getStatus(b);
            const isDanger = percent >= 100;
            const isWarn = percent >= 80 && percent < 100;

            return (
               <motion.div 
                  key={b.id}
                  layout
                  className="bg-card border border-border p-6 rounded-[32px] shadow-sm space-y-4 relative group"
               >
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDanger ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'}`}>
                           <LayoutGrid className="h-5 w-5" />
                        </div>
                        <div>
                           <h4 className="font-bold text-sm">{b.category}</h4>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                              Rp {b.amount.toLocaleString('id-ID')} Limit
                           </p>
                        </div>
                     </div>
                     <button onClick={() => onDeleteBudget(b.id)} className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                     </button>
                  </div>

                  <div className="space-y-2">
                     <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className={isDanger ? 'text-rose-600' : 'text-indigo-600'}>Terpakai: Rp {spent.toLocaleString('id-ID')}</span>
                        <span className="text-muted-foreground">Sisa: Rp {Math.max(0, remaining).toLocaleString('id-ID')}</span>
                     </div>
                     <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${Math.min(percent, 100)}%` }}
                           className={`h-full rounded-full ${isDanger ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-indigo-600'}`}
                        />
                     </div>
                  </div>

                  {isDanger && (
                     <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 p-3 rounded-2xl text-rose-600 border border-rose-100 dark:border-rose-900/30">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="text-[10px] font-bold uppercase">Anggaran Terlampaui! Kurangi pengeluaran di kategori ini.</span>
                     </div>
                  )}
               </motion.div>
            );
         })}

         {monthlyBudgets.length === 0 && (
            <div className="py-20 text-center space-y-3 opacity-30">
               <Target className="h-16 w-16 mx-auto" />
               <p className="font-bold italic">No goals set for this month</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default BudgetManager;