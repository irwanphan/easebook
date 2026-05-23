import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Info, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  eventMengubahHpp,
  labelJenisEventHpp,
  type HppDetail,
} from "@/data/hpp";
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

function formatTanggal(iso: string) {
  const dt = new Date(iso + "T12:00:00");
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatWaktu(ts: number) {
  return new Date(ts * 1000).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Kartu statistik ringkasan: ditempel sebagai unit reusable di header
 * sebelum tabel histori.
 */
function StatCard({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <Card
      className={`p-5 ${emphasis ? "border-brand-200 bg-brand-50/40" : ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          emphasis ? "text-brand-900" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}

export function LaporanHppDetailPage() {
  const params = useParams<{ kode: string }>();
  const kodeParam = decodeURIComponent(params.kode ?? "");
  const [detail, setDetail] = useState<HppDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!kodeParam) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<HppDetail>("barang_hpp_detail", {
        kode: kodeParam,
      });
      setDetail(data);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [kodeParam]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <Link
          to="/laporan/hpp"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke daftar HPP
        </Link>
        <PageHeader
          title={
            detail
              ? `Histori HPP — ${detail.kode} · ${detail.nama}`
              : "Histori HPP barang"
          }
          // description="Setiap baris adalah event yang mempengaruhi (atau dicatat dalam) perhitungan HPP rata-rata bergerak. HPP baru hanya muncul saat pembelian; penjualan menggunakan HPP saat itu untuk menghitung nilai keluar."
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

      {detail ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Stok saat ini"
              value={`${formatJumlah(detail.stokAkhir)} ${detail.satuan}`}
              hint="Dalam satuan terkecil (lintas gudang)"
            />
            <StatCard
              label="HPP per unit"
              value={
                detail.hppAkhir > 0 ? formatRupiah(detail.hppAkhir) : "—"
              }
              hint="Rata-rata bergerak terakhir"
              emphasis
            />
            <StatCard
              label="Total nilai persediaan"
              value={
                detail.totalNilaiAkhir !== 0
                  ? formatRupiah(detail.totalNilaiAkhir)
                  : "—"
              }
              hint="≈ stok × HPP per unit"
            />
            <StatCard
              label="Jumlah event"
              value={formatJumlah(detail.events.length)}
              hint="Termasuk event yang tidak mengubah HPP"
            />
          </div>

          <Card className="border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                <span className="font-semibold">Cara baca histori:</span>{" "}
                baris berlabel <span className="font-semibold">Pembelian</span>{" "}
                mengubah HPP (kolom <em>HPP/unit</em> jadi baru).{" "}
                <span className="font-semibold">Penjualan</span> tidak mengubah
                HPP — kolom <em>Nilai event</em> dihitung dari qty keluar × HPP
                saat itu, sebagai biaya pokok atas penjualan tersebut.{" "}
                <span className="font-semibold">Mutasi antar gudang</span>{" "}
                netral (qty masuk gudang tujuan = qty keluar gudang sumber).
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Waktu input</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Referensi</th>
                    <th className="px-4 py-3">Gudang</th>
                    <th className="px-4 py-3 text-right">Qty masuk</th>
                    <th className="px-4 py-3 text-right">Qty keluar</th>
                    <th className="px-4 py-3 text-right">Harga beli/unit</th>
                    <th className="px-4 py-3 text-right">Nilai event</th>
                    <th className="px-4 py-3 text-right">Stok</th>
                    <th className="px-4 py-3 text-right">HPP/unit</th>
                    <th className="px-4 py-3 text-right">Total nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {detail.events.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-5 py-10 text-center text-sm text-zinc-500"
                      >
                        Belum ada event stok untuk barang ini.
                      </td>
                    </tr>
                  ) : (
                    detail.events.map((ev, idx) => {
                      const mengubahHpp = eventMengubahHpp(ev);
                      const jenisLabel = labelJenisEventHpp(ev.jenis);
                      const jenisUpper = ev.jenis.trim().toUpperCase();
                      const isPenjualan =
                        jenisUpper === "PENJUALAN" ||
                        jenisUpper === "PENJUALAN_TUNAI";
                      const isMutasi = jenisUpper === "MUTASI_GUDANG";
                      return (
                        <tr
                          key={`${ev.waktu}-${idx}`}
                          className={
                            mengubahHpp
                              ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                              : "bg-white hover:bg-zinc-50/60"
                          }
                        >
                          <td className="px-4 py-3 text-zinc-700">
                            {formatTanggal(ev.tanggalTransaksi)}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">
                            {formatWaktu(ev.waktu)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                mengubahHpp
                                  ? "success"
                                  : isPenjualan
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {jenisLabel}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-brand-800">
                            {ev.referensi}
                          </td>
                          <td className="max-w-[160px] px-4 py-3 text-xs text-zinc-600">
                            <span className="line-clamp-2">
                              {ev.gudangNama || ev.gudangKode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-700 tabular-nums">
                            {ev.qtyMasuk > 0
                              ? formatJumlah(ev.qtyMasuk)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-rose-700 tabular-nums">
                            {ev.qtyKeluar > 0
                              ? formatJumlah(ev.qtyKeluar)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                            {ev.hargaSatuanBeli !== null
                              ? formatRupiah(ev.hargaSatuanBeli)
                              : "—"}
                          </td>
                          <td
                            className={`px-4 py-3 text-right tabular-nums ${
                              ev.nilaiEvent > 0
                                ? "text-emerald-700"
                                : ev.nilaiEvent < 0
                                  ? "text-rose-700"
                                  : "text-zinc-400"
                            }`}
                          >
                            {ev.nilaiEvent !== 0
                              ? formatRupiah(ev.nilaiEvent)
                              : isMutasi
                                ? "netral"
                                : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-zinc-900 tabular-nums">
                            {formatJumlah(ev.stokSetelah)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-zinc-900 tabular-nums">
                            {ev.hppSetelah > 0
                              ? formatRupiah(ev.hppSetelah)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                            {ev.totalNilaiSetelah !== 0
                              ? formatRupiah(ev.totalNilaiSetelah)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : loading ? (
        <Card className="p-10 text-center text-sm text-zinc-500">
          Memuat histori HPP…
        </Card>
      ) : !error ? (
        <Card className="p-10 text-center text-sm text-zinc-500">
          Tidak ada data.
        </Card>
      ) : null}
    </div>
  );
}
