import type { TransactionType } from '@/domain/types';

export const TRANSACTION_CATEGORIES: Record<TransactionType, readonly string[]> = {
  expense: [
    'Makanan & Minuman',
    'Transportasi',
    'Belanja',
    'Tagihan',
    'Kesehatan',
    'Hiburan',
    'Pendidikan',
    'Rumah Tangga',
    'Komunikasi',
    'Lainnya',
  ],
  income: [
    'Gaji',
    'Bonus',
    'Penjualan',
    'Investasi',
    'Freelance',
    'Pemasukan Lain',
  ],
};
