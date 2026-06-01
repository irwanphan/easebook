import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";
import { FakturLineSatuanSelect } from "@/features/barang-jasa/FakturLineSatuanSelect";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { useGudang } from "@/features/gudang/GudangContext";
import { usePemasok } from "@/features/pemasok/PemasokContext";
import { getDefaultSatuanPilihan, getSatuanStokBarang } from "@/data/barangJasa";
import {
  pembelianFakturTotal,
  pembelianHitungPajakPpn,
  pembelianLineSubtotal,
} from "@/data/pembelian";
import { getPpnEfektif } from "@/features/pengaturan/pengaturanTransaksiStorage";
import type {
  PesananPembelianDetail,
  PesananPembelianInsertPayload,
} from "@/data/pesananPembelian";
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

export type PesananPembelianFormProps = {
  mode: "create" | "edit";
  /** Wajib jika `mode === 'edit'`. */
  nomor?: string;
  cancelHref: string;
  onSuccess: (nomor: string) => void;
};

export function PesananPembelianForm({
  mode,
  nomor,
  cancelHref,
  onSuccess,
}: PesananPembelianFormProps) {
  const navigate = useNavigate();
  const { items: pemasokItems, loading: loadPemasok } = usePemasok();
  const { items: gudangItems, loading: loadGudang } = useGudang();
  const { items: barangItems, loading: loadBarang } = useBarangJasa();

  const [pemasokKode, setPemasokKode] = useState("");
  const [gudangKode, setGudangKode] = useState("");
  const [tanggalPesanan, setTanggalPesanan] = useState(todayLocalISODate);
  const [tanggalKirim, setTanggalKirim] = useState("");
  const [catatan, setCatatan] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [diskonFaktur, setDiskonFaktur] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const { terkenaPajak, ppnPersen } = getPpnEfektif();
  /**
   * Nilai pajak asli dari pesanan tersimpan (mode edit). Lihat catatan
   * di `PembelianFakturForm` untuk alasan preserve historical PPN.
   */
  const [pajakTersimpan, setPajakTersimpan] = useState(0);

  const masterLoading = loadPemasok || loadGudang || loadBarang;
  const busy = masterLoading || hydrating || saving;

  const barangByKode = useMemo(() => {
    const m = new Map<string, (typeof barangItems)[number]>();
    for (const b of barangItems) m.set(b.kode.toLowerCase(), b);
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
        const d = await invoke<PesananPembelianDetail>(
          "pesanan_pembelian_detail",
          { nomor: nomor.trim() },
        );
        if (cancelled) return;
        if (d.status !== "Draft") {
          setError(
            `Pesanan berstatus ${d.status} dan tidak dapat diubah lagi.`,
          );
        }
        setPemasokKode(d.pemasokKode);
        setGudangKode(d.gudangKode);
        setTanggalPesanan(d.tanggalPesanan);
        setTanggalKirim(d.tanggalKirim ?? "");
        setCatatan(d.catatan ?? "");
        setDiskonFaktur(d.diskonFaktur ?? 0);
        setPajakTersimpan(d.pajak ?? 0);
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
        if (
          patch.satuanTingkat !== undefined &&
          patch.hargaSatuan !== undefined
        ) {
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
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.id !== id),
    );
  }

  const subtotalBarang = useMemo(
    () =>
      lines.reduce(
        (sum, r) => sum + pembelianLineSubtotal(r.qty, r.hargaSatuan, r.diskon),
        0,
      ),
    [lines],
  );

  const pajak = useMemo(() => {
    if (terkenaPajak) {
      return pembelianHitungPajakPpn(subtotalBarang, diskonFaktur, ppnPersen);
    }
    return mode === "edit" ? pajakTersimpan : 0;
  }, [terkenaPajak, mode, pajakTersimpan, subtotalBarang, diskonFaktur, ppnPersen]);

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
    if (!tanggalPesanan.trim()) {
      setError("Tanggal pesanan wajib diisi.");
      return;
    }
    if (tanggalKirim.trim() && tanggalKirim < tanggalPesanan) {
      setError("Target tanggal terima tidak boleh sebelum tanggal pesanan.");
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
      if (ln.diskon < 0 || ln.diskon > ln.hargaSatuan) {
        setError("Diskon per satuan tidak valid.");
        return;
      }
    }

    const diskonFakturVal = Math.round(diskonFaktur);
    if (diskonFakturVal > subtotalBarang) {
      setError("Diskon faktur tidak boleh melebihi subtotal barang.");
      return;
    }
    // Pakai nilai `pajak` yang sudah memo'd — sudah handle skenario PPN
    // off + mode edit (preserve nilai asli pesanan).
    const pajakVal = pajak;

    const payload: PesananPembelianInsertPayload = {
      pemasokKode: pemasokKode.trim(),
      gudangKode: gudangKode.trim(),
      tanggalPesanan: tanggalPesanan.trim(),
      tanggalKirim: tanggalKirim.trim() ? tanggalKirim.trim() : null,
      catatan: catatan.trim(),
      diskonFaktur: diskonFakturVal,
      pajak: pajakVal,
      lines: payloadLines,
    };

    setSaving(true);
    try {
      let savedNomor: string;
      if (mode === "edit") {
        if (!nomor?.trim()) {
          setError("Nomor pesanan tidak valid.");
          return;
        }
        savedNomor = nomor.trim();
        await invoke("pesanan_pembelian_update", {
          nomor: savedNomor,
          payload,
        });
      } else {
        savedNomor = await invoke<string>("pesanan_pembelian_insert", {
          payload,
        });
      }
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
          {mode === "edit" ? "Kembali ke detail" : "Kembali ke daftar pesanan"}
        </Link>
        <PageHeader
          title={mode === "edit" ? "Ubah pesanan pembelian" : "Pesanan pembelian baru"}
          description="Pesanan pembelian adalah komitmen beli ke pemasok. Stok TIDAK bertambah di tahap ini — penambahan stok terjadi saat pesanan dikonversi menjadi faktur pembelian (barang diterima)."
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
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Nomor pesanan
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-brand-800">
              {nomor}
            </p>
          </Card>
        ) : null}

        <Card>
          <h2 className="text-sm font-semibold text-zinc-900">Header pesanan</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pemasok, gudang tujuan, tanggal pesanan & target terima.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="po-pemasok"
                className="block text-sm font-medium text-zinc-700"
              >
                Pemasok
              </label>
              <TokoSelect
                id="po-pemasok"
                value={pemasokKode}
                onChange={(e) => setPemasokKode(e.target.value)}
                disabled={busy}
                required
              >
                <option value="">— Pilih pemasok —</option>
                {pemasokItems.map((p) => (
                  <option key={p.kode} value={p.kode}>
                    {p.kode} — {p.nama}
                  </option>
                ))}
              </TokoSelect>
            </div>
            <div>
              <label
                htmlFor="po-gudang"
                className="block text-sm font-medium text-zinc-700"
              >
                Gudang tujuan
              </label>
              <TokoSelect
                id="po-gudang"
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
              <label
                htmlFor="po-tgl"
                className="block text-sm font-medium text-zinc-700"
              >
                Tanggal pesanan
              </label>
              <TokoInput
                id="po-tgl"
                type="date"
                value={tanggalPesanan}
                onChange={(e) => setTanggalPesanan(e.target.value)}
                disabled={busy}
                required
              />
            </div>
            <div>
              <label
                htmlFor="po-kirim"
                className="block text-sm font-medium text-zinc-700"
              >
                Target tanggal terima{" "}
                <span className="text-zinc-400">(opsional)</span>
              </label>
              <TokoInput
                id="po-kirim"
                type="date"
                value={tanggalKirim}
                onChange={(e) => setTanggalKirim(e.target.value)}
                disabled={busy}
                min={tanggalPesanan || undefined}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="po-catatan"
                className="block text-sm font-medium text-zinc-700"
              >
                Catatan pesanan
              </label>
              <textarea
                id="po-catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="mt-1 w-full min-h-[88px] resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50"
                disabled={busy}
                placeholder="Catatan untuk pesanan ini (opsional)"
                rows={3}
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Item dipesan</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Pilih barang/jasa, satuan, qty, dan harga beli. Stok belum
                bertambah — hanya tercatat sebagai pesanan terbuka.
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
                  <th className="px-3 py-2.5">Barang</th>
                  <th className="w-24 px-3 py-2.5">Qty</th>
                  <th className="w-28 px-3 py-2.5">Satuan</th>
                  <th className="w-32 px-3 py-2.5">Harga beli</th>
                  <th className="w-28 px-3 py-2.5">Diskon/sat</th>
                  <th className="min-w-[160px] px-3 py-2.5">Catatan baris</th>
                  <th className="w-36 px-3 py-2.5 text-right">Subtotal</th>
                  <th className="w-14 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lines.map((row) => {
                  const sub = pembelianLineSubtotal(
                    row.qty,
                    row.hargaSatuan,
                    row.diskon,
                  );
                  const maxDiskon = Math.max(0, row.hargaSatuan);
                  const b = row.barangKode
                    ? barangByKode.get(row.barangKode.toLowerCase())
                    : undefined;
                  return (
                    <tr key={row.id} className="bg-white align-top">
                      <td className="px-3 py-2">
                        <TokoSelect
                          value={row.barangKode}
                          onChange={(e) =>
                            setLine(row.id, { barangKode: e.target.value })
                          }
                          disabled={busy}
                        >
                          <option value="">— Pilih item —</option>
                          {barangItems.map((item) => (
                            <option key={item.kode} value={item.kode}>
                              {item.kode} — {item.nama} ({item.tipe})
                            </option>
                          ))}
                        </TokoSelect>
                        {b?.tipe === "Barang" ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            Stok saat ini: {b.stok ?? 0} {getSatuanStokBarang(b)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <TokoInput
                          inputMode="numeric"
                          value={row.qty}
                          onChange={(e) =>
                            setLine(row.id, {
                              qty: Math.max(
                                1,
                                Number.parseInt(e.target.value, 10) || 1,
                              ),
                            })
                          }
                          placeholder="1"
                          disabled={busy}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <FakturLineSatuanSelect
                          barang={b}
                          tingkat={row.satuanTingkat}
                          onChange={(tingkat, hargaJual) =>
                            setLine(row.id, {
                              satuanTingkat: tingkat,
                              hargaSatuan: hargaJual,
                            })
                          }
                          disabled={busy || !b}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <TokoInput
                          inputMode="numeric"
                          value={row.hargaSatuan}
                          onChange={(e) =>
                            setLine(row.id, {
                              hargaSatuan: Math.max(
                                0,
                                Math.round(Number(e.target.value) || 0),
                              ),
                            })
                          }
                          placeholder="0"
                          disabled={busy}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <TokoInput
                          inputMode="numeric"
                          value={row.diskon}
                          onChange={(e) => {
                            const raw = Math.max(
                              0,
                              Math.round(Number(e.target.value) || 0),
                            );
                            setLine(row.id, {
                              diskon: Math.min(raw, maxDiskon),
                            });
                          }}
                          placeholder="0"
                          disabled={busy}
                          title="Diskon nominal per satuan (Rp)"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <TokoInput
                          type="text"
                          value={row.catatan}
                          onChange={(e) =>
                            setLine(row.id, { catatan: e.target.value })
                          }
                          disabled={busy}
                          placeholder="Catatan per baris"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-zinc-900">
                        <span className="inline-block pt-2.5">
                          {formatRupiah(sub)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Button
                          type="button"
                          onClick={() => removeLine(row.id)}
                          variant="danger"
                          aria-label="Hapus baris"
                          disabled={busy || lines.length <= 1}
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
              <span className="font-medium text-zinc-900">
                {formatRupiah(subtotalBarang)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <label
                htmlFor="po-diskon-faktur"
                className="shrink-0 text-zinc-500"
              >
                Diskon pesanan
              </label>
              <TokoInput
                id="po-diskon-faktur"
                inputMode="numeric"
                value={diskonFaktur}
                onChange={(e) => {
                  const raw = Math.max(
                    0,
                    Math.round(Number(e.target.value) || 0),
                  );
                  setDiskonFaktur(Math.min(raw, subtotalBarang));
                }}
                className="w-36 text-right"
                fullWidth={false}
                disabled={busy}
              />
            </div>
            {terkenaPajak ? (
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="shrink-0 text-zinc-500">
                  Pajak (PPN {ppnPersen}%)
                </span>
                <span className="font-medium text-zinc-900">
                  {formatRupiah(pajak)}
                </span>
              </div>
            ) : pajak > 0 ? (
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="shrink-0 text-zinc-500">
                  Pajak{" "}
                  <span className="text-xs italic text-zinc-400">
                    (tersimpan, PPN global nonaktif)
                  </span>
                </span>
                <span className="font-medium text-zinc-900">
                  {formatRupiah(pajak)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Total estimasi
              </span>
              <span className="text-lg font-bold text-zinc-900">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(cancelHref)}
            disabled={busy}
          >
            Batal
          </Button>
          <Button type="submit" disabled={busy}>
            {saving
              ? "Menyimpan…"
              : mode === "edit"
                ? "Simpan perubahan"
                : "Simpan pesanan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
