
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { Transaction, Budget } from '@/pages/Index';

interface BudgetManagerProps {
  budgets: Budget[];
  transactions: Transaction[];
  onAddBudget: (budget: Omit<Budget, 'id'>) => void;
  onDeleteBudget: (id: string) => void;
  selectedMonth: number;
  selectedYear: number;
}

const CATEGORIES = [
  'Makanan & Minuman',
  'Transportasi',
  'Belanja',
  'Hiburan',
  'Kesehatan',
  'Pendidikan',
  'Tagihan',
  'Investasi',
  'Lainnya'
];

const BudgetManager: React.FC<BudgetManagerProps> = ({
  budgets,
  transactions,
  onAddBudget,
  onDeleteBudget,
  selectedMonth,
  selectedYear
}) => {
  const [showForm, setShowForm] = useState(false);
  const [newBudget, setNewBudget] = useState({
    category: '',
    amount: ''
  });

  // Filter budgets and transactions for selected month/year
  const monthlyBudgets = budgets.filter(b => 
    b.month === selectedMonth && b.year === selectedYear
  );

  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() === selectedMonth && 
           date.getFullYear() === selectedYear &&
           t.type === 'expense';
  });

  const handleAddBudget = () => {
    if (newBudget.category && newBudget.amount) {
      onAddBudget({
        category: newBudget.category,
        amount: parseFloat(newBudget.amount),
        month: selectedMonth,
        year: selectedYear
      });
      setNewBudget({ category: '', amount: '' });
      setShowForm(false);
    }
  };

  const getBudgetStatus = (budget: Budget) => {
    const spent = monthlyTransactions
      .filter(t => t.category === budget.category)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const percentage = (spent / budget.amount) * 100;
    const remaining = budget.amount - spent;
    
    return { spent, percentage, remaining };
  };

  const totalBudget = monthlyBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = monthlyBudgets.reduce((sum, b) => {
    const { spent } = getBudgetStatus(b);
    return sum + spent;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Target className="h-5 w-5 text-blue-600" />
              Budget Overview - {new Date(selectedYear, selectedMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Budget
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Budget</p>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-300">
                Rp {totalBudget.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-600 font-medium">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-800 dark:text-red-300">
                Rp {totalSpent.toLocaleString('id-ID')}
              </p>
            </div>
            <div className={`text-center p-4 rounded-lg ${
              totalBudget - totalSpent >= 0 
                ? 'bg-green-50 dark:bg-green-900/20' 
                : 'bg-orange-50 dark:bg-orange-900/20'
            }`}>
              <p className={`text-sm font-medium ${
                totalBudget - totalSpent >= 0 
                  ? 'text-green-600' 
                  : 'text-orange-600'
              }`}>
                Sisa Budget
              </p>
              <p className={`text-xl font-bold ${
                totalBudget - totalSpent >= 0 
                  ? 'text-green-800 dark:text-green-300' 
                  : 'text-orange-800 dark:text-orange-300'
              }`}>
                Rp {Math.abs(totalBudget - totalSpent).toLocaleString('id-ID')}
                {totalBudget - totalSpent < 0 && ' (Over)'}
              </p>
            </div>
          </div>

          {/* Add Budget Form */}
          {showForm && (
            <div className="bg-muted p-4 rounded-lg mb-6">
              <h3 className="font-medium mb-4">Tambah Budget Baru</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select value={newBudget.category} onValueChange={(value) => setNewBudget(prev => ({...prev, category: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Jumlah Budget"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget(prev => ({...prev, amount: e.target.value}))}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddBudget} size="sm" className="flex-1">
                    Simpan
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)} size="sm">
                    Batal
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Details */}
      {monthlyBudgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monthlyBudgets.map(budget => {
            const { spent, percentage, remaining } = getBudgetStatus(budget);
            const isOverBudget = percentage > 100;
            const isNearLimit = percentage > 80 && percentage <= 100;
            
            return (
              <Card key={budget.id} className="bg-card border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {isOverBudget ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : isNearLimit ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <h3 className="font-medium text-foreground">{budget.category}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteBudget(budget.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pengeluaran</span>
                      <span>Rp {spent.toLocaleString('id-ID')} / Rp {budget.amount.toLocaleString('id-ID')}</span>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className={`h-2 ${
                        isOverBudget ? '[&>div]:bg-red-500' : 
                        isNearLimit ? '[&>div]:bg-orange-500' : 
                        '[&>div]:bg-green-500'
                      }`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(1)}% terpakai</span>
                      <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {remaining >= 0 ? `Sisa: Rp ${remaining.toLocaleString('id-ID')}` : `Over: Rp ${Math.abs(remaining).toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">Belum ada budget yang ditetapkan</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Mulai buat budget untuk kontrol keuangan yang lebih baik!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetManager;
