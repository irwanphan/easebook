import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";
import { TokoLookup } from "@/components/ui/TokoLookup";
import { FakturLineSatuanSelect } from "@/features/barang-jasa/FakturLineSatuanSelect";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { useGudang } from "@/features/gudang/GudangContext";
import { useAuth } from "@/features/auth/AuthContext";
import {
  getDefaultSatuanPilihan,
  qtyToSatuanTerkecil,
} from "@/data/barangJasa";
import type { BarangJasaRow } from "@/data/barangJasa";
import type { GudangRow } from "@/data/gudang";
import type { BarangSaldoGudangRow } from "@/data/mutasiAntarGudang";
import type { HppListRow } from "@/data/hpp";
import {
  KOREKSI_ALASAN_OPTIONS,
  type KoreksiAlasan,
  type KoreksiArah,
  type KoreksiStokInsertPayload,
} from "@/data/koreksiStok";
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

function formatJumlah(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

type LineDraft = {
  id: string;
  barangKode: string;
  arah: KoreksiArah;
  qty: number;
  satuanTingkat: number;
  nilaiPerUnit: number;
  catatan: string;
};

function newLine(arah: KoreksiArah = "MASUK"): LineDraft {
  return {
    id: crypto.randomUUID(),
    barangKode: "",
    arah,
    qty: 1,
    satuanTingkat: 1,
    nilaiPerUnit: 0,
    catatan: "",
  };
}

/**
 * Tombol segmen Arah (Masuk / Keluar) — visual yang gampang diklik
 * dibanding dropdown.
 */
function ArahToggle({
  value,
  onChange,
  disabled,
}: {
  value: KoreksiArah;
  onChange: (next: KoreksiArah) => void;
  disabled?: boolean;
}) {
  const baseBtn =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition";
  return (
    <div
      role="group"
      aria-label="Arah perubahan stok"
      className="flex w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-0.5"
    >
      <button
        type="button"
        onClick={() => onChange("MASUK")}
        disabled={disabled}
        className={`${baseBtn} ${
          value === "MASUK"
            ? "bg-emerald-100 text-emerald-800 shadow-sm"
            : "text-zinc-500 hover:bg-white hover:text-zinc-700"
        }`}
      >
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        Masuk
      </button>
      <button
        type="button"
        onClick={() => onChange("KELUAR")}
        disabled={disabled}
        className={`${baseBtn} ${
          value === "KELUAR"
            ? "bg-rose-100 text-rose-800 shadow-sm"
            : "text-zinc-500 hover:bg-white hover:text-zinc-700"
        }`}
      >
        <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden />
        Keluar
      </button>
    </div>
  );
}

export function KoreksiStokPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const {
    items: barangItems,
    loading: barangLoading,
    refresh: refreshBarang,
  } = useBarangJasa();
  const { items: gudangItems, loading: gudangLoading } = useGudang();

  const [tanggal, setTanggal] = useState(todayLocalISODate);
  const [gudangKode, setGudangKode] = useState("");
  const [alasan, setAlasan] = useState<KoreksiAlasan>("STOK_OPNAME");
  const [catatan, setCatatan] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Lookup pendukung ----------------------------------------------------
  const [stokGudang, setStokGudang] = useState<Map<string, number>>(new Map());
  const [stokLoading, setStokLoading] = useState(false);
  const [hppMap, setHppMap] = useState<Map<string, number>>(new Map());

  // Muat HPP semua barang sekali (dipakai untuk auto-fill nilai/unit).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await invoke<HppListRow[]>("barang_hpp_list");
        if (cancelled) return;
        const m = new Map<string, number>();
        for (const r of rows) m.set(r.kode.toLowerCase(), r.hpp);
        setHppMap(m);
      } catch {
        if (!cancelled) setHppMap(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Saat gudang berubah, muat saldo barang di gudang tsb (untuk validasi KELUAR).
  useEffect(() => {
    if (!gudangKode.trim()) {
      setStokGudang(new Map());
      return;
    }
    let cancelled = false;
    setStokLoading(true);
    (async () => {
      try {
        const rows = await invoke<BarangSaldoGudangRow[]>(
          "stok_barang_di_gudang",
          { gudangKode: gudangKode.trim() },
        );
        if (cancelled) return;
        const m = new Map<string, number>();
        for (const r of rows) m.set(r.kode.toLowerCase(), r.saldo);
        setStokGudang(m);
      } catch {
        if (!cancelled) setStokGudang(new Map());
      } finally {
        if (!cancelled) setStokLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gudangKode]);

  // Hanya barang fisik (Jasa tidak punya stok untuk dikoreksi).
  const barangFisik = useMemo(
    () => barangItems.filter((b) => b.tipe === "Barang"),
    [barangItems],
  );
  const barangByKode = useMemo(() => {
    const m = new Map<string, (typeof barangItems)[number]>();
    for (const b of barangItems) m.set(b.kode.toLowerCase(), b);
    return m;
  }, [barangItems]);

  /** Hitung nilai per unit default = HPP × qty_isi tier terpilih. */
  const nilaiPerUnitDefault = useCallback(
    (barangKode: string, satuanTingkat: number): number => {
      const hpp = hppMap.get(barangKode.toLowerCase()) ?? 0;
      if (hpp <= 0) return 0;
      const b = barangByKode.get(barangKode.toLowerCase());
      if (!b) return hpp;
      // HPP per satuan terkecil; konversi naik ke tingkat terpilih.
      const qtyTerkecilPer1Satuan = qtyToSatuanTerkecil(b, satuanTingkat, 1);
      return Math.round(hpp * qtyTerkecilPer1Satuan);
    },
    [hppMap, barangByKode],
  );

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
            next.nilaiPerUnit = 0;
          } else {
            const b = barangByKode.get(raw.toLowerCase());
            if (b) {
              const def = getDefaultSatuanPilihan(b);
              next.barangKode = b.kode;
              next.satuanTingkat = def.tingkat;
              next.nilaiPerUnit = nilaiPerUnitDefault(b.kode, def.tingkat);
              if (next.qty < 1) next.qty = 1;
            }
          }
        }
        // Saat ganti satuan, recalculate nilai default jika user belum override.
        if (
          patch.satuanTingkat !== undefined &&
          patch.satuanTingkat !== row.satuanTingkat
        ) {
          const expectedPrev = nilaiPerUnitDefault(
            next.barangKode,
            row.satuanTingkat,
          );
          if (row.nilaiPerUnit === expectedPrev) {
            next.nilaiPerUnit = nilaiPerUnitDefault(
              next.barangKode,
              patch.satuanTingkat,
            );
          }
        }
        return next;
      }),
    );
  }

  function addLine(arah: KoreksiArah = "MASUK") {
    setLines((prev) => [...prev, newLine(arah)]);
  }

  function removeLine(id: string) {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.id !== id),
    );
  }

  // --- Per-baris derived values --------------------------------------------
  type LineDerived = {
    qtySmallest: number;
    subtotalNilai: number;
    stokGudangSaatIni: number;
    stokSetelah: number | null;
    stokWarning: string | null;
  };

  const linesDerived = useMemo<Map<string, LineDerived>>(() => {
    const m = new Map<string, LineDerived>();
    for (const row of lines) {
      const b = row.barangKode
        ? barangByKode.get(row.barangKode.toLowerCase())
        : undefined;
      const qtySmallest = b
        ? qtyToSatuanTerkecil(b, row.satuanTingkat, row.qty)
        : 0;
      const subtotalNilai = Math.max(
        0,
        Math.round(row.qty * row.nilaiPerUnit),
      );
      const stokGudangSaatIni = b
        ? (stokGudang.get(b.kode.toLowerCase()) ?? 0)
        : 0;
      let stokSetelah: number | null = null;
      let stokWarning: string | null = null;
      if (b && row.qty > 0) {
        stokSetelah =
          row.arah === "MASUK"
            ? stokGudangSaatIni + qtySmallest
            : stokGudangSaatIni - qtySmallest;
        if (row.arah === "KELUAR" && qtySmallest > stokGudangSaatIni) {
          stokWarning = `Stok di gudang hanya ${formatJumlah(stokGudangSaatIni)} unit terkecil.`;
        }
      }
      m.set(row.id, {
        qtySmallest,
        subtotalNilai,
        stokGudangSaatIni,
        stokSetelah,
        stokWarning,
      });
    }
    return m;
  }, [lines, barangByKode, stokGudang]);

  // --- Ringkasan footer ----------------------------------------------------
  const ringkasan = useMemo(() => {
    let masukQty = 0;
    let keluarQty = 0;
    let masukNilai = 0;
    let keluarNilai = 0;
    for (const row of lines) {
      const d = linesDerived.get(row.id);
      if (!d) continue;
      if (row.arah === "MASUK") {
        masukQty += d.qtySmallest;
        masukNilai += d.subtotalNilai;
      } else {
        keluarQty += d.qtySmallest;
        keluarNilai += d.subtotalNilai;
      }
    }
    return { masukQty, keluarQty, masukNilai, keluarNilai };
  }, [lines, linesDerived]);

  // --- Submit --------------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!tanggal.trim()) {
      setError("Tanggal koreksi wajib diisi.");
      return;
    }
    if (!gudangKode.trim()) {
      setError("Pilih gudang.");
      return;
    }
    if (!session?.username) {
      setError("Sesi pengguna tidak terbaca — silakan login ulang.");
      return;
    }

    const payloadLines = lines
      .filter((r) => r.barangKode.trim())
      .map((r) => ({
        barangKode: r.barangKode.trim(),
        arah: r.arah,
        qty: Math.floor(r.qty),
        satuanTingkat: r.satuanTingkat,
        nilaiPerUnit: Math.max(0, Math.round(r.nilaiPerUnit)),
        catatan: r.catatan.trim(),
      }));

    if (payloadLines.length === 0) {
      setError("Tambahkan minimal satu baris dengan barang terpilih.");
      return;
    }
    for (let i = 0; i < payloadLines.length; i++) {
      const ln = payloadLines[i]!;
      const nomor = i + 1;
      if (ln.qty <= 0) {
        setError(`Baris ${nomor}: qty harus > 0.`);
        return;
      }
    }
    // Validasi stok cukup untuk semua baris KELUAR (frontend check; backend juga validasi).
    for (let i = 0; i < lines.length; i++) {
      const row = lines[i]!;
      const derived = linesDerived.get(row.id);
      if (!derived) continue;
      if (row.barangKode && row.arah === "KELUAR" && derived.stokWarning) {
        setError(`Baris ${i + 1}: ${derived.stokWarning}`);
        return;
      }
    }

    const payload: KoreksiStokInsertPayload = {
      tanggal: tanggal.trim(),
      gudangKode: gudangKode.trim(),
      alasan,
      catatan: catatan.trim(),
      actorUsername: session.username,
      actorNama: session.namaLengkap ?? "",
      lines: payloadLines,
    };

    setSaving(true);
    try {
      const nomor = await invoke<string>("koreksi_stok_insert", { payload });
      await refreshBarang();
      navigate(
        `/laporan/pergerakan-stok?ref=${encodeURIComponent(nomor)}`,
        { replace: true },
      );
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const masterLoading = barangLoading || gudangLoading;
  const alasanMeta = KOREKSI_ALASAN_OPTIONS.find((o) => o.value === alasan);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          to="/barang-jasa"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Barang &amp; jasa
        </Link>
        <PageHeader
          title="Koreksi stok"
          description="Catat penyesuaian stok manual: stok opname, barang rusak/hilang/ditemukan, atau reklasifikasi. Satu dokumen = satu gudang, banyak baris campuran masuk/keluar."
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

        <Card>
          <h2 className="text-sm font-semibold text-zinc-900">
            Header koreksi
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pilih gudang & alasan terlebih dulu — baris-baris di bawah akan
            ikut menyesuaikan validasi stok &amp; default nilai.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="kor-tgl"
                className="block text-sm font-medium text-zinc-700"
              >
                Tanggal koreksi
              </label>
              <TokoInput
                id="kor-tgl"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>
            <div>
              <TokoLookup<GudangRow>
                id="kor-gudang"
                label="Gudang"
                options={gudangItems}
                value={gudangKode || null}
                getKey={(g) => g.kode}
                getLabel={(g) => `${g.kode} — ${g.nama}`}
                getDescription={(g) => g.alamat || undefined}
                onChange={(opt) => setGudangKode(opt ? opt.kode : "")}
                placeholder="— Pilih gudang —"
                searchPlaceholder="Cari kode atau nama gudang…"
                emptyMessage="Gudang tidak ditemukan."
                disabled={masterLoading}
                required
              />
              {gudangKode && stokLoading ? (
                <p className="mt-1.5 text-xs text-zinc-400">
                  Memuat saldo stok gudang…
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="kor-alasan"
                className="block text-sm font-medium text-zinc-700"
              >
                Alasan koreksi
              </label>
              <TokoSelect
                id="kor-alasan"
                value={alasan}
                onChange={(e) => setAlasan(e.target.value as KoreksiAlasan)}
              >
                {KOREKSI_ALASAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </TokoSelect>
              {alasanMeta ? (
                <p className="mt-1.5 text-xs text-zinc-500">
                  {alasanMeta.hint}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="kor-catatan"
                className="block text-sm font-medium text-zinc-700"
              >
                Catatan dokumen <span className="text-zinc-400">(opsional)</span>
              </label>
              <TokoInput
                id="kor-catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Mis. hasil opname kuartal 2, gudang utama"
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Baris koreksi
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Pilih barang, arah (masuk/keluar), qty, dan nilai per satuan
                yang dipilih. Nilai default mengikuti HPP rata-rata terkini.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="!px-3"
                onClick={() => addLine("MASUK")}
              >
                <ArrowUpRight
                  className="h-4 w-4 text-emerald-600"
                  aria-hidden
                />
                Tambah baris masuk
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => addLine("KELUAR")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Tambah baris keluar
              </Button>
            </div>
          </div>

          {!gudangKode ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                Pilih gudang dulu di atas — validasi stok per baris &amp;
                preview saldo akan aktif otomatis setelah gudang dipilih.
              </p>
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-100">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="w-[26%] px-3 py-2.5">Barang</th>
                  <th className="w-32 px-3 py-2.5">Arah</th>
                  <th className="w-20 px-3 py-2.5">Qty</th>
                  <th className="w-28 px-3 py-2.5">Satuan</th>
                  <th className="w-36 px-3 py-2.5">Nilai/satuan</th>
                  <th className="w-36 px-3 py-2.5 text-right">Subtotal</th>
                  <th className="w-[18%] px-3 py-2.5">Catatan baris</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lines.map((row, idx) => {
                  const barang = row.barangKode
                    ? barangByKode.get(row.barangKode.toLowerCase())
                    : undefined;
                  const derived = linesDerived.get(row.id);
                  const stokSaatIni = derived?.stokGudangSaatIni ?? 0;
                  const stokSetelah = derived?.stokSetelah ?? null;
                  const hppCurrent =
                    hppMap.get(row.barangKode.toLowerCase()) ?? 0;
                  const nilaiDefault = barang
                    ? nilaiPerUnitDefault(row.barangKode, row.satuanTingkat)
                    : 0;
                  const showFillHpp =
                    !!barang &&
                    nilaiDefault > 0 &&
                    Math.round(row.nilaiPerUnit) !== nilaiDefault;
                  return (
                    <tr key={row.id} className="bg-white align-top">
                      <td className="px-3 py-3">
                        <TokoLookup<BarangJasaRow>
                          options={barangFisik}
                          value={row.barangKode || null}
                          getKey={(b) => b.kode}
                          getLabel={(b) => `${b.kode} — ${b.nama}`}
                          getDescription={(b) => b.satuan || undefined}
                          onChange={(opt) =>
                            setLine(row.id, { barangKode: opt ? opt.kode : "" })
                          }
                          placeholder="— Pilih barang —"
                          searchPlaceholder="Cari kode atau nama barang…"
                          emptyMessage="Barang tidak ditemukan."
                          disabled={masterLoading}
                          required
                        />
                        {barang && gudangKode ? (
                          <p
                            className={`mt-1.5 text-xs ${
                              derived?.stokWarning
                                ? "text-rose-600"
                                : "text-zinc-500"
                            }`}
                          >
                            Stok gudang ini:{" "}
                            <span className="font-medium">
                              {formatJumlah(stokSaatIni)}
                            </span>
                            {stokSetelah !== null
                              ? ` → setelah koreksi: ${formatJumlah(stokSetelah)}`
                              : ""}
                            {hppCurrent > 0
                              ? ` · HPP ${formatRupiah(hppCurrent)}/unit terkecil`
                              : ""}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <ArahToggle
                          value={row.arah}
                          onChange={(arah) => setLine(row.id, { arah })}
                        />
                      </td>
                      <td className="px-3 py-3">
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
                        />
                      </td>
                      <td className="px-3 py-3">
                        <FakturLineSatuanSelect
                          barang={barang}
                          tingkat={row.satuanTingkat}
                          onChange={(tingkat) =>
                            setLine(row.id, { satuanTingkat: tingkat })
                          }
                          disabled={!barang}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <TokoInput
                          inputMode="numeric"
                          value={row.nilaiPerUnit}
                          onChange={(e) =>
                            setLine(row.id, {
                              nilaiPerUnit: Math.max(
                                0,
                                Math.round(Number(e.target.value) || 0),
                              ),
                            })
                          }
                          placeholder="0"
                        />
                        {showFillHpp ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLine(row.id, { nilaiPerUnit: nilaiDefault })
                            }
                            className="mt-1.5 text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline"
                          >
                            Pakai HPP ({formatRupiah(nilaiDefault)})
                          </button>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-zinc-900">
                        {formatRupiah(derived?.subtotalNilai ?? 0)}
                      </td>
                      <td className="px-3 py-3">
                        <TokoInput
                          value={row.catatan}
                          onChange={(e) =>
                            setLine(row.id, { catatan: e.target.value })
                          }
                          placeholder="opsional"
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(row.id)}
                          disabled={lines.length <= 1}
                          className="inline-flex rounded-lg p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                          aria-label={`Hapus baris ${idx + 1}`}
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

          <div className="mt-6 grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Total qty masuk
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-900">
                +{formatJumlah(ringkasan.masukQty)}{" "}
                <span className="text-xs font-medium text-emerald-700">
                  unit terkecil
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                Total qty keluar
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-rose-900">
                −{formatJumlah(ringkasan.keluarQty)}{" "}
                <span className="text-xs font-medium text-rose-700">
                  unit terkecil
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nilai tambah persediaan
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                {formatRupiah(ringkasan.masukNilai)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nilai kurang persediaan
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                {formatRupiah(ringkasan.keluarNilai)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Catatan: untuk HPP, nilai keluar otomatis memakai HPP saat itu
                (nilai di atas hanya referensi valuasi yang Anda input).
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/barang-jasa")}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={masterLoading || saving || lines.length === 0}
          >
            {saving ? "Menyimpan…" : "Simpan koreksi"}
          </Button>
        </div>
      </form>
    </div>
  );
}
