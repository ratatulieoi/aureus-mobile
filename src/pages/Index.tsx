
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mic, Calendar, DollarSign, Euro, JapaneseYen, PoundSterling, Bitcoin, Coins } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav, { NavTab } from '@/components/BottomNav';
import AboutSection from '@/components/AboutSection';
import TransactionForm from '@/components/TransactionForm';
import VoiceInput from '@/components/VoiceInput';
import TransactionTable from '@/components/TransactionTable';
import TransactionByCategory from '@/components/TransactionByCategory';
import StatisticsChart from '@/components/StatisticsChart';
import TransactionSummary from '@/components/TransactionSummary';
import MonthlyReports from '@/components/MonthlyReports';
import SmartInsights from '@/components/SmartInsights';
import SubscriptionManager from '@/components/SubscriptionManager';
import BackupRestore from '@/components/BackupRestore';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isAllTime, setIsAllTime] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem('transactions');
    if (!savedTransactions) return;
    try {
      const parsed = JSON.parse(savedTransactions);
      if (!Array.isArray(parsed)) return;

      const normalizeStoredTransaction = (value: unknown): Transaction | null => {
        if (typeof value !== 'object' || value === null) return null;
        const t = value as Record<string, unknown>;

        const type =
          t.type === 'income' ? 'income' : t.type === 'expense' ? 'expense' : null;
          if (!type) return null;

        const amount =
          typeof t.amount === 'number'
            ? t.amount
            : Number.parseFloat(String(t.amount ?? ''));
        if (!Number.isFinite(amount)) return null;

        const rawCategory = typeof t.category === 'string' ? t.category : '';
        const category = rawCategory === 'Hashihan' ? 'Tagihan' : rawCategory;

        const description = typeof t.description === 'string' ? t.description : '';
        const dateString =
          typeof t.date === 'string' ? t.date : new Date().toISOString();
        const date = Number.isNaN(new Date(dateString).getTime())
          ? new Date().toISOString()
          : dateString;

        const id =
          typeof t.id === 'string' && t.id.length > 0
            ? t.id
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        return { id, type, amount, category, description, date };
      };

      const normalized: Transaction[] = parsed
        .map(normalizeStoredTransaction)
        .filter(Boolean) as Transaction[];

      setTransactions(normalized);
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setShowForm(false);
    setShowVoiceInput(false);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleRestore = (restoredTransactions: Transaction[]) => {
    setTransactions(restoredTransactions);
  };

  const availableYears = Array.from(
    new Set(transactions.map(t => new Date(t.date).getFullYear()))
  ).sort((a, b) => b - a);

  if (availableYears.length === 0) {
    availableYears.push(new Date().getFullYear());
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 relative overflow-hidden font-sans selection:bg-primary selection:text-primary-foreground">
      
      {/* Background: Cartoony Money Pattern */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
         {[
            // Row 1
            { Icon: DollarSign, top: '2%', delay: '0s', duration: '40s' },
            { Icon: Bitcoin, top: '5%', delay: '12s', duration: '50s' },
            { Icon: Euro, top: '8%', delay: '25s', duration: '45s' },
            // Row 2
            { Icon: JapaneseYen, top: '12%', delay: '5s', duration: '55s' },
            { Icon: Coins, top: '15%', delay: '18s', duration: '38s' },
            { Icon: PoundSterling, top: '18%', delay: '30s', duration: '48s' },
            // Row 3
            { Icon: DollarSign, top: '22%', delay: '8s', duration: '42s' },
            { Icon: Euro, top: '25%', delay: '22s', duration: '52s' },
            { Icon: Bitcoin, top: '28%', delay: '2s', duration: '35s' },
            // Row 4
            { Icon: JapaneseYen, top: '32%', delay: '15s', duration: '60s' },
            { Icon: Coins, top: '35%', delay: '35s', duration: '46s' },
            { Icon: PoundSterling, top: '38%', delay: '10s', duration: '50s' },
            // Row 5
            { Icon: DollarSign, top: '42%', delay: '20s', duration: '44s' },
            { Icon: Euro, top: '45%', delay: '5s', duration: '58s' },
            { Icon: Bitcoin, top: '48%', delay: '28s', duration: '40s' },
            // Row 6
            { Icon: JapaneseYen, top: '52%', delay: '12s', duration: '54s' },
            { Icon: Coins, top: '55%', delay: '32s', duration: '48s' },
            { Icon: PoundSterling, top: '58%', delay: '3s', duration: '36s' },
            // Row 7
            { Icon: DollarSign, top: '62%', delay: '18s', duration: '56s' },
            { Icon: Euro, top: '65%', delay: '40s', duration: '42s' },
            { Icon: Bitcoin, top: '68%', delay: '8s', duration: '50s' },
            // Row 8
            { Icon: JapaneseYen, top: '72%', delay: '25s', duration: '62s' },
            { Icon: Coins, top: '75%', delay: '15s', duration: '45s' },
            { Icon: PoundSterling, top: '78%', delay: '0s', duration: '55s' },
            // Row 9
            { Icon: DollarSign, top: '82%', delay: '10s', duration: '48s' },
            { Icon: Euro, top: '85%', delay: '30s', duration: '38s' },
            { Icon: Bitcoin, top: '88%', delay: '5s', duration: '52s' },
            // Row 10
            { Icon: JapaneseYen, top: '92%', delay: '22s', duration: '46s' },
            { Icon: Coins, top: '95%', delay: '38s', duration: '60s' },
            { Icon: PoundSterling, top: '98%', delay: '12s', duration: '40s' },
         ].map((item, i) => (
            <div
               key={i}
               className="absolute left-[-10%] opacity-20 dark:opacity-10 text-primary animate-drift"
               style={{
                  top: item.top,
                  animationDelay: item.delay,
                  animationDuration: item.duration,
               }}
            >
               <item.Icon strokeWidth={2.5} className="w-6 h-6 sm:w-10 sm:h-10" />
            </div>
         ))}
      </div>

      {/* Persistent Header */}
      <Header />

      {/* Main Content - with top header and bottom nav spacing */}
      <main className="pt-16 pb-nav custom-scrollbar relative z-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6 py-6">
          {/* Home Tab Actions */}
          {activeTab === 'home' && (
            <div className="flex gap-3">
              <Button onClick={() => setShowForm(true)} className="flex-1 gap-2 h-12 text-base shadow-md hover:shadow-lg transition-all bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-5 w-5" />
                Catat Transaksi
              </Button>
              <Button onClick={() => setShowVoiceInput(true)} variant="outline" className="gap-2 h-12 text-base shadow-sm border-primary/20 bg-card hover:bg-accent/50 text-foreground">
                <Mic className="h-5 w-5 text-primary" />
                Suara
              </Button>
            </div>
          )}

          {/* Stats Tab Period Selector */}
          {activeTab === 'stats' && (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Periode Statistik</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className={`flex gap-2 transition-all duration-300 ${isAllTime ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                      <SelectTrigger className="w-[130px] h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                      <SelectTrigger className="w-[90px] h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Tab Content Based on Bottom Navigation */}
          <section>
            {activeTab === 'home' && (
              <div className="space-y-6">
                <TransactionSummary 
                  transactions={transactions} 
                  isAllTime={isAllTime} 
                  setIsAllTime={setIsAllTime}
                />
                <SmartInsights transactions={transactions} />
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">
                {/* Transaction Table - MOVED TO STATS */}
                <TransactionTable 
                  transactions={transactions}
                  onDeleteTransaction={deleteTransaction}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                />
                
                {/* Statistics Chart */}
                <StatisticsChart
                  transactions={transactions}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                />
                
                {/* Transaction by Category */}
                <TransactionByCategory 
                  transactions={transactions}
                  onDeleteTransaction={deleteTransaction}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                />
              </div>
            )}

            {activeTab === 'subs' && (
              <SubscriptionManager onAddTransaction={addTransaction} />
            )}

            {activeTab === 'reports' && (
              <MonthlyReports transactions={transactions} />
            )}

            {activeTab === 'more' && (
              <div className="space-y-6">
                {/* Backup Warning Banner */}
                <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900/50 rounded-xl p-4 shadow-sm">
                  <p className="text-sm text-red-700 dark:text-red-300 text-center font-medium">
                     Kalo mau update backup dulu yaa biar datanya ga ilang 🤗
                  </p>
                </div>
                
                <BackupRestore 
                  transactions={transactions}
                  onRestore={handleRestore}
                />
                <AboutSection />
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          onAddTransaction={addTransaction}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Voice Input Modal */}
      {showVoiceInput && (
        <VoiceInput
          onAddTransaction={addTransaction}
          onClose={() => setShowVoiceInput(false)}
        />
      )}
    </div>
  );
};

export default Index;
