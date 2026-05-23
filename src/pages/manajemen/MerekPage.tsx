import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ListFilterBar } from "@/components/ui/ListFilterBar";
import { useMerek } from "@/features/merek/MerekContext";
import type { MerekRow } from "@/data/merek";
import { tauriErrorMessage } from "@/lib/tauriError";

export function MerekPage() {
  const navigate = useNavigate();
  const { items, loading, removeItem } = useMerek();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<MerekRow | null>(null);
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

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const hay = `${row.kode} ${row.nama} ${row.deskripsi}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const handleReset = useCallback(() => setQuery(""), []);
  const isDefault = query === "";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Merek"
        // description="Master merek untuk produk dan pemetaan ke katalog."
        actions={
          <Button type="button" onClick={() => navigate("/manajemen/merek/tambah")}>
            Tambah merek
          </Button>
        }
      />
      <Card className="overflow-hidden p-0">
        <ListFilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Cari kode, nama, atau deskripsi merek…",
          }}
          onReset={handleReset}
          canReset={!isDefault}
          summary={
            loading
              ? "Memuat data dari database lokal…"
              : filteredItems.length === 0
                ? items.length === 0
                  ? "Belum ada merek."
                  : "Tidak ada merek yang cocok dengan pencarian."
                : `${filteredItems.length} merek${
                    filteredItems.length !== items.length ? ` dari ${items.length}` : ""
                  }`
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Kode</th>
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">Deskripsi</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat data dari database lokal…
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-zinc-500">
                    {items.length === 0
                      ? "Belum ada merek. Klik \"Tambah merek\" untuk menambahkan."
                      : "Tidak ada merek yang cocok dengan pencarian."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.kode} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-zinc-800">
                      {row.kode}
                    </td>
                    <td className="px-5 py-3 font-medium text-zinc-900">{row.nama}</td>
                    <td className="max-w-md px-5 py-3 text-zinc-600">
                      {row.deskripsi ? (
                        <span className="line-clamp-2" title={row.deskripsi}>
                          {row.deskripsi}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" className="px-2 py-1 text-xs font-semibold">
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                          onClick={() => setPendingDelete(row)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        open={pendingDelete !== null}
        variant="danger"
        title="Hapus merek"
        message={
          pendingDelete
            ? error
              ? error
              : `Hapus merek "${pendingDelete.kode} — ${pendingDelete.nama}"? Tindakan ini tidak dapat dibatalkan. Merek yang masih dipakai oleh barang/jasa tidak akan terhapus.`
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
