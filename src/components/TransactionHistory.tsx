import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Transaction } from '@/pages/Index';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ 
  transactions, 
  onDeleteTransaction 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-indigo-600 transition-colors" />
          <input
            placeholder="Search by note or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-14 bg-card border border-border rounded-2xl pl-12 pr-4 outline-none focus:border-indigo-600/30 transition-all font-medium shadow-sm"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(['all', 'income', 'expense'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                filterType === type 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 dark:shadow-none' 
                : 'bg-card text-muted-foreground border-border'
              }`}
            >
              {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 pb-8">
        <AnimatePresence initial={false}>
          {filteredTransactions.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              className="group relative flex items-center justify-between p-4 bg-card border border-border rounded-3xl hover:border-indigo-600/20 transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {t.type === 'income' ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                </div>
                
                <div>
                  <p className="font-bold text-sm leading-tight mb-0.5">{t.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded-md">{t.category}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                       {format(new Date(t.date), 'dd MMM, HH:mm', { locale: id })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                   <p className={`font-black text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteTransaction(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredTransactions.length === 0 && (
          <div className="py-20 text-center space-y-3">
             <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center opacity-40">
                <Filter className="h-8 w-8 text-muted-foreground" />
             </div>
             <p className="text-muted-foreground font-medium italic">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;