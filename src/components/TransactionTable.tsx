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
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction } from '@/pages/Index';

interface TransactionTableProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  selectedMonth: number;
  selectedYear: number;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions, 
  onDeleteTransaction,
  selectedMonth,
  selectedYear
}) => {
  const [showIncome, setShowIncome] = useState(true);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  // Filter transactions by selected month and year
  const monthlyTransactions = transactions.filter(transaction => {
    const date = new Date(transaction.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  const filteredTransactions = monthlyTransactions.filter(transaction => 
    showIncome ? transaction.type === 'income' : transaction.type === 'expense'
  );

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

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  const toggleTransactionType = () => {
    setShowIncome(!showIncome);
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-3 text-foreground">
            {showIncome ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            {showIncome ? 'Tabel Pemasukan' : 'Tabel Pengeluaran'}
          </CardTitle>
          
          {/* Enhanced Mobile-Friendly Toggle Switch */}
          <div className="flex items-center justify-center gap-3 bg-muted p-2 rounded-lg">
            <span className={`text-xs sm:text-sm font-medium transition-all duration-300 ${
              showIncome ? 'text-green-600 scale-110' : 'text-muted-foreground scale-100'
            }`}>
              Masuk
            </span>
            
            <button
              onClick={toggleTransactionType}
              className={`relative w-14 h-7 sm:w-16 sm:h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                showIncome 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full shadow-lg transition-all duration-300 transform flex items-center justify-center ${
                showIncome ? 'translate-x-0.5' : 'translate-x-7 sm:translate-x-8'
              }`}>
                {showIncome ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
              </div>
            </button>
            
            <span className={`text-xs sm:text-sm font-medium transition-all duration-300 ${
              !showIncome ? 'text-red-600 scale-110' : 'text-muted-foreground scale-100'
            }`}>
              Keluar
            </span>
          </div>
        </div>
        
        <div className={`text-xl sm:text-2xl font-bold mt-3 transition-all duration-300 ${
          showIncome ? 'text-green-600' : 'text-red-600'
        }`}>
          Total: Rp {totalAmount.toLocaleString('id-ID')}
        </div>
      </CardHeader>
      
      <CardContent className="px-2 sm:px-6">
        <div className="transition-all duration-300 ease-in-out">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mb-4">
                {showIncome ? (
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50" />
                ) : (
                  <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground/50" />
                )}
              </div>
              <p className="text-lg">Belum ada {showIncome ? 'pemasukan' : 'pengeluaran'} yang tercatat.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Mulai tambahkan transaksi pertama Anda!</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground font-medium px-2 sm:px-4">Jumlah</TableHead>
                      <TableHead className="text-foreground font-medium px-2 sm:px-4">Keterangan</TableHead>
                      <TableHead className="text-foreground font-medium px-2 sm:px-4 hidden sm:table-cell">Kategori</TableHead>
                      <TableHead className="text-foreground font-medium w-16 sm:w-20 px-2 sm:px-4">Tanggal</TableHead>
                      <TableHead className="text-right text-foreground font-medium w-12 sm:w-16 px-2 sm:px-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction, index) => (
                      <TableRow 
                        key={transaction.id} 
                        className="hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
                        onClick={() => setSelectedRow(selectedRow === transaction.id ? null : transaction.id)}
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeIn 0.3s ease-out forwards'
                        }}
                      >
                        <TableCell className="px-2 sm:px-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Badge 
                              variant={transaction.type === 'income' ? 'default' : 'destructive'}
                              className="w-2 h-2 p-0 rounded-full flex-shrink-0"
                            />
                            <span className={`font-semibold text-xs sm:text-sm ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              Rp {transaction.amount.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground text-xs sm:text-sm px-2 sm:px-4">
                          <div className="max-w-[100px] sm:max-w-xs overflow-hidden">
                            <div 
                              className={`${
                                selectedRow === transaction.id && transaction.description && transaction.description.length > 20
                                  ? 'animate-[scroll_3s_linear_infinite] whitespace-nowrap'
                                  : 'truncate'
                              }`} 
                              title={transaction.description}
                              style={{
                                animation: selectedRow === transaction.id && transaction.description && transaction.description.length > 20
                                  ? 'scroll 3s linear infinite'
                                  : 'none'
                              }}
                            >
                              {transaction.description || 'Tidak ada keterangan'}
                            </div>
                            <div className="sm:hidden mt-1">
                              <Badge variant="outline" className="text-xs">
                                {transaction.category}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground text-xs sm:text-sm px-2 sm:px-4 hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground text-xs w-16 sm:w-20 px-2 sm:px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold">{formatDate(transaction.date)}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(transaction.date)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right w-12 sm:w-16 px-2 sm:px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Yakin ingin menghapus transaksi ini?')) {
                                onDeleteTransaction(transaction.id);
                              }
                            }}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors p-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionTable;
