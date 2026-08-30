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

  useMobileBackDismiss(addOpen && pendingDelete === null, () => {
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

  const visibleCategories = categories[type];
  const typeLabel = type === 'expense' ? 'pengeluaran' : 'pemasukan';

  return (
    <section className="utility-screen category-manager" aria-labelledby="category-manager-title">
      <header className="utility-screen-header category-manager-header">
        <div>
          <h2 id="category-manager-title">Kelola kategori</h2>
          <p>Kategori dipakai saat mencatat transaksi baru.</p>
        </div>
        <button type="button" className="utility-primary-action" onClick={() => setAddOpen(true)}>
          <Plus aria-hidden="true" />
          Tambah
        </button>
      </header>

      <div className="category-type-tabs" role="group" aria-label="Jenis kategori">
        {(['expense', 'income'] as const).map((categoryType) => {
          const label = categoryType === 'expense' ? 'Pengeluaran' : 'Pemasukan';
          return (
            <button
              key={categoryType}
              type="button"
              aria-pressed={type === categoryType}
              onClick={() => setType(categoryType)}
            >
              <span>{label}</span>
              <small>{categories[categoryType].length}</small>
            </button>
          );
        })}
      </div>

      <section className="category-manager-list" aria-labelledby="category-list-title">
        <div className="utility-section-heading category-list-heading">
          <div>
            <h3 id="category-list-title">Kategori {typeLabel}</h3>
            <p>{visibleCategories.length} kategori tersedia</p>
          </div>
        </div>

        {visibleCategories.length === 0 ? (
          <div className="category-manager-empty">
            <strong>Belum ada kategori {typeLabel}</strong>
            <p>Tambahkan kategori agar tersedia saat mencatat transaksi.</p>
            <button type="button" onClick={() => setAddOpen(true)}><Plus aria-hidden="true" />Tambah kategori</button>
          </div>
        ) : (
          <div className="category-manager-rows">
            {visibleCategories.map((category) => (
              <div key={category} className="category-manager-row">
                <span>{category}</span>
                <button type="button" aria-label={`Hapus kategori ${category}`} onClick={() => setPendingDelete({ type, name: category })}>
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {addOpen && (
        <div className="simple-dialog-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeAdd(); }}>
          <section className="simple-dialog category-add-dialog" role="dialog" aria-modal="true" aria-labelledby="add-category-title">
            <header>
              <div><h2 id="add-category-title">Tambah kategori</h2><p>Kategori baru akan tersedia untuk transaksi berikutnya.</p></div>
              <button type="button" aria-label="Tutup tambah kategori" onClick={closeAdd}><X aria-hidden="true" /></button>
            </header>
            <form onSubmit={addCategory}>
              <div className="category-add-type" role="group" aria-label="Jenis transaksi">
                {(['expense', 'income'] as const).map((categoryType) => (
                  <button
                    key={categoryType}
                    type="button"
                    aria-pressed={type === categoryType}
                    onClick={() => setType(categoryType)}
                  >
                    {categoryType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                  </button>
                ))}
              </div>
              <div className="form-field">
                <label htmlFor="category-name">Nama kategori</label>
                <input
                  id="category-name"
                  autoFocus
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="off"
                  placeholder={type === 'expense' ? 'Contoh: Perawatan kendaraan' : 'Contoh: Komisi'}
                  required
                />
                <p className="form-helper">Gunakan nama pendek yang mudah dikenali.</p>
              </div>
              <button type="submit" className="simple-primary" disabled={!name.trim()}>Tambah kategori</button>
            </form>
          </section>
        </div>
      )}

      <DeleteConfirmation
        open={pendingDelete !== null}
        target={`Kategori "${pendingDelete?.name ?? ''}"`}
        subject="kategori"
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={removeCategory}
      />
    </section>
  );
};

export default CategoryManager;
