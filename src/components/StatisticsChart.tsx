
import React from 'react';
import type { Transaction } from '@/domain/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { filterTransactionsByPeriod } from '@/domain/period';


interface StatisticsChartProps {
  transactions: Transaction[];
  selectedMonth: number;
  selectedYear: number;
  isAllTime?: boolean;
}

function formatCompactId(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

const StatisticsChart: React.FC<StatisticsChartProps> = ({ transactions, selectedMonth, selectedYear, isAllTime = false }) => {
  let chartData: { label: string; income: number; expense: number }[] = [];

  if (isAllTime) {
    // Group by Month-Year for All Time view
    const groups: Record<string, { label: string; income: number; expense: number; dateVal: number }> = {};
    
    for (const t of transactions) {
       const d = new Date(t.date);
       const key = `${d.getFullYear()}-${d.getMonth()}`; // unique key
       // Create a sortable value (year * 12 + month)
       const dateVal = d.getFullYear() * 12 + d.getMonth();
       
       if (!groups[key]) {
         // Format label as "Jan 24"
         const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
         groups[key] = { label, income: 0, expense: 0, dateVal };
       }
       
       if (t.type === 'income') groups[key].income += t.amount;
       if (t.type === 'expense') groups[key].expense += t.amount;
    }
    
    // Convert to array and sort chronologically
    chartData = Object.values(groups).sort((a, b) => a.dateVal - b.dateVal);
    
  } else {
    // Existing Daily logic
    const monthlyTransactions = filterTransactionsByPeriod(transactions, {
      isAllTime: false,
      month: selectedMonth,
      year: selectedYear,
    });

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    chartData = Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1;
      return { label: day.toString(), income: 0, expense: 0 };
    });

    for (const t of monthlyTransactions) {
      const d = new Date(t.date);
      const day = d.getDate();
      const bucket = chartData[day - 1];
      if (!bucket) continue;
      if (t.type === 'income') bucket.income += t.amount;
      if (t.type === 'expense') bucket.expense += t.amount;
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />
          {isAllTime ? 'Tren Bulanan (All-Time)' : 'Tren Harian'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="sr-only">Grafik batang membandingkan pemasukan dan pengeluaran; kedua seri juga dibedakan oleh label, bukan warna saja.</p>
        <ChartContainer
          className="h-[260px] w-full"
          config={{
            income: {
              label: "Masuk",
              theme: { light: "hsl(var(--success))", dark: "hsl(var(--success))" },
            },
            expense: {
              label: "Keluar",
              theme: { light: "hsl(var(--destructive))", dark: "hsl(var(--destructive))" },
            },
          }}
        >
          <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v) => formatCompactId(Number(v))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => isAllTime ? label : `Tanggal ${label}`}
                  formatter={(value, name) => {
                    const n = typeof value === 'number' ? value : Number(value);
                    const label = name === 'income' ? 'Masuk' : 'Keluar';
                    return (
                      <div className="flex w-full items-center justify-between gap-6">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium tabular-nums">
                          Rp {n.toLocaleString('id-ID')}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="income" fill="var(--color-income)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default StatisticsChart;
