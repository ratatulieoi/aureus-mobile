
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, TrendingUp, TrendingDown, Tag } from 'lucide-react';
import { Transaction } from '@/pages/Index';

interface TransactionByCategoryProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  selectedMonth: number;
  selectedYear: number;
}

const TransactionByCategory: React.FC<TransactionByCategoryProps> = ({ 
  transactions, 
  onDeleteTransaction,
  selectedMonth,
  selectedYear
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');

  // Filter transactions by selected month and year
  const monthlyTransactions = transactions.filter(transaction => {
    const date = new Date(transaction.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  // Get unique categories
  const categories = Array.from(new Set(monthlyTransactions.map(t => t.category))).sort();

  // Filter transactions by category and type
  const filteredTransactions = monthlyTransactions.filter(transaction => {
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
    const matchesType = selectedType === 'all' || transaction.type === selectedType;
    return matchesCategory && matchesType;
  });

  // Group transactions by category
  const transactionsByCategory = filteredTransactions.reduce((acc, transaction) => {
    if (!acc[transaction.category]) {
      acc[transaction.category] = [];
    }
    acc[transaction.category].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryTotal = (categoryTransactions: Transaction[]) => {
    return categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalByType = (categoryTransactions: Transaction[], type: 'income' | 'expense') => {
    return categoryTransactions
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-3 text-foreground">
            <Tag className="h-5 w-5 text-blue-600" />
            Transaksi Per Kategori
          </CardTitle>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedType} onValueChange={(value: 'all' | 'income' | 'expense') => setSelectedType(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {Object.keys(transactionsByCategory).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg">Tidak ada transaksi yang sesuai dengan filter.</p>
          </div>
        ) : (
          Object.entries(transactionsByCategory).map(([category, categoryTransactions]) => (
            <Card key={category} className="border border-border/50">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline" className="text-sm">
                      {category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({categoryTransactions.length} transaksi)
                    </span>
                  </CardTitle>
                  
                  <div className="flex flex-col sm:flex-row gap-2 text-sm">
                    {getTotalByType(categoryTransactions, 'income') > 0 && (
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>Rp {getTotalByType(categoryTransactions, 'income').toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {getTotalByType(categoryTransactions, 'expense') > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="h-4 w-4" />
                        <span>Rp {getTotalByType(categoryTransactions, 'expense').toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-foreground font-medium w-20">Tanggal</TableHead>
                        <TableHead className="text-foreground font-medium">Jumlah</TableHead>
                        <TableHead className="text-foreground font-medium">Keterangan</TableHead>
                        <TableHead className="text-right text-foreground font-medium w-16">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryTransactions.map((transaction) => (
                        <TableRow 
                          key={transaction.id} 
                          className="hover:bg-muted/50 transition-colors duration-200"
                        >
                          <TableCell className="font-medium text-foreground text-xs w-20">
                            <div className="flex flex-col">
                              <span className="font-semibold">{formatDate(transaction.date)}</span>
                              <span className="text-xs text-muted-foreground">{formatTime(transaction.date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={transaction.type === 'income' ? 'default' : 'destructive'}
                                className="w-2 h-2 p-0 rounded-full"
                              />
                              <span className={`font-semibold text-xs sm:text-sm ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.type === 'income' ? '+' : '-'}Rp {transaction.amount.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs text-foreground text-xs sm:text-sm">
                            <div className="truncate" title={transaction.description}>
                              {transaction.description || 'Tidak ada keterangan'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right w-16">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Yakin ingin menghapus transaksi ini?')) {
                                  onDeleteTransaction(transaction.id);
                                }
                              }}
                              className="w-8 h-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors p-0"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionByCategory;
