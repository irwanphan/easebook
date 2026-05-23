import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ListFilterBar } from "@/components/ui/ListFilterBar";
import type { KontakMasterRow } from "@/data/kontakMaster";
import { KontakMasterListTable } from "@/features/kontak-master/KontakMasterListTable";
import { useKontakMasterFilter } from "@/features/kontak-master/useKontakMasterFilter";
import { usePelanggan } from "@/features/pelanggan/PelangganContext";
import { tauriErrorMessage } from "@/lib/tauriError";

export function PelangganPage() {
  const navigate = useNavigate();
  const { items, loading, removeItem } = usePelanggan();
  const { query, setQuery, filteredItems, reset, isDefault } =
    useKontakMasterFilter(items);

  const [pendingDelete, setPendingDelete] = useState<KontakMasterRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await removeItem(pendingDelete.kode);
      setPendingDelete(null);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, removeItem]);

  const handleCancelDelete = useCallback(() => {
    if (deleting) return;
    setPendingDelete(null);
    setError(null);
  }, [deleting]);

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
        rows={filteredItems}
        loading={loading}
        editPathForKode={(kode) => `/manajemen/pelanggan/ubah/${encodeURIComponent(kode)}`}
        onDelete={(row) => setPendingDelete(row)}
        emptyMessage={
          items.length === 0
            ? 'Belum ada pelanggan. Klik "Tambah pelanggan" untuk menambahkan.'
            : "Tidak ada pelanggan yang cocok dengan pencarian."
        }
        filterBar={
          <ListFilterBar
            search={{
              value: query,
              onChange: setQuery,
              placeholder: "Cari kode, nama, kota, telepon, atau email…",
            }}
            onReset={reset}
            canReset={!isDefault}
            summary={
              loading
                ? "Memuat data dari database lokal…"
                : filteredItems.length === 0
                  ? items.length === 0
                    ? "Belum ada pelanggan."
                    : "Tidak ada pelanggan yang cocok dengan pencarian."
                  : `${filteredItems.length} pelanggan${
                      filteredItems.length !== items.length
                        ? ` dari ${items.length}`
                        : ""
                    }`
            }
          />
        }
      />

      <ConfirmModal
        open={pendingDelete !== null}
        variant="danger"
        title="Hapus pelanggan"
        message={
          pendingDelete
            ? error
              ? error
              : `Hapus pelanggan "${pendingDelete.kode} — ${pendingDelete.nama}"? Tindakan ini tidak dapat dibatalkan. Pelanggan yang sudah memiliki transaksi (penjualan / pelunasan piutang) tidak dapat dihapus.`
            : ""
        }
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
