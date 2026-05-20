import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { JurnalTambahModal } from "@/features/keuangan/JurnalTambahModal";
import type { AkunKeuanganRow, JurnalUmumListRow } from "@/data/keuangan";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Tanggal 1 bulan berjalan (YYYY-MM-DD). */
function defaultTanggalDariBulanIni() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

/** Tanggal terakhir bulan berjalan (YYYY-MM-DD). */
function defaultTanggalSampaiBulanIni() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

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
  PENJUALAN: "Penjualan (piutang)",
  PENJUALAN_TUNAI: "Penjualan tunai (kas masuk)",
  PELUNASAN_PIUTANG: "Pelunasan piutang (kas masuk)",
  PELUNASAN_HUTANG: "Pelunasan hutang (kas keluar)",
  PELUNASAN_PIUTANG_REVERSAL: "Pembalik pelunasan piutang",
  PELUNASAN_HUTANG_REVERSAL: "Pembalik pelunasan hutang",
  TRANSFER_REVERSAL: "Pembalik transfer kas",
  PENERIMAAN: "Penerimaan (pendapatan / kas masuk)",
  PENERIMAAN_LAINNYA: "Penerimaan lain (kas masuk)",
  PENGELUARAN: "Pengeluaran (biaya / kas keluar)",
  PENGELUARAN_LAINNYA: "Pengeluaran lain (kas keluar)",
  TRANSFER: "Transfer antar akun kas",
  MANUAL: "Jurnal manual",
};

function jenisBadgeVariant(jenis: string) {
  if (jenis.endsWith("_REVERSAL")) return "delayed" as const;
  if (jenis === "MANUAL") return "neutral" as const;
  if (jenis === "PEMBELIAN" || jenis === "PEMBELIAN_TUNAI") return "neutral" as const;
  if (jenis === "PENJUALAN" || jenis === "PENJUALAN_TUNAI") return "success" as const;
  if (jenis === "PELUNASAN_PIUTANG" || jenis === "PENERIMAAN" || jenis === "PENERIMAAN_LAINNYA")
    return "processing" as const;
  if (jenis === "PELUNASAN_HUTANG" || jenis === "PENGELUARAN" || jenis === "PENGELUARAN_LAINNYA")
    return "delayed" as const;
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

  const [tanggalDari, setTanggalDari] = useState(defaultTanggalDariBulanIni);
  const [tanggalSampai, setTanggalSampai] = useState(defaultTanggalSampaiBulanIni);
  const [rows, setRows] = useState<JurnalUmumListRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return true;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

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
    if (rentangInvalid) {
      setError("Tanggal akhir tidak boleh sebelum tanggal mulai.");
      setRows([]);
      return;
    }
    setListLoading(true);
    setError(null);
    try {
      const list = await invoke<JurnalUmumListRow[]>("jurnal_umum_list", {
        tanggalDari: tanggalDari.trim(),
        tanggalSampai: tanggalSampai.trim(),
      });
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [rentangInvalid, tanggalDari, tanggalSampai]);

  useEffect(() => {
    void fetchAkun();
    void fetchRows();
  }, []);

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
            <Button type="button" variant="secondary" onClick={() => void fetchRows()} disabled={listLoading || rentangInvalid}>
              {listLoading ? "Memuat…" : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="border-b border-zinc-100 px-6 pb-5">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <div>
              <label htmlFor="jurnal-dari" className="block text-sm font-medium text-zinc-700">
                Tanggal mulai
              </label>
              <input
                id="jurnal-dari"
                type="date"
                value={tanggalDari}
                onChange={(e) => setTanggalDari(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="jurnal-sampai" className="block text-sm font-medium text-zinc-700">
                Tanggal akhir
              </label>
              <input
                id="jurnal-sampai"
                type="date"
                value={tanggalSampai}
                min={tanggalDari}
                onChange={(e) => setTanggalSampai(e.target.value)}
                className={inputClass}
              />
            </div>
            <Button type="button" className="w-full lg:w-auto h-11 flex self-end" disabled={listLoading || rentangInvalid} onClick={() => void fetchRows()}>
              Terapkan filter
            </Button>
          </div>
          {rentangInvalid ? (
            <p className="mt-2 text-sm text-amber-700">Tanggal akhir harus sama atau setelah tanggal mulai.</p>
          ) : null}
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
                    Tidak ada jurnal pada rentang {tanggalDari} s/d {tanggalSampai}.
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
