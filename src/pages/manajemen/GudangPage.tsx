import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ListFilterBar } from "@/components/ui/ListFilterBar";
import { useGudang } from "@/features/gudang/GudangContext";
import type { GudangRow } from "@/data/gudang";
import { tauriErrorMessage } from "@/lib/tauriError";

function formatLuas(n: number) {
  return `${new Intl.NumberFormat("id-ID").format(n)} m²`;
}

export function GudangPage() {
  const navigate = useNavigate();
  const { items, loading, removeItem } = useGudang();
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<GudangRow | null>(null);
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
      const hay =
        `${row.kode} ${row.nama} ${row.alamat} ${row.lokasi} ${row.pic} ${row.nomorKontak} ${row.kapasitasPenyimpanan}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const handleReset = useCallback(() => setQuery(""), []);
  const isDefault = query === "";

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
      <PageHeader
        title="Gudang"
        // description="Master lokasi penyimpanan: alamat, koordinat peta, PIC, dan kapasitas."
        actions={
          <Button type="button" onClick={() => navigate("/manajemen/gudang/tambah")}>
            Tambah gudang
          </Button>
        }
      />
      <Card className="overflow-hidden p-0">
        <ListFilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Cari kode, nama, alamat, PIC, atau kontak…",
          }}
          onReset={handleReset}
          canReset={!isDefault}
          summary={
            loading
              ? "Memuat data dari database lokal…"
              : filteredItems.length === 0
                ? items.length === 0
                  ? "Belum ada gudang."
                  : "Tidak ada gudang yang cocok dengan pencarian."
                : `${filteredItems.length} gudang${
                    filteredItems.length !== items.length ? ` dari ${items.length}` : ""
                  }`
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="whitespace-nowrap px-4 py-3">Kode</th>
                <th className="whitespace-nowrap px-4 py-3">Nama</th>
                <th className="min-w-[180px] px-4 py-3">Alamat</th>
                <th className="whitespace-nowrap px-4 py-3">Lokasi (lat, lng)</th>
                <th className="whitespace-nowrap px-4 py-3">PIC</th>
                <th className="whitespace-nowrap px-4 py-3">Kontak</th>
                <th className="whitespace-nowrap px-4 py-3">Luas</th>
                <th className="min-w-[140px] px-4 py-3">Kapasitas</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat data dari database lokal…
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-zinc-500">
                    {items.length === 0
                      ? "Belum ada gudang. Klik \"Tambah gudang\" untuk menambahkan."
                      : "Tidak ada gudang yang cocok dengan pencarian."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.kode} className="bg-white hover:bg-zinc-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-zinc-800">
                      {row.kode}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                      {row.nama}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-zinc-600">
                      <span className="line-clamp-2" title={row.alamat}>
                        {row.alamat}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-700">
                      {row.lokasi ? (
                        <span title={row.lokasi}>{row.lokasi}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-800">{row.pic}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600">{row.nomorKontak}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-800">{formatLuas(row.luasM2)}</td>
                    <td className="max-w-[200px] px-4 py-3 text-zinc-600">
                      <span className="line-clamp-2" title={row.kapasitasPenyimpanan}>
                        {row.kapasitasPenyimpanan}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
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
        title="Hapus gudang"
        message={
          pendingDelete
            ? error
              ? error
              : `Hapus gudang "${pendingDelete.kode} — ${pendingDelete.nama}"? Tindakan ini tidak dapat dibatalkan. Gudang yang masih memiliki stok atau histori transaksi tidak akan terhapus.`
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
