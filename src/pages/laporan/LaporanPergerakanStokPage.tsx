import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { StokMutasiRow } from "@/data/stokMutasi";
import { labelJenisMutasi } from "@/data/stokMutasi";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { tauriErrorMessage } from "@/lib/tauriError";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultTanggalSampai() {
  return toIsoDate(new Date());
}

function defaultTanggalDari() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toIsoDate(d);
}

function formatTanggal(iso: string) {
  const dt = new Date(iso + "T12:00:00");
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatWaktu(ts: number) {
  return new Date(ts * 1000).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const selectClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export function LaporanPergerakanStokPage() {
  const { items: barangItems, loading: barangLoading } = useBarangJasa();
  const [tanggalDari, setTanggalDari] = useState(defaultTanggalDari);
  const [tanggalSampai, setTanggalSampai] = useState(defaultTanggalSampai);
  const [filterBarang, setFilterBarang] = useState("");
  const [rows, setRows] = useState<StokMutasiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const barangSorted = useMemo(
    () => [...barangItems].sort((a, b) => a.kode.localeCompare(b.kode, undefined, { sensitivity: "base" })),
    [barangItems],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<StokMutasiRow[]>("stok_mutasi_laporan", {
        tanggalDari: tanggalDari.trim(),
        tanggalSampai: tanggalSampai.trim(),
        barangKode: filterBarang.trim() ? filterBarang.trim() : null,
      });
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tanggalDari, tanggalSampai, filterBarang]);

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <Link
          to="/barang-jasa"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Barang &amp; jasa
        </Link>
        <PageHeader
          title="Pergerakan stok"
          description="Laporan mutasi masuk/keluar berdasarkan rentang tanggal; filter opsional per SKU."
        />
      </div>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div>
            <label htmlFor="lap-dari" className="block text-sm font-medium text-zinc-700">
              Tanggal mulai
            </label>
            <input
              id="lap-dari"
              type="date"
              value={tanggalDari}
              onChange={(e) => setTanggalDari(e.target.value)}
              className={selectClass}
            />
          </div>
          <div>
            <label htmlFor="lap-sampai" className="block text-sm font-medium text-zinc-700">
              Tanggal akhir
            </label>
            <input
              id="lap-sampai"
              type="date"
              value={tanggalSampai}
              onChange={(e) => setTanggalSampai(e.target.value)}
              className={selectClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="lap-brg" className="block text-sm font-medium text-zinc-700">
              Barang (opsional)
            </label>
            <select
              id="lap-brg"
              value={filterBarang}
              onChange={(e) => setFilterBarang(e.target.value)}
              className={selectClass}
              disabled={barangLoading}
            >
              <option value="">Semua barang &amp; jasa</option>
              {barangSorted.map((b) => (
                <option key={b.kode} value={b.kode}>
                  {b.kode} — {b.nama}
                </option>
              ))}
            </select>
          </div>
          <div className="flex sm:col-span-2 lg:col-span-1">
            <Button type="button" className="mt-6 w-full sm:mt-0 lg:mt-6" onClick={() => void load()}>
              Terapkan
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Memuat laporan…</p> : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Barang</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Referensi</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3 text-right">Masuk</th>
                <th className="px-4 py-3 text-right">Keluar</th>
                <th className="px-4 py-3 text-right">Saldo stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Tidak ada mutasi pada rentang dan filter ini.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-zinc-700">{formatTanggal(r.tanggalTransaksi)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatWaktu(r.waktu)}</td>
                    <td className="max-w-[200px] px-4 py-3">
                      <span className="font-mono text-xs text-zinc-500">{r.barangKode}</span>
                      <span className="mt-0.5 line-clamp-2 block font-medium text-zinc-900">{r.barangNama}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{labelJenisMutasi(r.jenis)}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-800">{r.referensi}</td>
                    <td className="max-w-[160px] px-4 py-3 text-xs text-zinc-600">
                      <span className="line-clamp-2">{r.gudangNama}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">
                      {r.qtyMasuk > 0 ? `+${r.qtyMasuk}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-700">
                      {r.qtyKeluar > 0 ? `-${r.qtyKeluar}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900">{r.saldoSetelah}</td>
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
