
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mic, Calendar } from 'lucide-react';
import TransactionForm from '@/components/TransactionForm';
import VoiceInput from '@/components/VoiceInput';
import TransactionTable from '@/components/TransactionTable';
import TransactionByCategory from '@/components/TransactionByCategory';
import StatisticsChart from '@/components/StatisticsChart';
import TransactionSummary from '@/components/TransactionSummary';
import MonthlyReports from '@/components/MonthlyReports';
import BudgetManager from '@/components/BudgetManager';
import SmartInsights from '@/components/SmartInsights';
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedTransactions = localStorage.getItem('transactions');
    const savedBudgets = localStorage.getItem('budgets');
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
    if (savedBudgets) {
      setBudgets(JSON.parse(savedBudgets));
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
  }, [budgets]);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setShowForm(false);
    setShowVoiceInput(false);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addBudget = (budget: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      ...budget,
      id: Date.now().toString(),
    };
    setBudgets(prev => [...prev.filter(b => !(b.category === budget.category && b.month === budget.month && b.year === budget.year)), newBudget]);
  };

  const deleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  const availableYears = Array.from(
    new Set(transactions.map(t => new Date(t.date).getFullYear()))
  ).sort((a, b) => b - a);

  if (availableYears.length === 0) {
    availableYears.push(new Date().getFullYear());
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center py-3 sm:py-4 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            💰 Aureus
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">AI-Powered Finance Tracker</p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            <span className="text-sm font-medium text-foreground">Periode:</span>
          </div>
          <div className="flex gap-3">
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-[120px] sm:w-[140px]">
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
              <SelectTrigger className="w-[80px] sm:w-[100px]">
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

        {/* Action Buttons - Circular Design */}
        <div className="flex justify-center gap-4 sm:gap-6 mb-4">
          <div className="flex flex-col items-center">
            <Button 
              onClick={() => setShowForm(true)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all duration-200 hover:scale-105"
              size="icon"
            >
              <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground mt-2">Manual</span>
          </div>
          
          <div className="flex flex-col items-center">
            <Button 
              onClick={() => setShowVoiceInput(true)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-500 hover:bg-gray-600 text-white shadow-lg transition-all duration-200 hover:scale-105"
              size="icon"
            >
              <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground mt-2">Voice AI</span>
          </div>
        </div>

        {/* Transaction Summary */}
        <TransactionSummary transactions={transactions} />

        {/* Smart Insights */}
        <SmartInsights transactions={transactions} budgets={budgets} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-card shadow-sm rounded-lg h-11 sm:h-12">
            <TabsTrigger value="table" className="text-xs sm:text-sm text-foreground rounded-lg px-2">Transaksi</TabsTrigger>
            <TabsTrigger value="category" className="text-xs sm:text-sm text-foreground rounded-lg px-2">Kategori</TabsTrigger>
            <TabsTrigger value="statistics" className="text-xs sm:text-sm text-foreground rounded-lg px-2">Statistik</TabsTrigger>
            <TabsTrigger value="budget" className="text-xs sm:text-sm text-foreground rounded-lg px-2">Budget</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm text-foreground rounded-lg px-2">Laporan</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="mt-4 sm:mt-6">
            <TransactionTable 
              transactions={transactions}
              onDeleteTransaction={deleteTransaction}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </TabsContent>
          
          <TabsContent value="category" className="mt-4 sm:mt-6">
            <TransactionByCategory 
              transactions={transactions}
              onDeleteTransaction={deleteTransaction}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </TabsContent>
          
          <TabsContent value="statistics" className="mt-4 sm:mt-6">
            <StatisticsChart transactions={transactions} />
          </TabsContent>
          
          <TabsContent value="budget" className="mt-4 sm:mt-6">
            <BudgetManager 
              budgets={budgets}
              transactions={transactions}
              onAddBudget={addBudget}
              onDeleteBudget={deleteBudget}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          </TabsContent>
          
          <TabsContent value="reports" className="mt-4 sm:mt-6">
            <MonthlyReports transactions={transactions} />
          </TabsContent>
        </Tabs>

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
    </div>
  );
};

export default Index;
