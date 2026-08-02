import React from 'react';
import type { Transaction } from '@/domain/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Infinity as InfinityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatLocalCalendarDate } from '@/domain/calendar-date';
import { transactionLocalDate } from '@/domain/period';

interface TransactionSummaryProps {
  transactions: Transaction[];
  isAllTime: boolean;
  setIsAllTime: (val: boolean) => void;
}

const TransactionSummary: React.FC<TransactionSummaryProps> = ({ transactions, isAllTime, setIsAllTime }) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = formatLocalCalendarDate(today);

  // Daily Stats use the same local-calendar semantics as input and reports.
  const todayTransactions = transactions.filter((transaction) => {
    const date = transactionLocalDate(transaction);
    return date !== null && formatLocalCalendarDate(date) === currentDate;
  });
  
  const todayIncome = todayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const todayExpense = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayNet = todayIncome - todayExpense;

  // Monthly Stats
  const thisMonthTransactions = transactions.filter((transaction) => {
    const transactionDate = transactionLocalDate(transaction);
    return transactionDate !== null && transactionDate.getMonth() === currentMonth &&
           transactionDate.getFullYear() === currentYear;
  });

  const monthlyIncome = thisMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyExpense = thisMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyNet = monthlyIncome - monthlyExpense;

  // All Time Stats
  const allIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const allExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const allNet = allIncome - allExpense;

  return (
    <Card className={cn(
        "transition-all duration-500 ease-in-out", 
        isAllTime ? "border-primary shadow-lg scale-[1.02]" : ""
    )}>
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base" aria-level={2}>
            Ringkasan
        </CardTitle>
        <Button 
            variant={isAllTime ? "default" : "outline"}
            size="sm"
            onClick={() => setIsAllTime(!isAllTime)}
            className="min-h-11 gap-2 text-xs transition-all"
            aria-pressed={isAllTime}
            aria-label={isAllTime ? 'Nonaktifkan ringkasan All-Time' : 'Aktifkan ringkasan All-Time'}
        >
            <InfinityIcon aria-hidden="true" className="h-3 w-3" />
            {isAllTime ? "Kembali" : "All-Time"}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Animated Grid Container */}
        <div className={cn(
            "grid gap-3 transition-all duration-500 ease-in-out",
            isAllTime ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
        )}>
          
          {/* Card 1: Hari Ini OR All-Time Main */}
          <div className={cn(
              "rounded-lg border bg-card p-4 transition-all duration-500",
              isAllTime ? "bg-gradient-to-br from-primary/10 to-transparent border-primary/20" : ""
          )}>
            <div className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground flex justify-between items-center">
              {isAllTime ? "Total Akumulasi" : "Hari ini"}
              {isAllTime && <InfinityIcon aria-hidden="true" className="h-3 w-3 text-primary/50" />}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-success" />
                  Masuk
                </span>
                <span className="font-semibold tabular-nums text-lg">
                  Rp {(isAllTime ? allIncome : todayIncome).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ArrowDownRight aria-hidden="true" className="h-4 w-4 text-destructive" />
                  Keluar
                </span>
                <span className="font-semibold tabular-nums text-lg">
                  Rp {(isAllTime ? allExpense : todayExpense).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t pt-3 border-dashed border-primary/20">
                <span className="text-sm font-semibold">Saldo</span>
                <span className={cn(
                    "font-bold tabular-nums text-xl",
                    (isAllTime ? allNet : todayNet) < 0 ? "text-destructive" : "text-accent-text"
                )}>
                  {(isAllTime ? allNet : todayNet) < 0 && '-'}Rp {Math.abs(isAllTime ? allNet : todayNet).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Bulan Ini - Hidden/Collapsed when All-Time is active */}
          <div className={cn(
              "rounded-lg border bg-card p-4 transition-all duration-500 overflow-hidden",
              isAllTime ? "hidden" : "h-auto opacity-100 scale-100"
          )} aria-hidden={isAllTime}>
            <div className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground">
              Bulan ini
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-success" />
                  Masuk
                </span>
                <span className="font-semibold tabular-nums">
                  Rp {monthlyIncome.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ArrowDownRight aria-hidden="true" className="h-4 w-4 text-destructive" />
                  Keluar
                </span>
                <span className="font-semibold tabular-nums">
                  Rp {monthlyExpense.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t pt-3">
                <span className="text-sm font-semibold">Saldo</span>
                <span className="font-semibold tabular-nums">
                  {monthlyNet < 0 && '-'}Rp {Math.abs(monthlyNet).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionSummary;