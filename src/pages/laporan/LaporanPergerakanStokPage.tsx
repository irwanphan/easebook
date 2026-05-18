import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { StokMutasiRow } from "@/data/stokMutasi";
import { labelJenisMutasi } from "@/data/stokMutasi";
import {
  formatQtyDenganSatuan,
  getSatuanStokBarang,
  getSatuanStokMeta,
} from "@/data/barangJasa";
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
  const { items: barangItems, loading: barangLoading, refresh: refreshBarang } = useBarangJasa();
  const [tanggalDari, setTanggalDari] = useState(defaultTanggalDari);
  const [tanggalSampai, setTanggalSampai] = useState(defaultTanggalSampai);
  const [filterBarang, setFilterBarang] = useState("");
  const [rows, setRows] = useState<StokMutasiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sinkronBusy, setSinkronBusy] = useState(false);
  const [sinkronInfo, setSinkronInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Abaikan hasil invoke jika sudah ada permintaan muat yang lebih baru. */
  const loadRequestId = useRef(0);

  const barangSorted = useMemo(
    () => [...barangItems].sort((a, b) => a.kode.localeCompare(b.kode, undefined, { sensitivity: "base" })),
    [barangItems],
  );

  const barangByKode = useMemo(() => {
    const m = new Map<string, (typeof barangItems)[number]>();
    for (const b of barangItems) {
      m.set(b.kode.toLowerCase(), b);
    }
    return m;
  }, [barangItems]);

  const filterBarangRow = filterBarang.trim()
    ? barangByKode.get(filterBarang.trim().toLowerCase())
    : undefined;

  const filterSatuanMeta = useMemo(
    () =>
      filterBarangRow
        ? getSatuanStokMeta(filterBarangRow)
        : { satuanStok: null as string | null, konversiRingkasan: null as string | null },
    [filterBarangRow],
  );

  function satuanStokUntukBaris(barangKode: string): string {
    const b = barangByKode.get(barangKode.toLowerCase());
    return b ? getSatuanStokBarang(b) : "—";
  }

  const load = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<StokMutasiRow[]>("stok_mutasi_laporan", {
        tanggalDari: tanggalDari.trim(),
        tanggalSampai: tanggalSampai.trim(),
        barangKode: filterBarang.trim() ? filterBarang.trim() : null,
      });
      if (requestId !== loadRequestId.current) return;
      setRows(list);
    } catch (e) {
      if (requestId !== loadRequestId.current) return;
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, [tanggalDari, tanggalSampai, filterBarang]);

  async function sinkronDariPembelian() {
    const ok = window.confirm(
      "Sinkronkan mutasi stok dari semua faktur pembelian?\n\n• Semua baris mutasi bertipe Pembelian akan dihapus dan dibuat ulang dari faktur.\n• Stok master untuk barang fisik akan disetel ulang sesuai total pembelian (urutan tanggal faktur).\n\nLanjutkan?",
    );
    if (!ok) return;
    setSinkronInfo(null);
    setError(null);
    setSinkronBusy(true);
    try {
      const msg = await invoke<string>("stok_mutasi_sinkron_dari_pembelian");
      setSinkronInfo(msg);
      await refreshBarang();
      await load();
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setSinkronBusy(false);
    }
  }

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
          description="Mutasi difilter menurut tanggal pencatatan di sistem (bukan tanggal faktur), supaya koreksi pembelian lama tetap terlihat saat Anda simpan dalam rentang ini. Kolom tanggal tabel = tanggal transaksi dokumen. Qty masuk/keluar/saldo dalam satuan terkecil per barang (hasil konversi dari faktur pembelian/penjualan)."
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
                  {b.tipe === "Barang" ? ` (stok ${b.stok ?? 0} ${getSatuanStokBarang(b)})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex sm:col-span-2 lg:col-span-1">
            <Button
              type="button"
              className="mt-6 w-full sm:mt-0 lg:mt-6"
              disabled={sinkronBusy}
              onClick={() => void load()}
            >
              Terapkan
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl text-sm text-zinc-600">
            <p className="font-medium text-zinc-800">Mutasi tidak selaras dengan faktur pembelian?</p>
            <p className="mt-1">
              Bangun ulang riwayat pembelian dari seluruh faktur yang tersimpan. Berguna setelah koreksi faktur atau data lama.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            disabled={sinkronBusy || loading || barangLoading}
            onClick={() => void sinkronDariPembelian()}
          >
            {sinkronBusy ? "Menyinkronkan…" : "Sinkron dari pembelian"}
          </Button>
        </div>
      </Card>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {sinkronInfo ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {sinkronInfo}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Memuat laporan…</p> : null}

      {filterBarangRow?.tipe === "Barang" && filterSatuanMeta.satuanStok ? (
        <Card className="border-brand-100/80 bg-brand-50/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Satuan pencatatan stok</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{filterSatuanMeta.satuanStok}</p>
          {filterSatuanMeta.konversiRingkasan ? (
            <p className="mt-1 text-sm text-zinc-600">
              Hirarki satuan: <span className="font-medium">{filterSatuanMeta.konversiRingkasan}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              Semua qty di tabel dalam {filterSatuanMeta.satuanStok} (satuan terkecil).
            </p>
          )}
        </Card>
      ) : null}

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
                <th className="px-4 py-3 text-right">
                  {filterSatuanMeta.satuanStok ? `Masuk (${filterSatuanMeta.satuanStok})` : "Masuk"}
                </th>
                <th className="px-4 py-3 text-right">
                  {filterSatuanMeta.satuanStok ? `Keluar (${filterSatuanMeta.satuanStok})` : "Keluar"}
                </th>
                <th className="px-4 py-3 text-right">
                  {filterSatuanMeta.satuanStok ? `Saldo (${filterSatuanMeta.satuanStok})` : "Saldo stok"}
                </th>
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
                rows.map((r) => {
                  const satuan = satuanStokUntukBaris(r.barangKode);
                  return (
                    <tr key={r.id} className="bg-white hover:bg-zinc-50/50">
                      <td className="px-4 py-3 text-zinc-700">{formatTanggal(r.tanggalTransaksi)}</td>
                      <td className="px-4 py-3 text-zinc-600">{formatWaktu(r.waktu)}</td>
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="font-mono text-xs text-zinc-500">{r.barangKode}</span>
                        <span className="mt-0.5 line-clamp-2 block font-medium text-zinc-900">{r.barangNama}</span>
                        {!filterBarang.trim() && satuan !== "—" ? (
                          <span className="mt-0.5 block text-xs text-zinc-500">Satuan stok: {satuan}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{labelJenisMutasi(r.jenis)}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-800">{r.referensi}</td>
                      <td className="max-w-[160px] px-4 py-3 text-xs text-zinc-600">
                        <span className="line-clamp-2">{r.gudangNama}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">
                        {formatQtyDenganSatuan(r.qtyMasuk, satuan, "masuk")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-rose-700">
                        {formatQtyDenganSatuan(r.qtyKeluar, satuan, "keluar")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                        {formatQtyDenganSatuan(r.saldoSetelah, satuan, "saldo")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
