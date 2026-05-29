import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCcw, Sheet } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { StokPerGudangMatrix } from "@/data/stokPerGudang";
import {
  formatQtyMultiSatuan,
  getSatuanStokBarang,
  getSatuanStokMeta,
} from "@/data/barangJasa";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import { useXlsxExport } from "@/lib/useXlsxExport";
import type { BarangStokPerGudangRow } from "@/data/stokPerGudang";

const inputClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function formatQty(n: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

export function BarangStokPerGudangPage() {
  const { items: barangItems } = useBarangJasa();
  const [matrix, setMatrix] = useState<StokPerGudangMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const { exporting, exportNow } = useXlsxExport();

  const barangByKode = useMemo(() => {
    const m = new Map<string, (typeof barangItems)[number]>();
    for (const b of barangItems) {
      m.set(b.kode.toLowerCase(), b);
    }
    return m;
  }, [barangItems]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<StokPerGudangMatrix>("barang_stok_per_gudang_matrix");
      setMatrix(data);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const gudang = matrix?.gudang ?? [];
  const barangFiltered = useMemo(() => {
    const list = matrix?.barang ?? [];
    const q = cari.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) => b.kode.toLowerCase().includes(q) || b.nama.toLowerCase().includes(q),
    );
  }, [matrix?.barang, cari]);

  const minWidth = 520 + gudang.length * 120;

  const handleExport = useCallback(async () => {
    if (barangFiltered.length === 0 || gudang.length === 0) return;

    // Kolom statis di awal + 1 kolom numeric per gudang.
    const staticCols = [
      { header: "Kode", value: (r: BarangStokPerGudangRow) => r.kode, type: "text" as const, width: 14 },
      { header: "Nama", value: (r: BarangStokPerGudangRow) => r.nama, type: "text" as const, width: 30 },
      {
        header: "Satuan stok",
        value: (r: BarangStokPerGudangRow) => {
          const b = barangByKode.get(r.kode.toLowerCase());
          return b ? getSatuanStokBarang(b) : r.satuan || "";
        },
        type: "text" as const,
        width: 12,
      },
      {
        header: "Total stok",
        value: (r: BarangStokPerGudangRow) => r.totalStok,
        type: "integer" as const,
        width: 14,
      },
    ];

    const gudangCols = gudang.map((g, idx) => ({
      header: `${g.kode} — ${g.nama}`,
      value: (r: BarangStokPerGudangRow) => r.stokPerGudang[idx] ?? 0,
      type: "integer" as const,
      width: 18,
    }));

    await exportNow<BarangStokPerGudangRow>({
      fileName: "stok_barang_per_gudang",
      sheetName: "Stok per gudang",
      title: "Stok Barang per Gudang",
      meta: [
        { label: "Tanggal cetak", value: new Date().toLocaleString("id-ID") },
        { label: "Pencarian", value: cari.trim() || "—" },
        { label: "Jumlah barang", value: barangFiltered.length },
        { label: "Jumlah gudang", value: gudang.length },
        {
          label: "Catatan",
          value: "Angka stok dalam satuan terkecil tiap barang (kolom Satuan stok).",
        },
      ],
      columns: [...staticCols, ...gudangCols],
      data: barangFiltered,
    });
  }, [barangByKode, barangFiltered, cari, exportNow, gudang]);

  return (
    <div className="mx-auto flex max-w-[96rem] flex-col gap-6">
      <div>
        <Link
          to="/barang-jasa"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke barang &amp; jasa
        </Link>
        <PageHeader
          title="Stok barang per gudang"
          description="Satu baris per barang; kolom dinamis mengikuti gudang yang terdaftar. Angka stok dihitung dari mutasi masuk/keluar per gudang, dalam satuan terkecil tiap barang."
          actions={
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              {loading ? "Memuat…" : "Refresh"}
            </Button>
          }
        />
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-zinc-100 mb-3 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label htmlFor="cari-barang-gudang" className="block text-sm font-medium text-zinc-700">
              Cari barang
            </label>
            <input
              id="cari-barang-gudang"
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Kode atau nama barang…"
              className={`${inputClass} mt-1 w-full max-w-md`}
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleExport()}
              disabled={loading || exporting || barangFiltered.length === 0 || gudang.length === 0}
              title={
                gudang.length === 0
                  ? "Tidak ada gudang"
                  : barangFiltered.length === 0
                    ? "Tidak ada barang pada filter ini"
                    : `Export ${barangFiltered.length} barang × ${gudang.length} gudang ke .xlsx`
              }
            >
              <Sheet className="h-4 w-4" aria-hidden />
              {exporting ? "Mengexport…" : "Export XLSX"}
            </Button>
          </div>
        </div>

        <div className="border-b border-zinc-100 px-6 py-3">
          <p className="text-sm text-zinc-500">
            {loading
              ? "Memuat matriks stok…"
              : gudang.length === 0
                ? "Belum ada gudang. Tambahkan gudang di menu Manajemen terlebih dahulu."
                : `${barangFiltered.length} barang · ${gudang.length} gudang`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth: minWidth }}>
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="sticky left-0 z-20 min-w-[100px] bg-zinc-50/95 px-5 py-3">Kode</th>
                <th className="sticky left-[100px] z-20 min-w-[180px] bg-zinc-50/95 px-5 py-3 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                  Nama
                </th>
                <th className="min-w-[140px] px-5 py-3 text-right">Total stok</th>
                {gudang.map((g) => (
                  <th key={g.kode} className="min-w-[140px] px-4 py-3 text-right" title={g.nama}>
                    <span className="block truncate font-mono text-[10px] font-normal normal-case text-zinc-400">
                      {g.kode}
                    </span>
                    <span className="block truncate">{g.nama}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={3 + gudang.length} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Memuat data…
                  </td>
                </tr>
              ) : gudang.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Tidak ada gudang untuk ditampilkan.
                  </td>
                </tr>
              ) : barangFiltered.length === 0 ? (
                <tr>
                  <td colSpan={3 + gudang.length} className="px-5 py-12 text-center text-sm text-zinc-500">
                    {matrix?.barang.length === 0
                      ? "Belum ada barang bertipe Barang di katalog."
                      : "Tidak ada barang sesuai pencarian."}
                  </td>
                </tr>
              ) : (
                barangFiltered.map((row) => {
                  const barang = barangByKode.get(row.kode.toLowerCase());
                  const satuanStok = barang ? getSatuanStokBarang(barang) : row.satuan || "—";
                  const meta = barang
                    ? getSatuanStokMeta(barang)
                    : { satuanStok, konversiRingkasan: null as string | null };
                  const satuanTooltip = meta.konversiRingkasan
                    ? `Satuan stok: ${satuanStok} · Hirarki: ${meta.konversiRingkasan}`
                    : `Satuan stok: ${satuanStok}`;
                  const barangForFormat = barang ?? {
                    satuan: row.satuan,
                    satuanTingkat: undefined,
                  };
                  return (
                    <tr key={row.kode} className="group bg-white hover:bg-zinc-50/50">
                      <td className="sticky left-0 z-10 bg-white px-5 py-3 font-mono text-xs font-semibold text-brand-700 group-hover:bg-zinc-50/50">
                        {row.kode}
                      </td>
                      <td className="sticky left-[100px] z-10 max-w-[260px] bg-white px-5 py-3 font-medium text-zinc-900 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)] group-hover:bg-zinc-50/50">
                        <span className="block truncate" title={row.nama}>
                          {row.nama}
                        </span>
                        <span
                          className="mt-0.5 block truncate text-xs font-normal text-zinc-500"
                          title={satuanTooltip}
                        >
                          Satuan: <span className="font-medium text-zinc-700">{satuanStok}</span>
                          {meta.konversiRingkasan ? (
                            <span className="ml-1 text-zinc-400">· {meta.konversiRingkasan}</span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                        <span className="block">{formatQtyMultiSatuan(row.totalStok, barangForFormat)}</span>
                        {meta.konversiRingkasan ? (
                          <span className="block text-xs font-normal text-zinc-400">
                            = {formatQty(row.totalStok)} {satuanStok}
                          </span>
                        ) : null}
                      </td>
                      {row.stokPerGudang.map((qty, idx) => (
                        <td
                          key={`${row.kode}-${gudang[idx]?.kode ?? idx}`}
                          className={`px-4 py-3 text-right tabular-nums ${
                            qty > 0 ? "text-zinc-800" : "text-zinc-300"
                          }`}
                          title={qty > 0 ? `${formatQty(qty)} ${satuanStok}` : undefined}
                        >
                          {qty > 0 ? (
                            <>
                              <span className="block font-medium text-zinc-800">
                                {formatQtyMultiSatuan(qty, barangForFormat)}
                              </span>
                              {meta.konversiRingkasan ? (
                                <span className="block text-[11px] font-normal text-zinc-400">
                                  {formatQty(qty)} {satuanStok}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span>0</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {!loading && gudang.length > 0 ? (
        <p className="text-xs text-zinc-500">
          Kolom gudang mengikuti daftar di{" "}
          <Link to="/manajemen/gudang" className="font-medium text-brand-600 hover:text-brand-700">
            Master gudang
          </Link>
          . Stok per gudang dijumlah dari mutasi pembelian (masuk) dan penjualan (keluar) — sudah dikonversi ke
          satuan terkecil yang tertera di kolom Nama tiap baris.
        </p>
      ) : null}
    </div>
  );
}
