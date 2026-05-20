import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { GudangRow } from "@/data/gudang";
import type { BarangSaldoGudangRow, MutasiAntarGudangPayload } from "@/data/mutasiAntarGudang";
import {
  findSatuanPilihan,
  formatQtyMultiSatuan,
  getDefaultSatuanPilihan,
  getSatuanStokBarang,
  qtyToSatuanTerkecil,
} from "@/data/barangJasa";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { FakturLineSatuanSelect } from "@/features/barang-jasa/FakturLineSatuanSelect";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatQty(n: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

type QtyEntry = {
  /** Qty dalam tier terpilih (bukan satuan terkecil). */
  qty: number;
  /** Tingkat satuan yang dipilih. */
  tingkat: number;
};

export function MutasiAntarGudangPage() {
  const navigate = useNavigate();
  const { items: barangItems } = useBarangJasa();
  const [gudangList, setGudangList] = useState<GudangRow[]>([]);
  const [gudangAsal, setGudangAsal] = useState("");
  const [gudangTujuan, setGudangTujuan] = useState("");
  const [tanggal, setTanggal] = useState(todayLocalISODate);
  const [catatan, setCatatan] = useState("");
  const [barangRows, setBarangRows] = useState<BarangSaldoGudangRow[]>([]);
  const [qtyByKode, setQtyByKode] = useState<Record<string, QtyEntry>>({});
  const [cari, setCari] = useState("");

  const barangByKode = useMemo(() => {
    const m = new Map<string, (typeof barangItems)[number]>();
    for (const b of barangItems) {
      m.set(b.kode.toLowerCase(), b);
    }
    return m;
  }, [barangItems]);

  const [gudangLoading, setGudangLoading] = useState(true);
  const [barangLoading, setBarangLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNomor, setSuccessNomor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGudangLoading(true);
      try {
        const list = await invoke<GudangRow[]>("gudang_list");
        if (!cancelled) {
          setGudangList(list);
          if (list.length >= 2) {
            setGudangAsal((prev) => prev || list[0].kode);
            setGudangTujuan((prev) => prev || list[1].kode);
          } else if (list.length === 1) {
            setGudangAsal(list[0].kode);
          }
        }
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      } finally {
        if (!cancelled) setGudangLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadBarangAsal = useCallback(async (gk: string) => {
    if (!gk.trim()) {
      setBarangRows([]);
      setQtyByKode({});
      return;
    }
    setBarangLoading(true);
    setError(null);
    try {
      const rows = await invoke<BarangSaldoGudangRow[]>("stok_barang_di_gudang", { gudangKode: gk.trim() });
      setBarangRows(rows);
      setQtyByKode({});
    } catch (e) {
      setError(tauriErrorMessage(e));
      setBarangRows([]);
    } finally {
      setBarangLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBarangAsal(gudangAsal);
  }, [gudangAsal, loadBarangAsal]);

  const barangFiltered = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return barangRows;
    return barangRows.filter(
      (b) => b.kode.toLowerCase().includes(q) || b.nama.toLowerCase().includes(q),
    );
  }, [barangRows, cari]);

  /** Jumlah satuan terkecil per 1 unit pada tier terpilih. */
  function faktorKeTerkecil(kode: string, tingkat: number): number {
    const b = barangByKode.get(kode.toLowerCase());
    if (!b) return 1;
    const f = qtyToSatuanTerkecil(b, tingkat, 1);
    return f > 0 ? f : 1;
  }

  function getEntry(kode: string): QtyEntry {
    const ada = qtyByKode[kode];
    if (ada) return ada;
    const b = barangByKode.get(kode.toLowerCase());
    const def = b ? getDefaultSatuanPilihan(b) : { tingkat: 1 };
    return { qty: 0, tingkat: def.tingkat };
  }

  const linesToSubmit = useMemo(() => {
    return barangRows
      .map((b) => {
        const entry = qtyByKode[b.kode];
        if (!entry || entry.qty <= 0) return null;
        const factor = faktorKeTerkecil(b.kode, entry.tingkat);
        const qtySmallest = Math.round(entry.qty) * factor;
        return { barangKode: b.kode, qty: qtySmallest };
      })
      .filter((x): x is { barangKode: string; qty: number } => x !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barangRows, qtyByKode, barangByKode]);

  /** Total dalam satuan terkecil — agregat lintas barang (referensi saja). */
  const totalQty = useMemo(() => linesToSubmit.reduce((s, l) => s + l.qty, 0), [linesToSubmit]);

  function setQty(kode: string, raw: string, maxSaldoSmallest: number, tingkat: number) {
    const n = raw === "" ? 0 : Math.max(0, Math.round(Number(raw)));
    const factor = faktorKeTerkecil(kode, tingkat);
    const maxInTier = factor > 0 ? Math.floor(maxSaldoSmallest / factor) : n;
    const capped = maxSaldoSmallest > 0 ? Math.min(n, maxInTier) : n;
    setQtyByKode((prev) => ({ ...prev, [kode]: { qty: capped, tingkat } }));
  }

  function setTingkat(kode: string, tingkat: number, maxSaldoSmallest: number) {
    const current = qtyByKode[kode]?.qty ?? 0;
    const factor = faktorKeTerkecil(kode, tingkat);
    const maxInTier = factor > 0 ? Math.floor(maxSaldoSmallest / factor) : current;
    const capped = maxSaldoSmallest > 0 ? Math.min(current, maxInTier) : current;
    setQtyByKode((prev) => ({ ...prev, [kode]: { qty: capped, tingkat } }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (gudangAsal === gudangTujuan) {
      setError("Gudang asal dan tujuan tidak boleh sama.");
      return;
    }
    if (linesToSubmit.length === 0) {
      setError("Isi jumlah pindah minimal pada satu barang.");
      return;
    }

    const payload: MutasiAntarGudangPayload = {
      gudangAsal: gudangAsal.trim(),
      gudangTujuan: gudangTujuan.trim(),
      tanggal: tanggal.trim(),
      catatan: catatan.trim(),
      lines: linesToSubmit,
    };

    setSubmitting(true);
    setError(null);
    setSuccessNomor(null);
    try {
      const nomor = await invoke<string>("mutasi_antar_gudang_apply", { payload });
      setSuccessNomor(nomor);
      void loadBarangAsal(gudangAsal);
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const formDisabled = submitting || gudangLoading || gudangList.length < 2;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          to="/barang-jasa"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke barang &amp; jasa
        </Link>
        <PageHeader
          title="Mutasi antar gudang"
          description="Pindahkan stok barang dari satu gudang ke gudang lain. Total stok perusahaan tidak berubah; hanya alokasi per gudang yang bergeser."
        />
      </div>

      {successNomor ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Mutasi berhasil dicatat dengan referensi <span className="font-mono font-semibold">{successNomor}</span>.
          Lihat di laporan{" "}
          <Link to="/laporan/pergerakan-stok" className="font-medium underline">
            pergerakan stok
          </Link>{" "}
          atau halaman{" "}
          <Link to="/barang-jasa/per-gudang" className="font-medium underline">
            stok per gudang
          </Link>
          .
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
        <Card className="space-y-4">
          <div className="flex gap-4 w-full">
            <div className="w-full">
              <label htmlFor="mag-asal" className="block text-sm font-medium text-zinc-700">
                Gudang asal
              </label>
              <TokoSelect
                id="mag-asal"
                value={gudangAsal}
                onChange={(e) => setGudangAsal(e.target.value)}
                disabled={formDisabled}
                required
              >
                <option value="">— Pilih gudang asal —</option>
                {gudangList.map((g) => (
                  <option key={g.kode} value={g.kode} disabled={g.kode === gudangTujuan}>
                    {g.kode} — {g.nama}
                  </option>
                ))}
              </TokoSelect>
            </div>
            <Button type="button" variant="secondary" className="h-8 grow-0 flex self-end" onClick={() => {
              const temp = gudangAsal;
              setGudangAsal(gudangTujuan);
              setGudangTujuan(temp);
            }}>
              Balik
            </Button>
            <div className="w-full">
              <label htmlFor="mag-tujuan" className="block text-sm font-medium text-zinc-700">
                Gudang tujuan
              </label>
              <TokoSelect
                id="mag-tujuan"
                value={gudangTujuan}
                onChange={(e) => setGudangTujuan(e.target.value)}
                disabled={formDisabled}
                required
              >
                <option value="">— Pilih gudang tujuan —</option>
                {gudangList.map((g) => (
                  <option key={g.kode} value={g.kode} disabled={g.kode === gudangAsal}>
                    {g.kode} — {g.nama}
                  </option>
                ))}
              </TokoSelect>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mag-tgl" className="block text-sm font-medium text-zinc-700">
                Tanggal mutasi
              </label>
              <TokoInput
                id="mag-tgl"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                disabled={formDisabled}
                required
              />
            </div>
            <div>
              <label htmlFor="mag-catatan" className="block text-sm font-medium text-zinc-700">
                Catatan mutasi
              </label>
              <TokoInput
                id="mag-catatan"
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                disabled={formDisabled}
                placeholder="opsional"
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-zinc-100 mb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Barang dipindahkan</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {gudangAsal
                  ? barangLoading
                    ? "Memuat stok di gudang asal…"
                    : barangRows.length === 0
                      ? "Tidak ada stok barang di gudang asal."
                      : `${barangRows.length} barang tersedia · ${linesToSubmit.length} baris dipilih (${formatQty(totalQty)} unit terkecil agregat)`
                  : "Pilih gudang asal terlebih dahulu."}
              </p>
            </div>
            <div className="w-full sm:max-w-xs">
              <label htmlFor="mag-cari" className="block text-xs font-medium text-zinc-700">
                Cari barang
              </label>
              <input
                id="mag-cari"
                type="search"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                className={inputClass}
                disabled={!gudangAsal || barangLoading}
                placeholder="Kode atau nama…"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3">Kode</th>
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Stok di asal</th>
                  <th className="w-36 px-3 py-3">Satuan pindah</th>
                  <th className="w-32 px-5 py-3 text-right">Qty pindah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {!gudangAsal ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Pilih gudang asal.
                    </td>
                  </tr>
                ) : barangLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      Memuat…
                    </td>
                  </tr>
                ) : barangFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">
                      {barangRows.length === 0
                        ? "Stok kosong di gudang asal."
                        : "Tidak ada barang sesuai pencarian."}
                    </td>
                  </tr>
                ) : (
                  barangFiltered.map((row) => {
                    const barang = barangByKode.get(row.kode.toLowerCase());
                    const satuanStok = barang ? getSatuanStokBarang(barang) : row.satuan || "—";
                    const barangForFormat = barang ?? {
                      satuan: row.satuan,
                      satuanTingkat: undefined,
                    };
                    const entry = getEntry(row.kode);
                    const factor = faktorKeTerkecil(row.kode, entry.tingkat);
                    const maxInTier = factor > 0 ? Math.floor(row.saldo / factor) : row.saldo;
                    const satuanNamaPilihan =
                      barang && findSatuanPilihan(barang, entry.tingkat)?.nama
                        ? findSatuanPilihan(barang, entry.tingkat)!.nama
                        : satuanStok;
                    const qtySmallest = entry.qty * factor;
                    const over = qtySmallest > row.saldo;
                    return (
                      <tr key={row.kode} className="bg-white align-top">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{row.kode}</td>
                        <td className="px-5 py-3 font-medium text-zinc-900">
                          {row.nama}
                          <span className="ml-1.5 text-xs font-normal text-zinc-400">{satuanStok}</span>
                        </td>
                        <td className="px-5 py-3 text-zinc-700">
                          <span className="block font-medium">
                            {formatQtyMultiSatuan(row.saldo, barangForFormat)}
                          </span>
                          {factor > 1 ? (
                            <span className="block text-xs font-normal text-zinc-400">
                              = {formatQty(row.saldo)} {satuanStok}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={maxInTier}
                            step={1}
                            value={entry.qty === 0 ? "" : entry.qty}
                            onChange={(e) =>
                              setQty(row.kode, e.target.value, row.saldo, entry.tingkat)
                            }
                            className={`${inputClass} !mt-0 w-24 text-right tabular-nums ${over ? "border-rose-400" : ""}`}
                            disabled={formDisabled}
                            placeholder="0"
                            aria-label={`Qty pindah ${row.kode}`}
                          />
                          {entry.qty > 0 && factor > 1 ? (
                            <p className="mt-1 text-xs text-zinc-500">
                              {entry.qty} {satuanNamaPilihan} = {formatQty(qtySmallest)} {satuanStok}
                            </p>
                          ) : null}
                          {entry.qty > 0 ? (
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              sisa setelah pindah: {formatQty(Math.max(0, row.saldo - qtySmallest))} {satuanStok}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <FakturLineSatuanSelect
                            id={`mag-satuan-${row.kode}`}
                            barang={barang}
                            tingkat={entry.tingkat}
                            onChange={(tingkat) => setTingkat(row.kode, tingkat, row.saldo)}
                            disabled={formDisabled || !barang}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={submitting} onClick={() => navigate("/barang-jasa")}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={formDisabled || barangLoading || linesToSubmit.length === 0}
          >
            {submitting ? "Menyimpan…" : "Simpan mutasi"}
          </Button>
        </div>
      </form>

      {gudangList.length < 2 && !gudangLoading ? (
        <p className="text-sm text-amber-800">
          Minimal dua gudang diperlukan.{" "}
          <Link to="/manajemen/gudang/tambah" className="font-medium text-brand-600 hover:text-brand-700">
            Tambah gudang
          </Link>
        </p>
      ) : null}
    </div>
  );
}
