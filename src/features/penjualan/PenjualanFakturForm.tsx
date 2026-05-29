import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  penjualanFakturTotal,
  penjualanHitungPajakPpn,
  penjualanLineSubtotal,
  type PenjualanDetail,
} from "@/data/penjualan";
import { loadPengaturanTransaksi } from "@/features/pengaturan/pengaturanTransaksiStorage";
import type { AkunKeuanganRow } from "@/data/keuangan";
import { FakturLineSatuanSelect } from "@/features/barang-jasa/FakturLineSatuanSelect";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import {
  findSatuanPilihan,
  getDefaultSatuanPilihan,
  getSatuanStokBarang,
  qtyToSatuanTerkecil,
} from "@/data/barangJasa";
import { useGudang } from "@/features/gudang/GudangContext";
import { usePelanggan } from "@/features/pelanggan/PelangganContext";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";

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

type LineDraft = {
  id: string;
  barangKode: string;
  qty: number;
  satuanTingkat: number;
  hargaSatuan: number;
  diskon: number;
  catatan: string;
};

function newLine(): LineDraft {
  return {
    id: crypto.randomUUID(),
    barangKode: "",
    qty: 1,
    satuanTingkat: 1,
    hargaSatuan: 0,
    diskon: 0,
    catatan: "",
  };
}

export type PenjualanFakturFormProps = {
  mode: "create" | "edit";
  /** Wajib jika `mode === 'edit'` */
  nomor?: string;
  cancelHref: string;
  onSuccess: (nomor: string) => void;
};

export function PenjualanFakturForm({ mode, nomor, cancelHref, onSuccess }: PenjualanFakturFormProps) {
  const navigate = useNavigate();
  const { items: pelangganItems, loading: loadPelanggan } = usePelanggan();
  const { items: gudangItems, loading: loadGudang } = useGudang();
  const { items: barangItems, loading: loadBarang, refresh: refreshBarang } = useBarangJasa();

  const [pelangganKode, setPelangganKode] = useState("");
  const [gudangKode, setGudangKode] = useState("");
  const [salesman, setSalesman] = useState("");
  const [tanggalFaktur, setTanggalFaktur] = useState(todayLocalISODate);
  const [jatuhTempo, setJatuhTempo] = useState(todayLocalISODate);
  const [catatanFaktur, setCatatanFaktur] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [diskonFaktur, setDiskonFaktur] = useState(0);
  const [akunKasKode, setAkunKasKode] = useState("");
  const [akunKasList, setAkunKasList] = useState<AkunKeuanganRow[]>([]);
  const [akunKasLoading, setAkunKasLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ppnPersen = loadPengaturanTransaksi().ppnPersen;
  const [hydrating, setHydrating] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  const masterLoading = loadPelanggan || loadGudang || loadBarang;
  const busy = masterLoading || hydrating || saving;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAkunKasLoading(true);
      try {
        const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
        if (!cancelled) setAkunKasList(list.filter((a) => a.isAkunKas));
      } catch {
        if (!cancelled) setAkunKasList([]);
      } finally {
        if (!cancelled) setAkunKasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        const d = await invoke<PenjualanDetail>("penjualan_detail", { nomor: nomor.trim() });
        if (cancelled) return;
        setPelangganKode(d.pelangganKode);
        setGudangKode(d.gudangKode);
        setSalesman(d.salesman);
        setTanggalFaktur(d.tanggalFaktur);
        setJatuhTempo(d.jatuhTempo);
        setCatatanFaktur(d.catatanFaktur ?? "");
        setDiskonFaktur(d.diskonFaktur ?? 0);
        setAkunKasKode(d.akunKasKode ?? "");
        setLines(
          d.lines.length > 0
            ? d.lines.map((l) => ({
                id: crypto.randomUUID(),
                barangKode: l.barangKode,
                qty: l.qty,
                satuanTingkat: l.satuanTingkat ?? 1,
                hargaSatuan: l.hargaSatuan,
                diskon: l.diskon ?? 0,
                catatan: l.catatan ?? "",
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
            next.satuanTingkat = 1;
            next.hargaSatuan = 0;
          } else {
            const b = barangByKode.get(raw.toLowerCase());
            if (b) {
              const def = getDefaultSatuanPilihan(b);
              next.barangKode = b.kode;
              next.satuanTingkat = def.tingkat;
              next.hargaSatuan = def.hargaJual;
              if (next.qty < 1) next.qty = 1;
            }
          }
        }
        if (patch.satuanTingkat !== undefined && patch.hargaSatuan !== undefined) {
          next.satuanTingkat = patch.satuanTingkat;
          next.hargaSatuan = patch.hargaSatuan;
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
        (sum, r) => sum + penjualanLineSubtotal(r.qty, r.hargaSatuan, r.diskon),
        0,
      ),
    [lines],
  );

  const pajak = useMemo(
    () => penjualanHitungPajakPpn(subtotalBarang, diskonFaktur, ppnPersen),
    [subtotalBarang, diskonFaktur, ppnPersen],
  );

  const grandTotal = useMemo(
    () => penjualanFakturTotal(subtotalBarang, diskonFaktur, pajak),
    [subtotalBarang, diskonFaktur, pajak],
  );

  useEffect(() => {
    setDiskonFaktur((d) => Math.min(d, subtotalBarang));
  }, [subtotalBarang]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pelangganKode.trim()) {
      setError("Pilih pelanggan.");
      return;
    }
    if (!gudangKode.trim()) {
      setError("Pilih gudang asal.");
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
        satuanTingkat: r.satuanTingkat,
        hargaSatuan: Math.round(r.hargaSatuan),
        diskon: Math.round(r.diskon),
        catatan: r.catatan.trim(),
      }));

    if (payloadLines.length === 0) {
      setError("Tambahkan minimal satu baris dengan item terpilih.");
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
      if (mode === "create") {
        const b = barangByKode.get(ln.barangKode.toLowerCase());
        if (b?.tipe === "Barang") {
          const qtyStok = qtyToSatuanTerkecil(b, ln.satuanTingkat, ln.qty);
          const satuanStok = getSatuanStokBarang(b);
          const satuanPilih = findSatuanPilihan(b, ln.satuanTingkat)?.nama ?? satuanStok;
          if ((b.stok ?? 0) < qtyStok) {
            setError(
              `Stok ${b.kode} tidak cukup (tersedia ${b.stok ?? 0} ${satuanStok}, diminta ${ln.qty} ${satuanPilih} = ${qtyStok} ${satuanStok}).`,
            );
            return;
          }
        }
      }
    }

    const diskonFakturVal = Math.round(diskonFaktur);
    const pajakVal = penjualanHitungPajakPpn(subtotalBarang, diskonFakturVal, ppnPersen);
    if (diskonFakturVal < 0) {
      setError("Diskon faktur tidak valid.");
      return;
    }
    if (diskonFakturVal > subtotalBarang) {
      setError("Diskon faktur tidak boleh melebihi subtotal barang.");
      return;
    }

    const payload = {
      pelangganKode: pelangganKode.trim(),
      gudangKode: gudangKode.trim(),
      salesman: salesman.trim(),
      tanggalFaktur: tanggalFaktur.trim(),
      jatuhTempo: jatuhTempo.trim(),
      catatanFaktur: catatanFaktur.trim(),
      diskonFaktur: diskonFakturVal,
      pajak: pajakVal,
      akunKasKode: akunKasKode.trim() || null,
      lines: payloadLines,
    };

    setSaving(true);
    try {
      let savedNomor: string;
      if (mode === "edit") {
        if (!nomor?.trim()) {
          setError("Nomor faktur tidak valid.");
          return;
        }
        savedNomor = nomor.trim();
        await invoke("penjualan_update", { nomor: savedNomor, payload });
      } else {
        savedNomor = await invoke<string>("penjualan_insert", { payload });
      }
      await refreshBarang();
      onSuccess(savedNomor);
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          to={cancelHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {mode === "edit" ? "Kembali ke detail" : "Kembali ke penjualan"}
        </Link>
        <PageHeader
          title={mode === "edit" ? "Ubah faktur penjualan" : "Faktur jual baru"}
          description={
            mode === "edit"
              ? "Perbarui header dan baris: stok dan pergerakan stok disesuaikan ulang dari selisih faktur lama vs baru."
              : "Catat penjualan ke pelanggan. Barang fisik mengurangi stok dan tercatat di pergerakan stok."
          }
        />
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
          <p className="mt-1 text-sm text-zinc-500">Pelanggan, gudang, tanggal, dan salesman.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="fj-pelanggan" className="block text-sm font-medium text-zinc-700">
                Pelanggan
              </label>
              <TokoSelect
                id="fj-pelanggan"
                value={pelangganKode}
                onChange={(e) => setPelangganKode(e.target.value)}
                disabled={busy}
                required
              >
                <option value="">— Pilih pelanggan —</option>
                {pelangganItems.map((p) => (
                  <option key={p.kode} value={p.kode}>
                    {p.kode} — {p.nama}
                  </option>
                ))}
              </TokoSelect>
            </div>
            <div>
              <label htmlFor="fj-gudang" className="block text-sm font-medium text-zinc-700">
                Dari gudang
              </label>
              <TokoSelect
                id="fj-gudang"
                value={gudangKode}
                onChange={(e) => setGudangKode(e.target.value)}
                disabled={busy}
                required
              >
                <option value="">— Pilih gudang —</option>
                {gudangItems.map((g) => (
                  <option key={g.kode} value={g.kode}>
                    {g.kode} — {g.nama}
                  </option>
                ))}
              </TokoSelect>
            </div>
            <div>
              <label htmlFor="fj-salesman" className="block text-sm font-medium text-zinc-700">
                Salesman
              </label>
              <TokoInput
                id="fj-salesman"
                type="text"
                value={salesman}
                onChange={(e) => setSalesman(e.target.value)}
                disabled={busy}
                placeholder="Nama salesman (opsional)"
              />
            </div>
            <div>
              <label htmlFor="fj-tgl" className="block text-sm font-medium text-zinc-700">
                Tanggal faktur
              </label>
              <TokoInput
                id="fj-tgl"
                type="date"
                value={tanggalFaktur}
                onChange={(e) => setTanggalFaktur(e.target.value)}
                disabled={busy}
                required
              />
            </div>
            <div>
              <label htmlFor="fj-jt" className="block text-sm font-medium text-zinc-700">
                Jatuh tempo
              </label>
              <TokoInput
                id="fj-jt"
                type="date"
                value={jatuhTempo}
                onChange={(e) => setJatuhTempo(e.target.value)}
                disabled={busy}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fj-catatan" className="block text-sm font-medium text-zinc-700">
                Catatan faktur
              </label>
              <textarea
                id="fj-catatan"
                value={catatanFaktur}
                onChange={(e) => setCatatanFaktur(e.target.value)}
                className="mt-1 w-full min-h-[88px] resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50"
                disabled={busy}
                placeholder="Catatan umum untuk faktur ini (opsional)"
                rows={3}
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Item dijual</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Pilih barang/jasa, satuan, dan qty. Stok dikurangi dalam satuan terkecil sesuai konversi di master
                barang.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 gap-2"
              onClick={addLine}
              disabled={busy}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Tambah baris
            </Button>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2.5">Barang / jasa</th>
                  <th className="w-24 px-3 py-2.5">Qty</th>
                  <th className="w-28 px-3 py-2.5">Satuan</th>
                  <th className="w-32 px-3 py-2.5">Harga satuan</th>
                  <th className="w-28 px-3 py-2.5">Diskon/sat</th>
                  <th className="min-w-[160px] px-3 py-2.5">Catatan baris</th>
                  <th className="w-36 px-3 py-2.5 text-right">Subtotal</th>
                  <th className="w-14 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lines.map((row) => {
                  const sub = penjualanLineSubtotal(row.qty, row.hargaSatuan, row.diskon);
                  const maxDiskon = Math.max(0, row.hargaSatuan);
                  const b = row.barangKode ? barangByKode.get(row.barangKode.toLowerCase()) : undefined;
                  return (
                    <tr key={row.id} className="bg-white">
                      <td className="px-3 py-2 align-top">
                        <TokoSelect
                          id={`fj-barang-${row.id}`}
                          value={row.barangKode}
                          onChange={(e) => setLine(row.id, { barangKode: e.target.value })}
                          disabled={busy}
                        >
                          <option value="">— Pilih item —</option>
                          {barangItems.map((item) => (
                            <option key={item.kode} value={item.kode}>
                              {item.kode} — {item.nama} ({item.tipe}
                              {item.tipe === "Barang" ? `, stok ${item.stok ?? 0}` : ""})
                            </option>
                          ))}
                        </TokoSelect>
                        {b?.tipe === "Barang" ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            Stok: {b.stok ?? 0} {getSatuanStokBarang(b)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <TokoInput
                          id={`fj-qty-${row.id}`}
                          inputMode="numeric"
                          value={row.qty}
                          onChange={(e) =>
                            setLine(row.id, { qty: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })
                          }
                          placeholder="1"
                          disabled={busy}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <FakturLineSatuanSelect
                          id={`fj-satuan-${row.id}`}
                          barang={b}
                          tingkat={row.satuanTingkat}
                          onChange={(tingkat, hargaJual) =>
                            setLine(row.id, { satuanTingkat: tingkat, hargaSatuan: hargaJual })
                          }
                          disabled={busy || !b}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <TokoInput
                          id={`fj-harga-${row.id}`}
                          inputMode="numeric"
                          value={row.hargaSatuan}
                          onChange={(e) =>
                            setLine(row.id, {
                              hargaSatuan: Math.max(0, Math.round(Number(e.target.value) || 0)),
                            })
                          }
                          placeholder="0"
                          disabled={busy}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <TokoInput
                          id={`fj-diskon-${row.id}`}
                          inputMode="numeric"
                          value={row.diskon}
                          onChange={(e) => {
                            const raw = Math.max(0, Math.round(Number(e.target.value) || 0));
                            setLine(row.id, { diskon: Math.min(raw, maxDiskon) });
                          }}
                          placeholder="0"
                          disabled={busy}
                          title="Diskon nominal per satuan (Rp)"
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <TokoInput
                          id={`fj-catatan-line-${row.id}`}
                          type="text"
                          value={row.catatan}
                          onChange={(e) => setLine(row.id, { catatan: e.target.value })}
                          disabled={busy}
                          placeholder="Catatan per baris"
                        />
                      </td>
                      <td className="px-3 py-2 align-top text-right font-medium text-zinc-900">
                        <span className="inline-block pt-2.5">{formatRupiah(sub)}</span>
                      </td>
                      <td className="px-2 py-2 align-top text-center">
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => removeLine(row.id)}
                          aria-label="Hapus baris"
                          disabled={busy}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
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
              <label htmlFor="fj-diskon-faktur" className="shrink-0 text-zinc-500">
                Diskon faktur
              </label>
              <TokoInput
                id="fj-diskon-faktur"
                inputMode="numeric"
                value={diskonFaktur}
                onChange={(e) => {
                  const raw = Math.max(0, Math.round(Number(e.target.value) || 0));
                  setDiskonFaktur(Math.min(raw, subtotalBarang));
                }}
                className="w-36 text-right"
                fullWidth={false}
                disabled={busy}
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

        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Penerimaan pembayaran</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Kosongkan untuk piutang (jurnal: debet piutang, kredit inventori). Pilih akun kas jika diterima tunai
            (debet kas, kredit inventori). Akun inventori mengikuti konfigurasi Pembelian/inventori di jurnal.
          </p>
          <div className="mt-4 max-w-md">
            <label htmlFor="fj-akun-kas" className="block text-sm font-medium text-zinc-700">
              Diterima melalui
            </label>
            <TokoSelect
              id="fj-akun-kas"
              value={akunKasKode}
              onChange={(e) => setAkunKasKode(e.target.value)}
              disabled={busy || akunKasLoading}
            >
              <option value="">— Piutang (belum diterima) —</option>
              {akunKasList.map((a) => (
                <option key={a.kode} value={a.kode}>
                  {a.kode} — {a.nama}
                </option>
              ))}
            </TokoSelect>
            {akunKasLoading ? (
              <p className="mt-1.5 text-xs text-zinc-400">Memuat daftar akun kas…</p>
            ) : akunKasList.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-700">
                Belum ada akun kas. Tandai akun sebagai kas di Daftar akun keuangan.
              </p>
            ) : null}
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(cancelHref)} disabled={busy}>
            Batal
          </Button>
          <Button type="submit" disabled={busy}>
            {saving ? "Menyimpan…" : mode === "edit" ? "Simpan perubahan" : "Simpan faktur"}
          </Button>
        </div>
      </form>
    </div>
  );
}