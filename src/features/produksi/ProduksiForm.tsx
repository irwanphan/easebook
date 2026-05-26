import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Save, Trash2, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { useGudang } from "@/features/gudang/GudangContext";
import { useAuth } from "@/features/auth/AuthContext";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type {
  ProduksiDetail,
  ProduksiInsertPayload,
  ProduksiLineInput,
} from "@/data/produksi";
import { formatRupiah, parseRupiahInput } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";
import {
  produksiHppSnapshot,
  produksiInsert,
  produksiUpdate,
} from "./produksiInvoke";

type LineDraft = ProduksiLineInput & { uid: string };

const NEW_UID = () =>
  `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function emptyLine(): LineDraft {
  return {
    uid: NEW_UID(),
    barangKode: "",
    qty: 0,
    satuanTingkat: 1,
    hppPerUnit: 0,
    catatan: "",
  };
}

function toIsoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type ProduksiFormProps = {
  mode: "create" | "edit";
  /** Hanya untuk mode edit. */
  nomor?: string;
  /** Detail awal (mode edit) untuk mengisi form. */
  initial?: ProduksiDetail | null;
};

export function ProduksiForm({ mode, nomor, initial }: ProduksiFormProps) {
  const navigate = useNavigate();
  const { items: barangs, loading: barangLoading } = useBarangJasa();
  const { items: gudangs, loading: gudangLoading } = useGudang();
  const { session } = useAuth();

  const [tanggal, setTanggal] = useState<string>(initial?.tanggal ?? toIsoToday());
  const [gudangBb, setGudangBb] = useState<string>(initial?.gudangBbKode ?? "");
  const [gudangHasil, setGudangHasil] = useState<string>(initial?.gudangHasilKode ?? "");
  const [biayaProduksi, setBiayaProduksi] = useState<number>(initial?.biayaProduksi ?? 0);
  const [akunBiayaKode, setAkunBiayaKode] = useState<string>(initial?.akunBiayaKode ?? "");
  const [catatan, setCatatan] = useState<string>(initial?.catatan ?? "");
  const [statusSelesai, setStatusSelesai] = useState<boolean>(false);

  const [bahanLines, setBahanLines] = useState<LineDraft[]>(() =>
    initial
      ? initial.bahanBaku.map((l) => ({
          uid: NEW_UID(),
          barangKode: l.barangKode,
          qty: l.qty,
          satuanTingkat: l.satuanTingkat,
          hppPerUnit: l.hppPerUnit,
          catatan: l.catatan,
        }))
      : [emptyLine()],
  );
  const [hasilLines, setHasilLines] = useState<LineDraft[]>(() =>
    initial
      ? initial.hasil.map((l) => ({
          uid: NEW_UID(),
          barangKode: l.barangKode,
          qty: l.qty,
          satuanTingkat: l.satuanTingkat,
          hppPerUnit: l.hppPerUnit,
          catatan: l.catatan,
        }))
      : [emptyLine()],
  );

  const [akunList, setAkunList] = useState<AkunKeuanganRow[]>([]);
  const [akunLoading, setAkunLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default gudang awal saat data master termuat
  useEffect(() => {
    if (gudangBb === "" && gudangs.length > 0) {
      setGudangBb(gudangs[0]!.kode);
    }
    if (gudangHasil === "" && gudangs.length > 0) {
      setGudangHasil(gudangs[0]!.kode);
    }
  }, [gudangs, gudangBb, gudangHasil]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
        if (cancelled) return;
        setAkunList(list);
      } catch (e) {
        console.error("akun_keuangan_list failed", e);
      } finally {
        if (!cancelled) setAkunLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const barangBarangOnly = useMemo(
    () => barangs.filter((b) => b.tipe === "Barang"),
    [barangs],
  );

  const totalBb = useMemo(
    () => bahanLines.reduce((s, l) => s + l.qty * l.hppPerUnit, 0),
    [bahanLines],
  );
  const totalHasil = useMemo(
    () => hasilLines.reduce((s, l) => s + l.qty * l.hppPerUnit, 0),
    [hasilLines],
  );
  const qtyHasilTotal = useMemo(
    () => hasilLines.reduce((s, l) => s + l.qty, 0),
    [hasilLines],
  );
  const ekspektasiNilai = totalBb + biayaProduksi;
  const selisih = totalHasil - ekspektasiNilai;
  const rekomendasiHppPerUnit = qtyHasilTotal > 0 ? Math.round(ekspektasiNilai / qtyHasilTotal) : 0;

  // --- Line manipulation -----------------------------------------------------

  const updateBahan = useCallback((uid: string, patch: Partial<LineDraft>) => {
    setBahanLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }, []);
  const updateHasil = useCallback((uid: string, patch: Partial<LineDraft>) => {
    setHasilLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }, []);
  const removeBahan = useCallback((uid: string) => {
    setBahanLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.uid !== uid)));
  }, []);
  const removeHasil = useCallback((uid: string) => {
    setHasilLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.uid !== uid)));
  }, []);

  /** Auto-isi HPP bahan baku dari snapshot saat barang dipilih. */
  const handleBahanBarangChange = useCallback(
    async (uid: string, kode: string) => {
      updateBahan(uid, { barangKode: kode, hppPerUnit: 0 });
      if (!kode) return;
      try {
        const snap = await produksiHppSnapshot(kode);
        updateBahan(uid, { hppPerUnit: snap.hppPerUnit });
      } catch (e) {
        console.error("produksiHppSnapshot failed", e);
      }
    },
    [updateBahan],
  );

  /** Auto-isi HPP barang jadi dengan rekomendasi (boleh override). */
  const applyRekomendasiKeSemua = useCallback(() => {
    if (qtyHasilTotal <= 0) return;
    const per = Math.round(ekspektasiNilai / qtyHasilTotal);
    setHasilLines((prev) => prev.map((l) => ({ ...l, hppPerUnit: per })));
  }, [ekspektasiNilai, qtyHasilTotal]);

  // --- Submit ----------------------------------------------------------------

  const buildPayload = useCallback(
    (selesai: boolean): ProduksiInsertPayload => ({
      tanggal,
      gudangBbKode: gudangBb,
      gudangHasilKode: gudangHasil,
      statusSelesai: selesai,
      biayaProduksi,
      akunBiayaKode: akunBiayaKode || null,
      catatan,
      dibuatOleh: session?.username ?? "",
      bahanBaku: bahanLines
        .filter((l) => l.barangKode && l.qty > 0)
        .map(({ uid: _u, ...rest }) => rest),
      hasil: hasilLines
        .filter((l) => l.barangKode && l.qty > 0)
        .map(({ uid: _u, ...rest }) => rest),
    }),
    [
      tanggal,
      gudangBb,
      gudangHasil,
      biayaProduksi,
      akunBiayaKode,
      catatan,
      session?.username,
      bahanLines,
      hasilLines,
    ],
  );

  const submit = useCallback(
    async (selesai: boolean) => {
      setError(null);
      setStatusSelesai(selesai);
      const payload = buildPayload(selesai);
      if (payload.bahanBaku.length === 0) {
        setError("Tambahkan minimal satu baris bahan baku dengan qty > 0.");
        return;
      }
      if (payload.hasil.length === 0) {
        setError("Tambahkan minimal satu baris barang jadi dengan qty > 0.");
        return;
      }
      if (payload.biayaProduksi > 0 && !payload.akunBiayaKode) {
        setError("Pilih akun lawan untuk biaya produksi.");
        return;
      }
      setSubmitting(true);
      try {
        if (mode === "create") {
          const nomorBaru = await produksiInsert(payload);
          navigate(`/barang-jasa/produksi/detail/${encodeURIComponent(nomorBaru)}`);
        } else {
          if (!nomor) throw new Error("Nomor produksi tidak ada.");
          await produksiUpdate(nomor, payload);
          navigate(`/barang-jasa/produksi/detail/${encodeURIComponent(nomor)}`);
        }
      } catch (e) {
        setError(tauriErrorMessage(e));
      } finally {
        setSubmitting(false);
      }
    },
    [buildPayload, mode, navigate, nomor],
  );

  const disabled = submitting || barangLoading || gudangLoading || akunLoading;

  // --- Render ---------------------------------------------------------------

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
    >
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      <Card className="p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Informasi produksi</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TokoInput
            label="Tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            disabled={disabled}
            required
          />
          <TokoSelect
            label={
              <span className="inline-flex items-center gap-1.5">
                Gudang bahan baku
                <span className="text-xs font-normal text-zinc-400">(asal)</span>
              </span>
            }
            value={gudangBb}
            onChange={(e) => setGudangBb(e.target.value)}
            disabled={disabled || gudangs.length === 0}
            required
          >
            <option value="">— Pilih gudang —</option>
            {gudangs.map((g) => (
              <option key={g.kode} value={g.kode}>
                {g.kode} — {g.nama}
              </option>
            ))}
          </TokoSelect>
          <TokoSelect
            label={
              <span className="inline-flex items-center gap-1.5">
                Gudang barang jadi
                <span className="text-xs font-normal text-zinc-400">(tujuan)</span>
              </span>
            }
            value={gudangHasil}
            onChange={(e) => setGudangHasil(e.target.value)}
            disabled={disabled || gudangs.length === 0}
            required
          >
            <option value="">— Pilih gudang —</option>
            {gudangs.map((g) => (
              <option key={g.kode} value={g.kode}>
                {g.kode} — {g.nama}
              </option>
            ))}
          </TokoSelect>
          <TokoInput
            label="Catatan"
            wrapperClassName="lg:col-span-3"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            disabled={disabled}
            placeholder="Mis. rencana produksi minggu ini, batch ke-5, dst."
          />
        </div>
      </Card>

      <LinesCard
        title="Bahan baku"
        description="Barang yang akan dikonsumsi dari gudang bahan baku. HPP otomatis pakai rata-rata tertimbang terkini (moving average) dan tidak dapat diubah — nilai final akan di-snapshot ulang saat produksi diselesaikan."
        lines={bahanLines}
        barangs={barangBarangOnly}
        disabled={disabled}
        hppReadOnly
        onAdd={() => setBahanLines((p) => [...p, emptyLine()])}
        onRemove={removeBahan}
        onChangeBarang={(uid, kode) => void handleBahanBarangChange(uid, kode)}
        onChangeQty={(uid, qty) => updateBahan(uid, { qty })}
        onChangeHpp={(uid, hpp) => updateBahan(uid, { hppPerUnit: hpp })}
        onChangeCatatan={(uid, c) => updateBahan(uid, { catatan: c })}
        total={totalBb}
        emptyHint={barangBarangOnly.length === 0 ? "Belum ada barang fisik di katalog." : null}
        totalLabel="Estimasi nilai bahan baku"
        totalHint="Estimasi berdasarkan HPP saat ini. Nilai final ditentukan saat 'Tandai Selesai'."
      />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Biaya produksi</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Biaya tambahan (listrik, tenaga kerja, overhead) yang diserap ke HPP barang jadi.
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <div>
              Estimasi nilai BB:{" "}
              <span className="font-medium text-zinc-700">{formatRupiah(totalBb)}</span>
            </div>
            <div>
              Estimasi total diserap:{" "}
              <span className="font-semibold text-zinc-900">{formatRupiah(ekspektasiNilai)}</span>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TokoInput
            label="Biaya produksi"
            inputMode="numeric"
            value={biayaProduksi === 0 ? "" : formatRupiah(biayaProduksi)}
            onChange={(e) => setBiayaProduksi(parseRupiahInput(e.target.value))}
            placeholder="Rp 0"
            disabled={disabled}
          />
          <TokoSelect
            label="Akun lawan biaya"
            value={akunBiayaKode}
            onChange={(e) => setAkunBiayaKode(e.target.value)}
            disabled={disabled || akunList.length === 0}
            hint={
              biayaProduksi > 0
                ? "Wajib bila ada biaya; pilih akun kas/bank (tunai) atau akun hutang biaya (akrual)."
                : "Opsional bila biaya = 0."
            }
          >
            <option value="">— Pilih akun —</option>
            {akunList.map((a) => (
              <option key={a.kode} value={a.kode}>
                {a.kode} — {a.nama}
                {a.isAkunKas ? " · kas" : ""}
              </option>
            ))}
          </TokoSelect>
        </div>
      </Card>

      <LinesCard
        title="Barang jadi (hasil produksi)"
        description="Barang yang dihasilkan dan masuk ke gudang barang jadi. HPP otomatis = (nilai bahan baku + biaya) / total qty hasil; boleh di-override."
        lines={hasilLines}
        barangs={barangBarangOnly}
        disabled={disabled}
        onAdd={() => setHasilLines((p) => [...p, emptyLine()])}
        onRemove={removeHasil}
        onChangeBarang={(uid, kode) => updateHasil(uid, { barangKode: kode })}
        onChangeQty={(uid, qty) => updateHasil(uid, { qty })}
        onChangeHpp={(uid, hpp) => updateHasil(uid, { hppPerUnit: hpp })}
        onChangeCatatan={(uid, c) => updateHasil(uid, { catatan: c })}
        total={totalHasil}
        emptyHint={barangBarangOnly.length === 0 ? "Belum ada barang fisik di katalog." : null}
        extraHeader={
          <Button
            type="button"
            variant="outline"
            className="px-3 py-1.5 text-xs"
            onClick={applyRekomendasiKeSemua}
            disabled={disabled || qtyHasilTotal === 0}
            title="Isi HPP semua baris dengan nilai rekomendasi"
          >
            Isi rekomendasi {rekomendasiHppPerUnit > 0 ? `(${formatRupiah(rekomendasiHppPerUnit)}/unit)` : ""}
          </Button>
        }
        summaryExtra={
          <div className="mt-2 grid gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Estimasi nilai BB + biaya</span>
              <span className="font-medium text-zinc-700">{formatRupiah(ekspektasiNilai)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Total nilai hasil</span>
              <span className="font-medium text-zinc-700">{formatRupiah(totalHasil)}</span>
            </div>
            <div
              className={`flex items-center justify-between font-semibold ${
                Math.abs(selisih) === 0
                  ? "text-emerald-700"
                  : selisih > 0
                    ? "text-amber-700"
                    : "text-rose-700"
              }`}
            >
              <span>Estimasi selisih</span>
              <span>{formatRupiah(selisih)}</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {selisih !== 0
                ? "Selisih ini akan dijurnal ke 5010 Laba Rugi Pembulatan. Nilai BB final dihitung ulang saat 'Tandai Selesai' (mengikuti rata-rata tertimbang terkini)."
                : "Nilai BB final akan dihitung ulang dari moving average terkini saat 'Tandai Selesai'."}
            </p>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          className="bg-white"
          onClick={() => navigate("/barang-jasa/produksi")}
          disabled={submitting}
        >
          <X className="h-4 w-4" aria-hidden />
          Batal
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void submit(false)}
          disabled={disabled}
          title="Simpan sebagai 'Menunggu' — stok & jurnal belum diposting"
        >
          <Save className="h-4 w-4" aria-hidden />
          {submitting && !statusSelesai ? "Menyimpan…" : "Simpan menunggu"}
        </Button>
        {mode === "create" ? (
          <Button
            type="button"
            onClick={() => void submit(true)}
            disabled={disabled}
            title="Simpan + langsung selesaikan (post stok & jurnal sekarang)"
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
            {submitting && statusSelesai ? "Menyelesaikan…" : "Simpan & selesaikan"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

// --- Sub-component: kartu daftar baris (bahan baku / hasil) -----------------

type LinesCardProps = {
  title: string;
  description: string;
  lines: LineDraft[];
  barangs: Array<{ kode: string; nama: string; satuan: string; tipe: string }>;
  disabled: boolean;
  /** Bila true, kolom HPP per unit tampil read-only dengan badge. */
  hppReadOnly?: boolean;
  onAdd: () => void;
  onRemove: (uid: string) => void;
  onChangeBarang: (uid: string, kode: string) => void;
  onChangeQty: (uid: string, qty: number) => void;
  onChangeHpp: (uid: string, hpp: number) => void;
  onChangeCatatan: (uid: string, catatan: string) => void;
  total: number;
  totalLabel?: string;
  totalHint?: string;
  emptyHint?: string | null;
  extraHeader?: React.ReactNode;
  summaryExtra?: React.ReactNode;
};

function LinesCard({
  title,
  description,
  lines,
  barangs,
  disabled,
  hppReadOnly,
  onAdd,
  onRemove,
  onChangeBarang,
  onChangeQty,
  onChangeHpp,
  onChangeCatatan,
  total,
  totalLabel,
  totalHint,
  emptyHint,
  extraHeader,
  summaryExtra,
}: LinesCardProps) {
  const namaByKode = useMemo(() => {
    const m = new Map<string, { nama: string; satuan: string }>();
    for (const b of barangs) m.set(b.kode.toLowerCase(), { nama: b.nama, satuan: b.satuan });
    return m;
  }, [barangs]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {extraHeader}
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 gap-2"
            onClick={onAdd}
            disabled={disabled || barangs.length === 0}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tambah baris
          </Button>
        </div>
      </div>

      {emptyHint ? (
        <p className="px-6 py-8 text-sm text-amber-700">{emptyHint}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Barang</th>
                <th className="px-4 py-3 w-28 text-right">Qty</th>
                <th className="px-4 py-3 w-24">Satuan</th>
                <th className="px-4 py-3 w-40 text-right">HPP / unit</th>
                <th className="px-4 py-3 w-40 text-right">Subtotal</th>
                <th className="px-4 py-3">Catatan</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {lines.map((line) => {
                const meta = line.barangKode
                  ? namaByKode.get(line.barangKode.toLowerCase())
                  : undefined;
                const sub = line.qty * line.hppPerUnit;
                return (
                  <tr key={line.uid} className="bg-white">
                    <td className="px-2 py-1">
                      <TokoSelect
                        value={line.barangKode}
                        onChange={(e) => onChangeBarang(line.uid, e.target.value)}
                        disabled={disabled}
                        required
                      >
                        <option value="">— Pilih barang —</option>
                        {barangs.map((b) => (
                          <option key={b.kode} value={b.kode}>
                            {b.kode} — {b.nama}
                          </option>
                        ))}
                      </TokoSelect>
                    </td>
                    <td className="px-2 py-1">
                      <TokoInput
                        type="number"
                        min={1}
                        step={1}
                        className="text-right"
                        value={line.qty || ""}
                        onChange={(e) =>
                          onChangeQty(line.uid, Math.max(0, Math.round(Number(e.target.value) || 0)))
                        }
                        disabled={disabled}
                      />
                    </td>
                    <td className="px-2 py-1 text-sm text-zinc-600">
                      {meta?.satuan ?? "—"}
                    </td>
                    <td className="px-2 py-1">
                      {hppReadOnly ? (
                        <div
                          className="flex h-10 items-center justify-end rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 text-sm tabular-nums text-zinc-700"
                          title="HPP otomatis = rata-rata tertimbang terkini. Akan di-snapshot ulang saat produksi diselesaikan."
                        >
                          {line.barangKode ? formatRupiah(line.hppPerUnit) : "—"}
                        </div>
                      ) : (
                        <TokoInput
                          inputMode="numeric"
                          className="text-right"
                          value={line.hppPerUnit === 0 ? "" : formatRupiah(line.hppPerUnit)}
                          onChange={(e) => onChangeHpp(line.uid, parseRupiahInput(e.target.value))}
                          placeholder="Rp 0"
                          disabled={disabled}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1 text-right text-sm font-medium text-zinc-900">
                      {formatRupiah(sub)}
                    </td>
                    <td className="px-2 py-1">
                      <TokoInput
                        type="text"
                        value={line.catatan}
                        onChange={(e) => onChangeCatatan(line.uid, e.target.value)}
                        disabled={disabled}
                        placeholder="Catatan baris"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <Button
                        type="button"
                        variant="danger"
                        className="h-10"
                        onClick={() => onRemove(line.uid)}
                        disabled={disabled || lines.length <= 1}
                        aria-label="Hapus baris"
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
      )}

      <div className="border-t border-zinc-100 px-5 py-4 sm:px-6">
        <div className="ml-auto flex max-w-sm flex-col gap-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-700">
              {totalLabel ?? `Total ${title.toLowerCase()}`}
            </span>
            <span className="text-lg font-bold text-zinc-900">{formatRupiah(total)}</span>
          </div>
          {totalHint ? (
            <p className="text-[11px] text-zinc-500">{totalHint}</p>
          ) : null}
          {summaryExtra}
        </div>
      </div>
    </Card>
  );
}
