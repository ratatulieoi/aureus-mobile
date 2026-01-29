
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Calendar } from 'lucide-react';
import { Transaction } from '@/pages/Index';

interface TransactionFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransaction, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
  });

  const categories = {
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
      'Lainnya'
    ],
    income: [
      'Gaji',
      'Bonus',
      'Penjualan',
      'Investasi',
      'Freelance',
      'Pemasukan Lain'
    ]
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description || !formData.category) {
      alert('Mohon isi semua field yang wajib!');
      return;
    }

    onAddTransaction({
      type: formData.type,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      date: new Date().toISOString(),
    });

    setFormData({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
    });
  };

  const getCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return today.toLocaleDateString('id-ID', options);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tambah Transaksi</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {/* Tanggal Hari Ini */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">{getCurrentDate()}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="type">Tipe Transaksi *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: 'income' | 'expense') => 
                  setFormData({ ...formData, type: value, category: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Kategori *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  {categories[formData.type].map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Jumlah (Rp) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Keterangan *</Label>
              <Textarea
                id="description"
                placeholder="Masukkan keterangan transaksi..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Simpan Transaksi
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionForm;
