import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { CategoryCatalog, TransactionType } from '@/domain/types';
import { validateNewCategoryName } from '@/domain/categories';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import { toast } from '@/components/ui/use-toast';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';

interface CategoryManagerProps {
  categories: CategoryCatalog;
  onCategoriesChange: (categories: CategoryCatalog) => void;
  initialAddOpen?: boolean;
  onCloseAdd?: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onCategoriesChange,
  initialAddOpen = false,
  onCloseAdd,
}) => {
  const [addOpen, setAddOpen] = useState(initialAddOpen);
  const [type, setType] = useState<TransactionType>('expense');
  const [name, setName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ type: TransactionType; name: string } | null>(null);
  useMobileBackDismiss(addOpen, () => {
    setAddOpen(false);
    setName('');
    onCloseAdd?.();
  });

  const closeAdd = () => {
    setAddOpen(false);
    setName('');
    onCloseAdd?.();
  };

  const addCategory = (event: React.FormEvent) => {
    event.preventDefault();
    const result = validateNewCategoryName(categories, type, name);
    if (!result.ok) {
      toast({ variant: 'destructive', title: 'Kategori belum ditambahkan', description: result.error });
      return;
    }
    onCategoriesChange({ ...categories, [type]: [...categories[type], result.value] });
    toast({ title: 'Kategori ditambahkan', description: `${result.value} siap digunakan.` });
    closeAdd();
  };

  const removeCategory = () => {
    if (!pendingDelete) return;
    onCategoriesChange({
      ...categories,
      [pendingDelete.type]: categories[pendingDelete.type].filter((category) => category !== pendingDelete.name),
    });
    toast({ title: 'Kategori dihapus', description: 'Transaksi lama tetap memakai nama kategori sebelumnya.' });
    setPendingDelete(null);
  };

  return (
    <section className="category-manager" aria-labelledby="category-manager-title">
      <div className="utility-heading">
        <div><h2 id="category-manager-title">Kelola kategori</h2><p>Tambah atau hapus kategori untuk transaksi berikutnya.</p></div>
        <button type="button" className="utility-action" onClick={() => setAddOpen(true)}><Plus aria-hidden="true" />Tambah</button>
      </div>

      {(['expense', 'income'] as const).map((categoryType) => (
        <section key={categoryType} className="category-manager-group" aria-labelledby={`category-${categoryType}`}>
          <h3 id={`category-${categoryType}`}>{categoryType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</h3>
          {categories[categoryType].length === 0 ? <p>Belum ada kategori.</p> : (
            <div>
              {categories[categoryType].map((category) => (
                <div key={category} className="category-manager-row">
                  <span>{category}</span>
                  <button type="button" aria-label={`Hapus kategori ${category}`} onClick={() => setPendingDelete({ type: categoryType, name: category })}><Trash2 aria-hidden="true" /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {addOpen && (
        <div className="simple-dialog-backdrop" role="presentation">
          <section className="simple-dialog" role="dialog" aria-modal="true" aria-labelledby="add-category-title">
            <header><h2 id="add-category-title">Tambah kategori</h2><button type="button" aria-label="Tutup tambah kategori" onClick={closeAdd}><X aria-hidden="true" /></button></header>
            <form onSubmit={addCategory}>
              <div className="form-field">
                <label htmlFor="category-type">Jenis transaksi</label>
                <select id="category-type" value={type} onChange={(event) => setType(event.target.value as TransactionType)}>
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="category-name">Nama kategori</label>
                <input id="category-name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" required />
                <p className="form-helper">Nama ini akan muncul saat mencatat transaksi.</p>
              </div>
              <button type="submit" className="simple-primary">Tambah kategori</button>
            </form>
          </section>
        </div>
      )}

      <DeleteConfirmation
        open={pendingDelete !== null}
        target={`Kategori “${pendingDelete?.name ?? ''}”`}
        subject="kategori"
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={removeCategory}
      />
    </section>
  );
};

export default CategoryManager;
