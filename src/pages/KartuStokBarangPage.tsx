import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
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

function formatTanggal(iso: string) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatWaktu(ts: number) {
  return new Date(ts * 1000).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KartuStokBarangPage() {
  const { kode: kodeParam } = useParams();
  const kode = kodeParam ? decodeURIComponent(kodeParam) : "";
  const { items: barangItems } = useBarangJasa();
  const barang = barangItems.find((b) => b.kode.toLowerCase() === kode.trim().toLowerCase());

  const satuanMeta = useMemo(
    () => (barang ? getSatuanStokMeta(barang) : { satuanStok: "—", konversiRingkasan: null as string | null }),
    [barang],
  );
  const satuanStok = barang ? getSatuanStokBarang(barang) : "—";

  const [rows, setRows] = useState<StokMutasiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!kode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<StokMutasiRow[]>("stok_mutasi_for_barang", { kode: kode.trim() });
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [kode]);

  useEffect(() => {
    void load();
  }, [load]);

  const saldoTerakhir = rows.length > 0 ? rows[rows.length - 1]!.saldoSetelah : barang?.stok;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          to="/barang-jasa"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke barang &amp; jasa
        </Link>
        <PageHeader
          title="Kartu stok"
          // description={
          //   barang
          //     ? `${barang.kode} — ${barang.nama} · riwayat masuk/keluar tercatat di sistem.`
          //     : `Kode ${kode || "—"} · mutasi tercatat (nama barang tidak ditemukan di katalog saat ini).`
          // }
        />
      </div>

      {barang?.tipe === "Barang" ? (
        <Card className="flex flex-wrap items-start justify-between gap-4 border-brand-100/80 bg-brand-50/40">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Satuan pencatatan stok</p>
            <p className="text-lg font-semibold text-zinc-900">{satuanMeta.satuanStok}</p>
            {satuanMeta.konversiRingkasan ? (
              <p className="text-sm text-zinc-600">
                Hirarki satuan: <span className="font-medium">{satuanMeta.konversiRingkasan}</span>
              </p>
            ) : (
              <p className="text-sm text-zinc-500">Satu tingkat satuan — semua mutasi dalam {satuanMeta.satuanStok}.</p>
            )}
          </div>
          {saldoTerakhir != null ? (
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Saldo saat ini</p>
              <p className="text-lg font-semibold text-zinc-900">
                {formatQtyDenganSatuan(saldoTerakhir, satuanMeta.satuanStok, "saldo")}
              </p>
            </div>
          ) : null}
        </Card>
      ) : null}

      {barang?.tipe === "Jasa" ? (
        <Card>
          <p className="text-sm text-zinc-600">
            Item bertipe <Badge variant="processing">Jasa</Badge> tidak memiliki stok fisik; kartu stok hanya untuk
            barang.
          </p>
        </Card>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Memuat mutasi…</p> : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Waktu catat</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">Referensi</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3 text-right">Masuk ({satuanStok})</th>
                <th className="px-4 py-3 text-right">Keluar ({satuanStok})</th>
                <th className="px-4 py-3 text-right">Saldo ({satuanStok})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Belum ada mutasi stok untuk barang ini. Setelah pembelian barang tercatat, baris akan muncul di
                    sini.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-4 py-3 text-zinc-700">{formatTanggal(r.tanggalTransaksi)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatWaktu(r.waktu)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{labelJenisMutasi(r.jenis)}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-800">{r.referensi}</td>
                    <td className="max-w-[180px] px-4 py-3 text-zinc-600">
                      <span className="line-clamp-2" title={`${r.gudangKode} — ${r.gudangNama}`}>
                        {r.gudangKode} — {r.gudangNama}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">
                      {formatQtyDenganSatuan(r.qtyMasuk, satuanStok, "masuk")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-700">
                      {formatQtyDenganSatuan(r.qtyKeluar, satuanStok, "keluar")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                      {formatQtyDenganSatuan(r.saldoSetelah, satuanStok, "saldo")}
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
