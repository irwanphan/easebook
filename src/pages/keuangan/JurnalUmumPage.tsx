import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { JurnalTambahModal } from "@/features/keuangan/JurnalTambahModal";
import type { AkunKeuanganRow, JurnalUmumListRow } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

const JENIS_LABELS: Record<string, string> = {
  PEMBELIAN: "Pembelian (hutang / inventori)",
  PEMBELIAN_TUNAI: "Pembelian tunai (kas keluar)",
  PENJUALAN: "Penjualan (naik piutang)",
  PELUNASAN_PIUTANG: "Pelunasan piutang (kas masuk)",
  PELUNASAN_HUTANG: "Pelunasan hutang (kas keluar)",
  PENERIMAAN_LAINNYA: "Penerimaan lain (kas masuk)",
  PENGELUARAN_LAINNYA: "Pengeluaran lain (kas keluar)",
  TRANSFER: "Transfer antar akun kas",
  MANUAL: "Jurnal manual",
};

function jenisBadgeVariant(jenis: string) {
  if (jenis === "MANUAL") return "neutral" as const;
  if (jenis === "PEMBELIAN" || jenis === "PEMBELIAN_TUNAI") return "neutral" as const;
  if (jenis === "PENJUALAN") return "success" as const;
  if (jenis === "PELUNASAN_PIUTANG" || jenis === "PENERIMAAN_LAINNYA") return "processing" as const;
  if (jenis === "PELUNASAN_HUTANG" || jenis === "PENGELUARAN_LAINNYA") return "delayed" as const;
  if (jenis === "TRANSFER") return "warning" as const;
  return "neutral" as const;
}

function jenisLabel(jenis: string) {
  return JENIS_LABELS[jenis] ?? jenis;
}

export function JurnalUmumPage() {
  const [akunList, setAkunList] = useState<AkunKeuanganRow[]>([]);
  const [akunLoading, setAkunLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [rows, setRows] = useState<JurnalUmumListRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const fetchAkun = useCallback(async () => {
    setAkunLoading(true);
    setError(null);
    try {
      const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
      setAkunList(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setAkunList([]);
    } finally {
      setAkunLoading(false);
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const list = await invoke<JurnalUmumListRow[]>("jurnal_umum_list");
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAkun();
    void fetchRows();
  }, [fetchAkun, fetchRows]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Jurnal umum"
        description="Riwayat semua entri jurnal. Tambah jurnal manual dengan baris debit dan kredit yang seimbang."
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Riwayat jurnal</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Setiap transaksi ditampilkan per baris akun (debit dan kredit terpisah).
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" onClick={() => setModalOpen(true)} disabled={akunLoading}>
              Tambah jurnal
            </Button>
            <Button type="button" variant="secondary" onClick={() => void fetchRows()} disabled={listLoading}>
              {listLoading ? "Memuat…" : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Jenis</th>
                <th className="px-5 py-3">Referensi</th>
                <th className="px-5 py-3">Akun</th>
                <th className="px-5 py-3">Catatan</th>
                <th className="px-5 py-3 text-right">Debit</th>
                <th className="px-5 py-3 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {listLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat jurnal…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Belum ada jurnal.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.lineId} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 text-zinc-600">{r.tanggal}</td>
                    <td className="px-5 py-3">
                      <Badge variant={jenisBadgeVariant(r.jenis)}>{jenisLabel(r.jenis)}</Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">
                      {r.referensi || "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-800">
                      <span className="font-mono text-xs font-medium">{r.akunKode}</span>
                      <span className="text-zinc-500"> — {r.akunNama}</span>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{r.catatan || "—"}</td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900">
                      {r.debit > 0 ? formatRupiah(r.debit) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900">
                      {r.kredit > 0 ? formatRupiah(r.kredit) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <JurnalTambahModal
        open={modalOpen}
        akunList={akunList}
        onClose={() => setModalOpen(false)}
        onSaved={fetchRows}
      />
    </div>
  );
}
