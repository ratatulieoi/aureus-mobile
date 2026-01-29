
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Search, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction } from '@/pages/Index';

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

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || transaction.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Riwayat Transaksi
        </CardTitle>
        
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              Semua
            </Button>
            <Button
              variant={filterType === 'income' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('income')}
              className="text-green-600"
            >
              Pemasukan
            </Button>
            <Button
              variant={filterType === 'expense' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('expense')}
              className="text-red-600"
            >
              Pengeluaran
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {transactions.length === 0 
              ? 'Belum ada transaksi. Mulai tambahkan transaksi pertama Anda!'
              : 'Tidak ada transaksi yang sesuai dengan pencarian Anda.'
            }
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                        {transaction.type === 'income' ? 'Masuk' : 'Keluar'}
                      </Badge>
                    </div>
                    
                    {transaction.description && (
                      <p className="text-sm text-gray-600 mb-1">{transaction.description}</p>
                    )}
                    
                    <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}Rp {transaction.amount.toLocaleString('id-ID')}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Yakin ingin menghapus transaksi ini?')) {
                        onDeleteTransaction(transaction.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
