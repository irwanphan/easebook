import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListFilterBar } from "@/components/ui/ListFilterBar";
import type { HppListRow } from "@/data/hpp";
import { tauriErrorMessage } from "@/lib/tauriError";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatJumlah(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export function LaporanHppPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<HppListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<HppListRow[]>("barang_hpp_list");
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = `${r.kode} ${r.nama} ${r.satuan}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query]);

  const ringkasan = useMemo(() => {
    const totalNilai = filteredRows.reduce((sum, r) => sum + r.totalNilai, 0);
    const totalItemBerstok = filteredRows.filter((r) => r.stok > 0).length;
    return { totalNilai, totalItemBerstok };
  }, [filteredRows]);

  const canReset = query.trim() !== "";

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
          title="HPP barang (rata-rata bergerak)"
          description="Harga Pokok Penjualan (HPP) dihitung dengan metode moving average per item — setiap pembelian merekalkulasi HPP berdasarkan stok lama, HPP lama, dan harga beli baru."
          actions={
            <Button
              type="button"
              variant="secondary"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              Muat ulang
            </Button>
          }
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <ListFilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: "Cari kode / nama / satuan…",
            label: "Pencarian barang",
          }}
          onReset={() => setQuery("")}
          canReset={canReset}
          summary={
            loading
              ? "Memuat data HPP…"
              : rows.length === 0
                ? "Belum ada barang fisik yang tercatat."
                : `${formatJumlah(filteredRows.length)} barang · ${formatJumlah(ringkasan.totalItemBerstok)} berstok · total nilai persediaan ${formatRupiah(ringkasan.totalNilai)}`
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Kode</th>
                <th className="px-5 py-3">Nama barang</th>
                <th className="px-5 py-3">Satuan stok</th>
                <th className="px-5 py-3 text-right">Stok</th>
                <th className="px-5 py-3 text-right">HPP / unit</th>
                <th className="px-5 py-3 text-right">Total nilai</th>
                <th className="px-5 py-3 text-right">Aktivitas</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-zinc-500"
                  >
                    {rows.length === 0
                      ? "Belum ada barang fisik yang tercatat."
                      : "Tidak ada barang yang cocok dengan kata kunci."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const stokKosong = row.stok <= 0;
                  return (
                    <tr key={row.kode} className="bg-white hover:bg-zinc-50/50">
                      <td className="px-5 py-3 font-mono text-xs text-brand-800">
                        {row.kode}
                      </td>
                      <td className="px-5 py-3 font-medium text-zinc-900">
                        {row.nama}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{row.satuan}</td>
                      <td
                        className={`px-5 py-3 text-right font-medium ${
                          stokKosong ? "text-zinc-400" : "text-zinc-900"
                        }`}
                      >
                        {formatJumlah(row.stok)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-zinc-900">
                        {row.hpp > 0 ? formatRupiah(row.hpp) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-zinc-900">
                        {row.totalNilai !== 0
                          ? formatRupiah(row.totalNilai)
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge variant="neutral">
                          {formatJumlah(row.jumlahEvent)} event
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() =>
                            navigate(
                              `/laporan/hpp/${encodeURIComponent(row.kode)}`,
                            )
                          }
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          Histori
                        </Button>
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
