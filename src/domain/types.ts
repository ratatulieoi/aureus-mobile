export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export type NewTransaction = Omit<Transaction, 'id'>;

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  startDate: string;
  cycleDays: number;
  nextPaymentDate: string;
  color: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: number;
  year: number;
}
