import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import type { KontakMasterRow } from "@/data/kontakMaster";
import { KontakMasterListTable } from "@/features/kontak-master/KontakMasterListTable";
import { usePemasok } from "@/features/pemasok/PemasokContext";
import { tauriErrorMessage } from "@/lib/tauriError";

export function PemasokPage() {
  const navigate = useNavigate();
  const { items, loading, removeItem } = usePemasok();

  async function handleDelete(row: KontakMasterRow) {
    const ok = window.confirm(`Hapus pemasok ${row.kode} — ${row.nama}?`);
    if (!ok) return;
    try {
      await removeItem(row.kode);
    } catch (err) {
      window.alert(tauriErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Pemasok"
        description="Master supplier untuk pembelian, hutang dagang, dan kontak pengadaan."
        actions={
          <Button type="button" onClick={() => navigate("/manajemen/pemasok/tambah")}>
            Tambah pemasok
          </Button>
        }
      />
      <KontakMasterListTable
        rows={items}
        loading={loading}
        editPathForKode={(kode) => `/manajemen/pemasok/ubah/${encodeURIComponent(kode)}`}
        onDelete={handleDelete}
        emptyMessage='Belum ada pemasok. Klik "Tambah pemasok" untuk menambahkan.'
      />
    </div>
  );
}
