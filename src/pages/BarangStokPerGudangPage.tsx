import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { StokPerGudangMatrix } from "@/data/stokPerGudang";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function formatQty(n: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

export function BarangStokPerGudangPage() {
  const [matrix, setMatrix] = useState<StokPerGudangMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cari, setCari] = useState("");

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
          description="Satu baris per barang; kolom dinamis mengikuti gudang yang terdaftar. Angka stok dihitung dari mutasi masuk/keluar per gudang."
          actions={
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
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

      <Card className="p-4 sm:p-6">
        <label htmlFor="cari-barang-gudang" className="block text-sm font-medium text-zinc-700">
          Cari barang
        </label>
        <input
          id="cari-barang-gudang"
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Kode atau nama barang…"
          className={`${inputClass} mt-1 max-w-md`}
          disabled={loading}
        />
      </Card>

      <Card className="overflow-hidden p-0">
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
                <th className="min-w-[72px] px-5 py-3 text-right">Total stok</th>
                {gudang.map((g) => (
                  <th key={g.kode} className="min-w-[112px] px-4 py-3 text-right" title={g.nama}>
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
                barangFiltered.map((row) => (
                  <tr key={row.kode} className="group bg-white hover:bg-zinc-50/50">
                    <td className="sticky left-0 z-10 bg-white px-5 py-3 font-mono text-xs font-semibold text-brand-700 group-hover:bg-zinc-50/50">
                      {row.kode}
                    </td>
                    <td className="sticky left-[100px] z-10 max-w-[220px] truncate bg-white px-5 py-3 font-medium text-zinc-900 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)] group-hover:bg-zinc-50/50">
                      {row.nama}
                      <span className="ml-1.5 text-xs font-normal text-zinc-400">{row.satuan}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                      {formatQty(row.totalStok)}
                    </td>
                    {row.stokPerGudang.map((qty, idx) => (
                      <td
                        key={`${row.kode}-${gudang[idx]?.kode ?? idx}`}
                        className={`px-4 py-3 text-right tabular-nums ${
                          qty > 0 ? "text-zinc-800" : "text-zinc-300"
                        }`}
                      >
                        {formatQty(qty)}
                      </td>
                    ))}
                  </tr>
                ))
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
          . Stok per gudang dijumlah dari mutasi pembelian (masuk) dan penjualan (keluar).
        </p>
      ) : null}
    </div>
  );
}
