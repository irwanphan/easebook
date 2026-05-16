import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PengeluaranListRow } from "@/data/pengeluaran";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultTanggalDariBulanIni() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

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

function formatTanggal(iso: string) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function KeuanganPengeluaranPage() {
  const navigate = useNavigate();
  const [tanggalDari, setTanggalDari] = useState(defaultTanggalDariBulanIni);
  const [tanggalSampai, setTanggalSampai] = useState(defaultTanggalSampaiBulanIni);
  const [rows, setRows] = useState<PengeluaranListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return true;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

  const totalPeriode = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);

  const fetchRows = useCallback(async () => {
    if (rentangInvalid) {
      setError("Tanggal akhir tidak boleh sebelum tanggal mulai.");
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<PengeluaranListRow[]>("pengeluaran_list", {
        tanggalDari: tanggalDari.trim(),
        tanggalSampai: tanggalSampai.trim(),
      });
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [rentangInvalid, tanggalDari, tanggalSampai]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Pengeluaran"
        description="Catat dan kelola pengeluaran kas / bank perusahaan."
        actions={
          <Button type="button" onClick={() => navigate("/keuangan/pengeluaran/tambah")}>
            Tambah pengeluaran
          </Button>
        }
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <div>
              <label htmlFor="pg-dari" className="block text-sm font-medium text-zinc-700">
                Tanggal mulai
              </label>
              <input
                id="pg-dari"
                type="date"
                value={tanggalDari}
                onChange={(e) => setTanggalDari(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label htmlFor="pg-sampai" className="block text-sm font-medium text-zinc-700">
                Tanggal akhir
              </label>
              <input
                id="pg-sampai"
                type="date"
                value={tanggalSampai}
                onChange={(e) => setTanggalSampai(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={() => void fetchRows()} disabled={loading}>
            {loading ? "Memuat…" : "Terapkan filter"}
          </Button>
        </div>

        <div className="border-b border-zinc-100 px-6 py-3">
          <p className="text-sm text-zinc-500">
            {loading
              ? "Memuat daftar…"
              : rows.length === 0
                ? "Tidak ada pengeluaran pada periode ini."
                : `${rows.length} transaksi · total ${formatRupiah(totalPeriode)}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. bukti</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Dibayar dari</th>
                <th className="px-5 py-3 text-right">Baris</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat pengeluaran…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Belum ada pengeluaran. Klik Tambah pengeluaran untuk mencatat biaya.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.nomor} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{row.nomor}</td>
                    <td className="px-5 py-3 text-zinc-600">{formatTanggal(row.tanggal)}</td>
                    <td className="px-5 py-3 text-zinc-700">
                      <span className="font-mono text-xs">{row.akunKasKode}</span>
                      {row.akunKasNama ? (
                        <span className="ml-1.5 text-zinc-600">— {row.akunKasNama}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-600">{row.jumlahBaris}</td>
                    <td className="px-5 py-3 text-right font-semibold text-zinc-900">{formatRupiah(row.total)}</td>
                    <td className="max-w-[220px] truncate px-5 py-3 text-zinc-600" title={row.catatan || undefined}>
                      {row.catatan || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
