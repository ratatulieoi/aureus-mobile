import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Wallet, ChevronDown, Calendar as CalendarIcon, Tag, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Transaction } from '@/pages/Index';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface TransactionFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransaction, onClose }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const categories = {
    expense: ['Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan', 'Kesehatan', 'Hiburan', 'Pendidikan', 'Rumah Tangga', 'Komunikasi', 'Lainnya'],
    income: ['Gaji', 'Bonus', 'Penjualan', 'Investasi', 'Freelance', 'Pemasukan Lain']
  };

  const triggerHaptic = () => {
    if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    onAddTransaction({
      type,
      amount: parseFloat(amount),
      category,
      description: description || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
      date: new Date().toISOString(),
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-[#F8F9FE] dark:bg-[#12141C] rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold tracking-tight">Baru</h3>
            <button onClick={onClose} className="p-2 bg-white dark:bg-black/20 rounded-full shadow-sm">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex p-1 bg-muted rounded-2xl">
            <button 
              onClick={() => { triggerHaptic(); setType('expense'); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'expense' ? 'bg-white dark:bg-[#1C1E29] text-rose-500 shadow-sm' : 'text-muted-foreground'}`}
            >
              Pengeluaran
            </button>
            <button 
              onClick={() => { triggerHaptic(); setType('income'); }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'income' ? 'bg-white dark:bg-[#1C1E29] text-emerald-500 shadow-sm' : 'text-muted-foreground'}`}
            >
              Pemasukan
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <p className="absolute left-4 top-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Jumlah</p>
              <div className="flex items-center gap-3 bg-white dark:bg-black/20 p-6 rounded-3xl border border-transparent focus-within:border-indigo-600/30 transition-all shadow-sm">
                <Wallet className="h-6 w-6 text-indigo-600" />
                <input 
                  type="number" 
                  placeholder="0" 
                  autoFocus
                  className="bg-transparent border-none outline-none w-full text-2xl font-black placeholder:text-muted-foreground/30"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               <div className="bg-white dark:bg-black/20 rounded-3xl p-4 border border-transparent focus-within:border-indigo-600/30 shadow-sm">
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <Tag className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Kategori</span>
                  </div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-none bg-transparent shadow-none h-8 font-bold">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories[type].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>

               <div className="bg-white dark:bg-black/20 rounded-3xl p-4 border border-transparent focus-within:border-indigo-600/30 shadow-sm">
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <AlignLeft className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Keterangan</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Opsional..." 
                    className="bg-transparent border-none outline-none w-full font-bold px-2 placeholder:font-normal"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
               </div>
            </div>

            <Button 
              type="submit" 
              disabled={!amount || !category}
              className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none font-bold text-lg gap-3"
            >
              Simpan Transaksi
            </Button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TransactionForm;