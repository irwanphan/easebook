import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import type { KontakMasterRow } from "@/data/kontakMaster";
import { KontakMasterListTable } from "@/features/kontak-master/KontakMasterListTable";
import { usePelanggan } from "@/features/pelanggan/PelangganContext";
import { tauriErrorMessage } from "@/lib/tauriError";

export function PelangganPage() {
  const navigate = useNavigate();
  const { items, loading, removeItem } = usePelanggan();

  async function handleDelete(row: KontakMasterRow) {
    const ok = window.confirm(`Hapus pelanggan ${row.kode} — ${row.nama}?`);
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
        title="Pelanggan"
        description="Master pelanggan untuk penjualan, piutang, dan kontak bisnis."
        actions={
          <Button type="button" onClick={() => navigate("/manajemen/pelanggan/tambah")}>
            Tambah pelanggan
          </Button>
        }
      />
      <KontakMasterListTable
        rows={items}
        loading={loading}
        editPathForKode={(kode) => `/manajemen/pelanggan/ubah/${encodeURIComponent(kode)}`}
        onDelete={handleDelete}
        emptyMessage='Belum ada pelanggan. Klik "Tambah pelanggan" untuk menambahkan.'
      />
    </div>
  );
}
