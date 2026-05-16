import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  METODE_PEMBAYARAN_PEMBELIAN,
  pembelianFakturTotal,
  pembelianHitungPajakPpn,
  pembelianLineSubtotal,
  type PembelianDetail,
} from "@/data/pembelian";
import { loadPengaturanTransaksi } from "@/features/pengaturan/pengaturanTransaksiStorage";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { useGudang } from "@/features/gudang/GudangContext";
import { usePemasok } from "@/features/pemasok/PemasokContext";
import { tauriErrorMessage } from "@/lib/tauriError";

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

type LineDraft = {
  id: string;
  barangKode: string;
  qty: number;
  hargaSatuan: number;
  diskon: number;
};

function newLine(): LineDraft {
  return { id: crypto.randomUUID(), barangKode: "", qty: 1, hargaSatuan: 0, diskon: 0 };
}

export type PembelianFakturFormProps = {
  mode: "create" | "edit";
  /** Wajib jika `mode === 'edit'` */
  nomor?: string;
  cancelHref: string;
  onSuccess: () => void;
};

export function PembelianFakturForm({ mode, nomor, cancelHref, onSuccess }: PembelianFakturFormProps) {
  const navigate = useNavigate();
  const { items: pemasokItems, loading: loadPemasok } = usePemasok();
  const { items: gudangItems, loading: loadGudang } = useGudang();
  const { items: barangItems, loading: loadBarang, refresh: refreshBarang } = useBarangJasa();

  const [pemasokKode, setPemasokKode] = useState("");
  const [gudangKode, setGudangKode] = useState("");
  const [tanggalFaktur, setTanggalFaktur] = useState(todayLocalISODate);
  const [jatuhTempo, setJatuhTempo] = useState(todayLocalISODate);
  const [metodePembayaran, setMetodePembayaran] = useState<string>("TUNAI");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [diskonFaktur, setDiskonFaktur] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ppnPersen = loadPengaturanTransaksi().ppnPersen;
  const [hydrating, setHydrating] = useState(mode === "edit");

  const pf = mode === "edit" ? "fbe" : "fb";
  const masterLoading = loadPemasok || loadGudang || loadBarang;

  const barangByKode = useMemo(() => {
    const m = new Map<string, (typeof barangItems)[number]>();
    for (const b of barangItems) {
      m.set(b.kode.toLowerCase(), b);
    }
    return m;
  }, [barangItems]);

  useEffect(() => {
    if (mode !== "edit" || !nomor?.trim()) {
      setHydrating(false);
      return;
    }
    if (masterLoading) return;

    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const d = await invoke<PembelianDetail>("pembelian_detail", { nomor: nomor.trim() });
        if (cancelled) return;
        setPemasokKode(d.pemasokKode);
        setGudangKode(d.gudangKode);
        setTanggalFaktur(d.tanggalFaktur);
        setJatuhTempo(d.jatuhTempo);
        setMetodePembayaran(d.metodePembayaran || "LAINNYA");
        setDiskonFaktur(d.diskonFaktur ?? 0);
        setLines(
          d.lines.length > 0
            ? d.lines.map((l) => ({
                id: crypto.randomUUID(),
                barangKode: l.barangKode,
                qty: l.qty,
                hargaSatuan: l.hargaSatuan,
                diskon: l.diskon ?? 0,
              }))
            : [newLine()],
        );
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, nomor, masterLoading]);

  function setLine(id: string, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.barangKode !== undefined) {
          const raw = patch.barangKode.trim();
          if (!raw) {
            next.barangKode = "";
            next.hargaSatuan = 0;
            next.diskon = 0;
          } else {
            const b = barangByKode.get(raw.toLowerCase());
            if (b) {
              next.barangKode = b.kode;
              next.hargaSatuan = b.harga;
              if (next.qty < 1) next.qty = 1;
            }
          }
        }
        const harga = Math.max(0, next.hargaSatuan);
        next.diskon = Math.min(Math.max(0, Math.round(next.diskon)), harga);
        return next;
      }),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  const subtotalBarang = useMemo(
    () =>
      lines.reduce(
        (sum, r) => sum + pembelianLineSubtotal(r.qty, r.hargaSatuan, r.diskon),
        0,
      ),
    [lines],
  );

  const pajak = useMemo(
    () => pembelianHitungPajakPpn(subtotalBarang, diskonFaktur, ppnPersen),
    [subtotalBarang, diskonFaktur, ppnPersen],
  );

  const grandTotal = useMemo(
    () => pembelianFakturTotal(subtotalBarang, diskonFaktur, pajak),
    [subtotalBarang, diskonFaktur, pajak],
  );

  useEffect(() => {
    setDiskonFaktur((d) => Math.min(d, subtotalBarang));
  }, [subtotalBarang]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pemasokKode.trim()) {
      setError("Pilih pemasok.");
      return;
    }
    if (!gudangKode.trim()) {
      setError("Pilih gudang tujuan.");
      return;
    }
    if (!tanggalFaktur.trim() || !jatuhTempo.trim()) {
      setError("Tanggal faktur dan jatuh tempo wajib diisi.");
      return;
    }
    if (jatuhTempo < tanggalFaktur) {
      setError("Jatuh tempo tidak boleh sebelum tanggal faktur.");
      return;
    }

    const payloadLines = lines
      .filter((r) => r.barangKode.trim())
      .map((r) => ({
        barangKode: r.barangKode.trim(),
        qty: Math.floor(r.qty),
        hargaSatuan: Math.round(r.hargaSatuan),
        diskon: Math.round(r.diskon),
      }));

    if (payloadLines.length === 0) {
      setError("Tambahkan minimal satu baris dengan barang terpilih.");
      return;
    }
    for (const ln of payloadLines) {
      if (ln.qty <= 0) {
        setError("Jumlah tiap baris harus lebih dari 0.");
        return;
      }
      if (ln.hargaSatuan < 0) {
        setError("Harga satuan tidak valid.");
        return;
      }
      if (ln.diskon < 0) {
        setError("Diskon tidak valid.");
        return;
      }
      if (ln.diskon > ln.hargaSatuan) {
        setError("Diskon per satuan tidak boleh melebihi harga satuan.");
        return;
      }
    }

    const diskonFakturVal = Math.round(diskonFaktur);
    const pajakVal = pembelianHitungPajakPpn(subtotalBarang, diskonFakturVal, ppnPersen);
    if (diskonFakturVal < 0) {
      setError("Diskon faktur tidak valid.");
      return;
    }
    if (diskonFakturVal > subtotalBarang) {
      setError("Diskon faktur tidak boleh melebihi subtotal barang.");
      return;
    }

    const payload = {
      pemasokKode: pemasokKode.trim(),
      gudangKode: gudangKode.trim(),
      tanggalFaktur: tanggalFaktur.trim(),
      jatuhTempo: jatuhTempo.trim(),
      metodePembayaran: metodePembayaran.trim() || "LAINNYA",
      diskonFaktur: diskonFakturVal,
      pajak: pajakVal,
      lines: payloadLines,
    };

    try {
      if (mode === "edit") {
        if (!nomor?.trim()) {
          setError("Nomor faktur tidak valid.");
          return;
        }
        await invoke("pembelian_update", { nomor: nomor.trim(), payload });
      } else {
        await invoke("pembelian_insert", { payload });
      }
      await refreshBarang();
      onSuccess();
    } catch (err) {
      setError(tauriErrorMessage(err));
    }
  }

  const title = mode === "edit" ? "Ubah faktur pembelian" : "Faktur beli baru";
  const description =
    mode === "edit"
      ? "Perbarui header dan baris: stok dan kartu stok akan disesuaikan ulang dari selisih faktur lama vs baru."
      : "Catat pembelian dari pemasok: pilih gudang, tanggal, item, dan pembayaran lalu simpan ke database lokal.";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          to={cancelHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {mode === "edit" ? "Kembali ke detail" : "Kembali ke pembelian"}
        </Link>
        <PageHeader title={title} description={description} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        {mode === "edit" && nomor ? (
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Nomor faktur</p>
            <p className="mt-1 font-mono text-sm font-semibold text-brand-800">{nomor}</p>
          </Card>
        ) : null}

        <Card>
          <h2 className="text-sm font-semibold text-zinc-900">Header faktur</h2>
          <p className="mt-1 text-sm text-zinc-500">Data utama transaksi pembelian.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={`${pf}-pemasok`} className="block text-sm font-medium text-zinc-700">
                Pemasok
              </label>
              <select
                id={`${pf}-pemasok`}
                value={pemasokKode}
                onChange={(e) => setPemasokKode(e.target.value)}
                className={inputClass}
                disabled={masterLoading || hydrating}
                required
              >
                <option value="">— Pilih pemasok —</option>
                {pemasokItems.map((p) => (
                  <option key={p.kode} value={p.kode}>
                    {p.kode} — {p.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${pf}-gudang`} className="block text-sm font-medium text-zinc-700">
                Gudang tujuan
              </label>
              <select
                id={`${pf}-gudang`}
                value={gudangKode}
                onChange={(e) => setGudangKode(e.target.value)}
                className={inputClass}
                disabled={masterLoading || hydrating}
                required
              >
                <option value="">— Pilih gudang —</option>
                {gudangItems.map((g) => (
                  <option key={g.kode} value={g.kode}>
                    {g.kode} — {g.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${pf}-metode`} className="block text-sm font-medium text-zinc-700">
                Pembayaran
              </label>
              <select
                id={`${pf}-metode`}
                value={metodePembayaran}
                onChange={(e) => setMetodePembayaran(e.target.value)}
                className={inputClass}
                disabled={hydrating}
              >
                {METODE_PEMBAYARAN_PEMBELIAN.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
                {metodePembayaran && !METODE_PEMBAYARAN_PEMBELIAN.some((m) => m.value === metodePembayaran) ? (
                  <option value={metodePembayaran}>{metodePembayaran}</option>
                ) : null}
              </select>
            </div>
            <div>
              <label htmlFor={`${pf}-tgl`} className="block text-sm font-medium text-zinc-700">
                Tanggal faktur
              </label>
              <input
                id={`${pf}-tgl`}
                type="date"
                value={tanggalFaktur}
                onChange={(e) => setTanggalFaktur(e.target.value)}
                className={inputClass}
                disabled={hydrating}
                required
              />
            </div>
            <div>
              <label htmlFor={`${pf}-jt`} className="block text-sm font-medium text-zinc-700">
                Jatuh tempo
              </label>
              <input
                id={`${pf}-jt`}
                type="date"
                value={jatuhTempo}
                onChange={(e) => setJatuhTempo(e.target.value)}
                className={inputClass}
                disabled={hydrating}
                required
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Barang / jasa</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Pilih item dari master; harga default dari katalog (dapat diubah per faktur).
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 gap-2"
              onClick={addLine}
              disabled={hydrating}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Tambah baris
            </Button>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2.5">Barang</th>
                  <th className="w-24 px-3 py-2.5">Qty</th>
                  <th className="w-36 px-3 py-2.5">Harga satuan</th>
                  <th className="w-32 px-3 py-2.5">Diskon/satuan</th>
                  <th className="w-36 px-3 py-2.5 text-right">Subtotal</th>
                  <th className="w-14 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lines.map((row) => {
                  const sub = pembelianLineSubtotal(row.qty, row.hargaSatuan, row.diskon);
                  const maxDiskon = Math.max(0, row.hargaSatuan);
                  return (
                    <tr key={row.id} className="bg-white">
                      <td className="px-3 py-2 align-top">
                        <select
                          value={row.barangKode}
                          onChange={(e) => setLine(row.id, { barangKode: e.target.value })}
                          className={`${inputClass} mt-0`}
                          disabled={masterLoading || hydrating}
                        >
                          <option value="">— Pilih barang —</option>
                          {barangItems.map((b) => (
                            <option key={b.kode} value={b.kode}>
                              {b.kode} — {b.nama} ({b.tipe})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={row.qty}
                          onChange={(e) =>
                            setLine(row.id, { qty: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })
                          }
                          className={`${inputClass} mt-0`}
                          disabled={hydrating}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={row.hargaSatuan}
                          onChange={(e) =>
                            setLine(row.id, {
                              hargaSatuan: Math.max(0, Math.round(Number(e.target.value) || 0)),
                            })
                          }
                          className={`${inputClass} mt-0`}
                          disabled={hydrating}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          min={0}
                          max={maxDiskon}
                          step={1}
                          value={row.diskon}
                          onChange={(e) => {
                            const raw = Math.max(0, Math.round(Number(e.target.value) || 0));
                            setLine(row.id, { diskon: Math.min(raw, maxDiskon) });
                          }}
                          className={`${inputClass} mt-0`}
                          disabled={hydrating}
                          title="Diskon nominal per satuan (Rp)"
                        />
                      </td>
                      <td className="px-3 py-2 align-top text-right font-medium text-zinc-900">
                        <span className="inline-block pt-2.5">{formatRupiah(sub)}</span>
                      </td>
                      <td className="px-2 py-2 align-top text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(row.id)}
                          className="mt-1.5 inline-flex rounded-lg p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Hapus baris"
                          disabled={hydrating}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 ml-auto w-full max-w-sm space-y-3 border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-500">Subtotal barang</span>
              <span className="font-medium text-zinc-900">{formatRupiah(subtotalBarang)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <label htmlFor={`${pf}-diskon-faktur`} className="shrink-0 text-zinc-500">
                Diskon faktur
              </label>
              <input
                id={`${pf}-diskon-faktur`}
                type="number"
                min={0}
                max={subtotalBarang}
                step={1}
                value={diskonFaktur}
                onChange={(e) => {
                  const raw = Math.max(0, Math.round(Number(e.target.value) || 0));
                  setDiskonFaktur(Math.min(raw, subtotalBarang));
                }}
                className={`${inputClass} mt-0 w-36 text-right`}
                disabled={hydrating}
              />
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="shrink-0 text-zinc-500">Pajak (PPN {ppnPersen}%)</span>
              <span className="font-medium text-zinc-900">{formatRupiah(pajak)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total faktur</span>
              <span className="text-lg font-bold text-zinc-900">{formatRupiah(grandTotal)}</span>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(cancelHref)}>
            Batal
          </Button>
          <Button type="submit" disabled={masterLoading || hydrating}>
            {mode === "edit" ? "Simpan perubahan" : "Simpan faktur"}
          </Button>
        </div>
      </form>
    </div>
  );
}
