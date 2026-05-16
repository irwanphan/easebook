import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AkunKeuanganFormModal } from "@/features/keuangan/AkunKeuanganFormModal";
import type { AkunKeuanganRow } from "@/data/keuangan";
import { labelKelompokLr } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function DaftarAkunPage() {
  const [rows, setRows] = useState<AkunKeuanganRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<AkunKeuanganRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreate = useCallback(() => {
    setEditingRow(null);
    setFormMode("create");
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((row: AkunKeuanganRow) => {
    setEditingRow(row);
    setFormMode("edit");
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingRow(null);
  }, []);

  const onDelete = useCallback(
    async (kodeRow: string) => {
      const ok = window.confirm(`Hapus akun ${kodeRow}?`);
      if (!ok) return;
      setError(null);
      try {
        await invoke("akun_keuangan_delete", { kode: kodeRow });
        await refresh();
      } catch (err) {
        setError(tauriErrorMessage(err));
      }
    },
    [refresh],
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Daftar akun"
        description="Chart of accounts: kode, nama, induk, kelompok laba rugi. Centang akun kas untuk akun yang saldonya dilacak dari jurnal."
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Semua akun</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Akun kas menampilkan saldo (awal 0, berubah dari jurnal). Akun lain dipakai di jurnal umum sesuai konfigurasi.
            </p>
          </div>
          <Button type="button" onClick={openCreate} className="shrink-0">
            Tambah akun
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-100">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-3">Kode</th>
                <th className="px-3 py-3">Nama akun</th>
                <th className="px-3 py-3">Induk</th>
                <th className="px-3 py-3">Laba rugi</th>
                <th className="px-3 py-3">Kas</th>
                <th className="px-3 py-3 text-right">Saldo kas</th>
                <th className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-5 text-center text-sm text-zinc-500">
                    Memuat akun…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                    Belum ada akun. Gunakan &quot;Tambah akun&quot; untuk menambahkan.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.kode} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-brand-700">{r.kode}</td>
                    <td className="px-3 py-3 font-medium text-zinc-900">{r.nama}</td>
                    <td className="px-3 py-3 text-xs text-zinc-600">
                      {r.indukKode ? (
                        <span>
                          <span className="font-mono text-zinc-500">{r.indukKode}</span>
                          {r.indukNama ? ` · ${r.indukNama}` : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-600">
                      {r.kelompokLr ? labelKelompokLr(r.kelompokLr) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {r.isAkunKas ? (
                        <Badge variant="success">Akun kas</Badge>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-zinc-900">
                      {r.isAkunKas ? formatRupiah(r.saldo) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                          onClick={() => openEdit(r)}
                        >
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          onClick={() => void onDelete(r.kode)}
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

      <AkunKeuanganFormModal
        open={formOpen}
        mode={formMode}
        editingRow={formMode === "edit" ? editingRow : null}
        rows={rows}
        onClose={closeForm}
        onSaved={refresh}
      />
    </div>
  );
}
