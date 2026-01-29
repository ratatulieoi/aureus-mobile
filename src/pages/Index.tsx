import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Mic, 
  LayoutDashboard, 
  History, 
  PieChart as PieChartIcon, 
  Target, 
  FileText, 
  User,
  LogOut,
  Github,
  Instagram,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Settings,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster, toast } from 'sonner';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

import TransactionForm from '@/components/TransactionForm';
import VoiceInput from '@/components/VoiceInput';
import TransactionHistory from '@/components/TransactionHistory';
import TransactionByCategory from '@/components/TransactionByCategory';
import StatisticsChart from '@/components/StatisticsChart';
import BudgetManager from '@/components/BudgetManager';
import MonthlyReports from '@/components/MonthlyReports';
import ThemeToggle from '@/components/ThemeToggle';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: number;
  year: number;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // App Metadata
  const appVersion = "v1.2.0-Premium";
  const creator = {
    name: "R Meydani",
    github: "https://github.com/ratatulieoi",
    instagram: "https://instagram.com/rmeydani_"
  };

  useEffect(() => {
    const savedTransactions = localStorage.getItem('transactions');
    const savedBudgets = localStorage.getItem('budgets');
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
  }, []);

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }, [budgets]);

  const triggerHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) { /* Fallback for web */ }
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    triggerHaptic();
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setShowForm(false);
    setShowVoiceInput(false);
    toast.success('Transaksi berhasil ditambahkan');
  };

  const deleteTransaction = (id: string) => {
    triggerHaptic();
    setTransactions(prev => prev.filter(t => t.id !== id));
    toast.error('Transaksi dihapus');
  };

  const addBudget = (budget: Omit<Budget, 'id'>) => {
    triggerHaptic();
    const newBudget: Budget = {
      ...budget,
      id: Date.now().toString(),
    };
    setBudgets(prev => [...prev.filter(b => !(b.category === budget.category && b.month === budget.month && b.year === budget.year)), newBudget]);
    toast.success('Budget diperbarui');
  };

  const deleteBudget = (id: string) => {
    triggerHaptic();
    setBudgets(prev => prev.filter(b => b.id !== id));
    toast.error('Budget dihapus');
  };

  // Dashboard calculations
  const totalBalance = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  const monthlyTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });
  const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const monthlyExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'stats', icon: PieChartIcon, label: 'Stats' },
    { id: 'budget', icon: Target, label: 'Budget' },
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-xl overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl"></div>
              
              <CardContent className="p-8 relative">
                <p className="text-indigo-100 text-sm font-medium mb-1">Total Saldo</p>
                <h2 className="text-4xl font-bold tracking-tight mb-8">
                  Rp {totalBalance.toLocaleString('id-ID')}
                </h2>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-xs text-indigo-100">Income</p>
                      <p className="text-sm font-bold">Rp {monthlyIncome.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <TrendingDown className="h-5 w-5 text-rose-300" />
                    </div>
                    <div>
                      <p className="text-xs text-indigo-100">Expense</p>
                      <p className="text-sm font-bold">Rp {monthlyExpense.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-4">
              <Button 
                onClick={() => setShowForm(true)}
                className="flex-1 h-14 bg-card text-foreground hover:bg-muted border border-border rounded-2xl shadow-sm gap-2"
              >
                <Plus className="h-5 w-5 text-indigo-600" />
                <span className="font-semibold">Add New</span>
              </Button>
              <Button 
                onClick={() => setShowVoiceInput(true)}
                className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                <Mic className="h-6 w-6" />
              </Button>
            </div>

            {/* Recent Transactions Preview */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Transaksi Terbaru</h3>
                <button onClick={() => setActiveTab('history')} className="text-indigo-600 text-sm font-medium">Lihat Semua</button>
              </div>
              <div className="space-y-3">
                {transactions.slice(0, 4).map(t => (
                  <motion.div 
                    key={t.id}
                    layoutId={t.id}
                    className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {t.type === 'income' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{t.category}</p>
                      </div>
                    </div>
                    <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('id-ID')}
                    </p>
                  </motion.div>
                ))}
                {transactions.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Mulai catat transaksi pertamamu</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 'history':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-6 flex justify-between items-center">
               <h2 className="text-2xl font-bold">Riwayat</h2>
               <div className="flex gap-2">
                  <MonthlyReports transactions={transactions} minimalist />
               </div>
            </div>
            <TransactionHistory transactions={transactions} onDeleteTransaction={deleteTransaction} />
          </motion.div>
        );
      case 'stats':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">Analitik</h2>
            <TransactionByCategory 
              transactions={transactions} 
              onDeleteTransaction={deleteTransaction}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
            <StatisticsChart transactions={transactions} />
          </motion.div>
        );
      case 'budget':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-bold mb-6">Anggaran</h2>
            <BudgetManager 
              budgets={budgets}
              transactions={transactions}
              onAddBudget={addBudget}
              onDeleteBudget={deleteBudget}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </motion.div>
        );
      case 'profile':
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
            <div className="text-center pt-8 pb-4">
               <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-3xl mx-auto shadow-xl mb-4 flex items-center justify-center text-white text-3xl font-bold">
                 {creator.name.charAt(0)}
               </div>
               <h2 className="text-2xl font-bold">{creator.name}</h2>
               <p className="text-muted-foreground text-sm">{appVersion}</p>
            </div>

            <div className="space-y-4">
               <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4">Social Presence</h3>
               <div className="bg-card border border-border rounded-3xl overflow-hidden">
                  <a href={creator.github} target="_blank" className="flex items-center justify-between p-4 border-b border-border active:bg-muted transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><Github className="h-5 w-5" /></div>
                        <span className="font-medium">GitHub</span>
                     </div>
                     <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </a>
                  <a href={creator.instagram} target="_blank" className="flex items-center justify-between p-4 active:bg-muted transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl"><Instagram className="h-5 w-5 text-rose-500" /></div>
                        <span className="font-medium">Instagram</span>
                     </div>
                     <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </a>
               </div>

               <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 mt-8">App Settings</h3>
               <div className="bg-card border border-border rounded-3xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl"><Settings className="h-5 w-5 text-blue-500" /></div>
                        <span className="font-medium">Dark Mode</span>
                     </div>
                     <ThemeToggle />
                  </div>
                  <div className="flex items-center justify-between p-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl"><Info className="h-5 w-5 text-amber-500" /></div>
                        <span className="font-medium">Tentang Aplikasi</span>
                     </div>
                     <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
               </div>
            </div>

            <Button variant="ghost" className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl py-6 mt-4">
               <LogOut className="h-5 w-5 mr-2" />
               Sign Out
            </Button>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#0A0B10] pb-24 pt-8 transition-colors duration-500">
      <div className="max-w-md mx-auto px-6">
        
        {/* Header - Conditional Visibility */}
        {activeTab === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                Aureus <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Premium</span>
              </h1>
              <p className="text-sm text-muted-foreground">Manage your wealth</p>
            </div>
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
               <div className="w-6 h-6 bg-indigo-600 rounded-full"></div>
            </div>
          </motion.div>
        )}

        {/* Dynamic Content */}
        <AnimatePresence mode="wait">
          <div key={activeTab}>
            {renderContent()}
          </div>
        </AnimatePresence>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-6 left-6 right-6 max-w-md mx-auto h-18 bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[32px] flex items-center justify-around px-2 z-40">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic();
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ${
                activeTab === item.id 
                ? 'text-indigo-600' 
                : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className={`h-6 w-6 ${activeTab === item.id ? 'scale-110' : 'scale-100'}`} />
              <span className={`text-[10px] font-bold mt-1 transition-all ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>
                {item.label}
              </span>
              {activeTab === item.id && (
                <motion.div layoutId="nav-dot" className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />
              )}
            </button>
          ))}
        </nav>

        {/* Modals */}
        <AnimatePresence>
          {showForm && (
            <TransactionForm
              onAddTransaction={addTransaction}
              onClose={() => {
                 triggerHaptic();
                 setShowForm(false);
              }}
            />
          )}
          {showVoiceInput && (
            <VoiceInput
              onAddTransaction={addTransaction}
              onClose={() => {
                 triggerHaptic();
                 setShowVoiceInput(false);
              }}
            />
          )}
        </AnimatePresence>
      </div>
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
};

export default Index;