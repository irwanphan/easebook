import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, FileText, Filter, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type {
  MutasiAntarGudangDetail,
  MutasiAntarGudangRiwayatRow,
} from "@/data/mutasiAntarGudang";
import {
  formatQtyMultiSatuan,
  getSatuanStokBarang,
  getSatuanStokMeta,
} from "@/data/barangJasa";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoInput } from "@/components/ui/TokoInput";

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultTanggalDari() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toIsoDate(d);
}

function defaultTanggalSampai() {
  return toIsoDate(new Date());
}

function formatTanggal(iso: string) {
  const dt = new Date(iso + "T12:00:00");
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatWaktu(ts: number) {
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatQtyAngka(n: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

export function LaporanMutasiAntarGudangPage() {
  const { items: barangItems } = useBarangJasa();
  const [tanggalDari, setTanggalDari] = useState(defaultTanggalDari);
  const [tanggalSampai, setTanggalSampai] = useState(defaultTanggalSampai);
  const [rows, setRows] = useState<MutasiAntarGudangRiwayatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MutasiAntarGudangDetail | null>(null);

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return true;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

  const totalQtyPeriode = useMemo(() => rows.reduce((s, r) => s + r.totalQty, 0), [rows]);

  const barangByKode = useMemo(() => {
    const m = new Map<string, (typeof barangItems)[number]>();
    for (const b of barangItems) {
      m.set(b.kode.toLowerCase(), b);
    }
    return m;
  }, [barangItems]);

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
      const list = await invoke<MutasiAntarGudangRiwayatRow[]>("mutasi_antar_gudang_riwayat_list", {
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

  const openDetail = useCallback(async (referensi: string) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await invoke<MutasiAntarGudangDetail>("mutasi_antar_gudang_riwayat_detail", {
        referensi,
      });
      setDetail(data);
    } catch (e) {
      setDetailError(tauriErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
    setDetailError(null);
  }

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <Link
          to="/barang-jasa"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke Barang & jasa
        </Link>
      </div>

      <PageHeader
        title="Laporan mutasi antar gudang"
        description="Riwayat pemindahan stok antar gudang, dikelompokkan per dokumen mutasi."
        actions={
          <Link to="/barang-jasa/mutasi-antar-gudang">
            <Button type="button" variant="primary">
              <ArrowRightLeft className="h-4 w-4" aria-hidden />
              Buat mutasi
            </Button>
          </Link>
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Tanggal mulai
            <TokoInput
              id="lmag-dari"
              type="date"
              value={tanggalDari}
              onChange={(e) => setTanggalDari(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Tanggal akhir
            <TokoInput
              id="lmag-sampai"
              type="date"
              value={tanggalSampai}
              onChange={(e) => setTanggalSampai(e.target.value)}
            />
          </label>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => void fetchRows()}>
            <Filter className="h-4 w-4" aria-hidden />
            {loading ? "Memuat…" : "Terapkan filter"}
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            {rows.length} dokumen mutasi · {formatQtyAngka(totalQtyPeriode)} unit terkecil agregat (lintas barang;
            satuan bisa berbeda — lihat detail per dokumen).
          </p>
        ) : null}
      </Card>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-8 text-center text-sm text-zinc-500">Memuat laporan…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">
            Tidak ada mutasi antar gudang pada periode ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Referensi</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Asal → Tujuan</th>
                  <th className="px-4 py-3">Barang dipindahkan</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => {
                  const baris = row.baris ?? [];
                  const preview = baris.slice(0, 3);
                  const sisa = baris.length - preview.length;
                  return (
                    <tr key={row.referensi} className="align-top hover:bg-zinc-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-800">{row.referensi}</td>
                      <td className="px-4 py-3 text-zinc-700">
                        <div>{formatTanggal(row.tanggal)}</div>
                        <div className="text-xs text-zinc-500">{formatWaktu(row.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-800 flex items-center gap-1">
                        <span className="flex flex-col border border-slate-300 rounded-md py-0.5 px-1.5">
                          <span className="font-medium text-sm">{row.gudangAsalKode}</span>
                          <span className="text-slate-700 text-xs">{row.gudangAsalNama}</span>
                        </span>
                        <span className="mx-1 text-zinc-400">→</span>
                        <span className="flex flex-col border border-slate-300 rounded-md py-0.5 px-1.5">
                          <span className="font-medium text-sm">{row.gudangTujuanKode}</span>
                          <span className="text-slate-700 text-xs">{row.gudangTujuanNama}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        {baris.length === 0 ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {preview.map((b) => {
                              const barang = barangByKode.get(b.barangKode.toLowerCase());
                              const satuanStok = barang ? getSatuanStokBarang(barang) : b.satuan || "";
                              const meta = barang
                                ? getSatuanStokMeta(barang)
                                : { konversiRingkasan: null as string | null };
                              const barangForFormat = barang ?? {
                                satuan: b.satuan,
                                satuanTingkat: undefined,
                              };
                              return (
                                <li key={b.barangKode} className="flex items-baseline gap-2">
                                  <span className="font-medium tabular-nums text-zinc-900">
                                    {formatQtyMultiSatuan(b.qty, barangForFormat)}
                                  </span>
                                  <span className="truncate text-xs text-zinc-500" title={b.barangNama}>
                                    {b.barangNama}
                                  </span>
                                  {meta.konversiRingkasan ? (
                                    <span className="text-[11px] text-zinc-400">
                                      = {formatQtyAngka(b.qty)} {satuanStok}
                                    </span>
                                  ) : null}
                                </li>
                              );
                            })}
                            {sisa > 0 ? (
                              <li className="text-xs text-zinc-500">+ {sisa} barang lainnya…</li>
                            ) : null}
                          </ul>
                        )}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-zinc-600" title={row.catatan}>
                        {row.catatan || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => void openDetail(row.referensi)}
                        >
                          <FileText className="h-4 w-4" aria-hidden />
                          Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={detailOpen}
        title={detail ? `Mutasi ${detail.referensi}` : "Detail mutasi"}
        onClose={closeDetail}
        panelClassName="max-w-2xl"
        footer={
          <Button type="button" variant="outline" onClick={closeDetail}>
            <X className="h-4 w-4" aria-hidden />
            Tutup
          </Button>
        }
      >
        {detailLoading ? (
          <p className="text-sm text-zinc-500">Memuat detail…</p>
        ) : detailError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{detailError}</p>
        ) : detail ? (
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Tanggal transaksi</dt>
                <dd className="font-medium text-zinc-900">{formatTanggal(detail.tanggal)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Dicatat</dt>
                <dd className="font-medium text-zinc-900">{formatWaktu(detail.createdAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">Rute</dt>
                <dd className="font-medium text-zinc-900">
                  {detail.gudangAsalKode} ({detail.gudangAsalNama}) → {detail.gudangTujuanKode} (
                  {detail.gudangTujuanNama})
                </dd>
              </div>
              {detail.catatan ? (
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500">Catatan</dt>
                  <dd className="text-zinc-800">{detail.catatan}</dd>
                </div>
              ) : null}
            </dl>

            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                    <th className="px-3 py-2">Kode</th>
                    <th className="px-3 py-2">Nama barang</th>
                    <th className="px-3 py-2">Satuan stok</th>
                    <th className="px-3 py-2 text-right">Qty dipindahkan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {detail.baris.map((b) => {
                    const barang = barangByKode.get(b.barangKode.toLowerCase());
                    const satuanStok = barang ? getSatuanStokBarang(barang) : b.satuan || "—";
                    const meta = barang
                      ? getSatuanStokMeta(barang)
                      : { satuanStok, konversiRingkasan: null as string | null };
                    const barangForFormat = barang ?? {
                      satuan: b.satuan,
                      satuanTingkat: undefined,
                    };
                    return (
                      <tr key={b.barangKode}>
                        <td className="px-3 py-2 align-top font-mono text-xs">{b.barangKode}</td>
                        <td className="px-3 py-2 align-top">{b.barangNama}</td>
                        <td className="px-3 py-2 align-top text-zinc-700">
                          <span className="block font-medium">{satuanStok}</span>
                          {meta.konversiRingkasan ? (
                            <span className="block text-xs text-zinc-400">{meta.konversiRingkasan}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top text-right tabular-nums font-medium">
                          <span className="block">{formatQtyMultiSatuan(b.qty, barangForFormat)}</span>
                          {meta.konversiRingkasan ? (
                            <span className="block text-xs font-normal text-zinc-400">
                              = {formatQtyAngka(b.qty)} {satuanStok}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-200 bg-zinc-50/80">
                    <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold uppercase text-zinc-500">
                      Total agregat (satuan terkecil)
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatQtyAngka(detail.totalQty)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
