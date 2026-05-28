import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookText,
  CheckCircle2,
  Info,
  Lock,
  PackageOpen,
  Search,
  ShieldAlert,
  Trash,
  Unlock,
  Warehouse,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getSatuanPilihanOptions,
  getSatuanStokBarang,
  qtyToSatuanTerkecil,
  type BarangJasaRow,
} from "@/data/barangJasa";
import type { GudangRow } from "@/data/gudang";
import { useBarangJasa } from "@/features/barang-jasa/BarangJasaContext";
import { useGudang } from "@/features/gudang/GudangContext";
import type { StokAwalEntryInput, StokAwalSnapshot } from "@/data/stokAwal";
import {
  stokAwalGet,
  stokAwalSet,
} from "@/features/barang-jasa/stokAwalInvoke";
import { formatTanggalLokal } from "@/data/operasionalKonfigurasi";
import { formatAngka, formatRupiah, parseRupiahInput } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";
import { PasswordConfirmModal } from "@/features/auth/PasswordConfirmModal";
import { useAuth } from "@/features/auth/AuthContext";

/** Permission key untuk membuka kunci saldo stok awal yang sudah disetel. */
const AKSES_UBAH_STOK_AWAL = "pengaturan-ubah-stok-awal";

/** Satu cell input per (barang, gudang). */
type CellInput = {
  qtyText: string;
  satuanTingkat: number;
};

/** State input per barang: nilai per satuan terkecil + grid per gudang. */
type RowInput = {
  /** Teks input nilai per satuan terkecil (Rp). */
  nilaiText: string;
  cells: Record<string, CellInput>;
};

type InputState = Record<string, RowInput>;

function parseQtyInput(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.toString().replace(/[^\d-]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function defaultCell(barang: BarangJasaRow): CellInput {
  const opts = getSatuanPilihanOptions(barang);
  const terkecil = opts[opts.length - 1];
  return {
    qtyText: "",
    satuanTingkat: terkecil ? terkecil.tingkat : 1,
  };
}

function buildInitialInputs(
  snapshot: StokAwalSnapshot,
  barangs: BarangJasaRow[],
  gudangs: GudangRow[],
): InputState {
  const state: InputState = {};
  for (const b of barangs) {
    const cells: Record<string, CellInput> = {};
    for (const g of gudangs) {
      cells[g.kode] = defaultCell(b);
    }
    state[b.kode] = { nilaiText: "", cells };
  }
  for (const e of snapshot.entries) {
    const row = state[e.barangKode] ?? state[e.barangKode.toUpperCase()];
    if (!row) continue;
    if (e.nilaiPerUnit > 0 && !row.nilaiText) {
      row.nilaiText = String(e.nilaiPerUnit);
    }
    const gKey =
      Object.keys(row.cells).find(
        (k) => k.toLowerCase() === e.gudangKode.toLowerCase(),
      ) ?? e.gudangKode;
    row.cells[gKey] = {
      qtyText: String(e.qty),
      satuanTingkat: e.satuanTingkat,
    };
  }
  return state;
}

/**
 * Pengaturan saldo awal stok — antar-muka untuk membentuk jurnal pembuka
 * "Saldo awal persediaan" di tanggal awal periode operasional. Setiap baris
 * = satu barang fisik; setiap kolom = satu gudang. User mengisi qty di
 * satuan pilihan + satu nilai per satuan terkecil per barang. Saat disimpan
 * backend membuat satu jurnal kompound:
 *
 *   D Akun persediaan   total
 *      K Historical Balance   total
 *
 * Sekaligus menulis `stok_mutasi` jenis STOK_AWAL untuk tiap cell, sehingga
 * modul HPP otomatis mengakuisisi nilai pembuka tersebut.
 *
 * Idempoten: re-simpan akan mereverse semua perubahan sebelumnya, lalu
 * menulis ulang dari payload terbaru.
 */
export function PengaturanStokAwalPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { items: allBarang, loading: barangLoading } = useBarangJasa();
  const { items: gudangs, loading: gudangLoading } = useGudang();

  const [snapshot, setSnapshot] = useState<StokAwalSnapshot | null>(null);
  const [inputs, setInputs] = useState<InputState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  /** True = form unlock untuk editing. False = read-only (terkunci). */
  const [editing, setEditing] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const isAdmin = session?.isAdmin ?? false;
  const allowedKeys = useMemo(
    () => new Set(session?.halamanAkses ?? []),
    [session?.halamanAkses],
  );
  const punyaHakUbah = isAdmin || allowedKeys.has(AKSES_UBAH_STOK_AWAL);

  const barangFisik = useMemo(
    () =>
      [...allBarang]
        .filter((b) => b.tipe === "Barang")
        .sort((a, b) => a.kode.localeCompare(b.kode, "id")),
    [allBarang],
  );
  const gudangSorted = useMemo(
    () => [...gudangs].sort((a, b) => a.kode.localeCompare(b.kode, "id")),
    [gudangs],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await stokAwalGet();
      setSnapshot(snap);
      if (barangFisik.length > 0 && gudangSorted.length > 0) {
        setInputs(buildInitialInputs(snap, barangFisik, gudangSorted));
      }
      // First-time setup → langsung editing. Kalau sudah pernah → kunci.
      setEditing(snap.entries.length === 0);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [barangFisik, gudangSorted]);

  // Re-build inputs ketika master loaded (snapshot mungkin sudah ada dari
  // refresh sebelumnya, tapi inputs kosong karena master belum tersedia).
  useEffect(() => {
    if (snapshot && barangFisik.length > 0 && gudangSorted.length > 0) {
      setInputs((prev) =>
        Object.keys(prev).length === 0
          ? buildInitialInputs(snapshot, barangFisik, gudangSorted)
          : prev,
      );
    }
  }, [snapshot, barangFisik, gudangSorted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return barangFisik;
    return barangFisik.filter((b) => {
      const hay = `${b.kode} ${b.nama} ${b.satuan}`.toLowerCase();
      return hay.includes(q);
    });
  }, [barangFisik, query]);

  // Subtotal per baris + total — dihitung dari semua barang (bukan hanya
  // hasil filter), supaya nilai tidak hilang saat user search.
  const { rowSubtotals, total, rowsBerisi } = useMemo(() => {
    const subs: Record<string, number> = {};
    let t = 0;
    let count = 0;
    for (const b of barangFisik) {
      const row = inputs[b.kode];
      if (!row) {
        subs[b.kode] = 0;
        continue;
      }
      const nilai = parseRupiahInput(row.nilaiText);
      let sub = 0;
      let punyaQty = false;
      for (const g of gudangSorted) {
        const cell = row.cells[g.kode];
        if (!cell) continue;
        const qty = parseQtyInput(cell.qtyText);
        if (qty > 0) {
          punyaQty = true;
          const qtySmallest = qtyToSatuanTerkecil(b, cell.satuanTingkat, qty);
          sub += qtySmallest * nilai;
        }
      }
      subs[b.kode] = sub;
      if (punyaQty) count += 1;
      t += sub;
    }
    return { rowSubtotals: subs, total: t, rowsBerisi: count };
  }, [barangFisik, gudangSorted, inputs]);

  const awalPeriode = snapshot?.awalPeriode ?? null;
  const persediaanKode = snapshot?.akunPersediaanKode ?? null;
  const persediaanNama = snapshot?.akunPersediaanNama ?? null;
  const hbKode = snapshot?.akunHistoricalBalanceKode ?? null;
  const hbNama = snapshot?.akunHistoricalBalanceNama ?? null;
  const sudahPernahDiset = (snapshot?.entries.length ?? 0) > 0;

  const prasyaratSiap =
    Boolean(awalPeriode) && Boolean(persediaanKode) && Boolean(hbKode);

  const handleCellQty = useCallback(
    (barangKode: string, gudangKode: string, value: string) => {
      setInputs((prev) => {
        const row = prev[barangKode];
        if (!row) return prev;
        const oldCell = row.cells[gudangKode];
        if (!oldCell) return prev;
        const nextRow: RowInput = {
          ...row,
          cells: {
            ...row.cells,
            [gudangKode]: { ...oldCell, qtyText: value },
          },
        };
        return { ...prev, [barangKode]: nextRow };
      });
      setHint(null);
      setError(null);
    },
    [],
  );

  const handleCellSatuan = useCallback(
    (barangKode: string, gudangKode: string, tingkat: number) => {
      setInputs((prev) => {
        const row = prev[barangKode];
        if (!row) return prev;
        const oldCell = row.cells[gudangKode];
        if (!oldCell) return prev;
        const nextRow: RowInput = {
          ...row,
          cells: {
            ...row.cells,
            [gudangKode]: { ...oldCell, satuanTingkat: tingkat },
          },
        };
        return { ...prev, [barangKode]: nextRow };
      });
      setHint(null);
      setError(null);
    },
    [],
  );

  const handleNilai = useCallback((barangKode: string, value: string) => {
    setInputs((prev) => {
      const row = prev[barangKode];
      if (!row) return prev;
      return { ...prev, [barangKode]: { ...row, nilaiText: value } };
    });
    setHint(null);
    setError(null);
  }, []);

  function kosongkanSemua() {
    setInputs((prev) => {
      const next: InputState = {};
      for (const k of Object.keys(prev)) {
        const row = prev[k]!;
        const cells: Record<string, CellInput> = {};
        for (const gk of Object.keys(row.cells)) {
          cells[gk] = { qtyText: "", satuanTingkat: row.cells[gk]!.satuanTingkat };
        }
        next[k] = { nilaiText: "", cells };
      }
      return next;
    });
    setHint(null);
    setError(null);
  }

  function handleCancelEdit() {
    if (snapshot) {
      setInputs(buildInitialInputs(snapshot, barangFisik, gudangSorted));
    }
    setEditing(false);
    setError(null);
    setHint(null);
  }

  function handleRequestUnlock() {
    if (!punyaHakUbah) {
      setError(
        "Anda tidak memiliki hak akses untuk mengubah saldo stok awal. Hubungi administrator.",
      );
      return;
    }
    setPasswordModalOpen(true);
  }

  function handlePasswordConfirmed() {
    setPasswordModalOpen(false);
    setEditing(true);
    setError(null);
    setHint("Kunci dibuka. Anda dapat mengubah saldo stok awal.");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);
    if (!prasyaratSiap) {
      setError("Prasyarat belum lengkap (lihat banner di atas).");
      return;
    }
    const entries: StokAwalEntryInput[] = [];
    for (const b of barangFisik) {
      const row = inputs[b.kode];
      if (!row) continue;
      const nilai = parseRupiahInput(row.nilaiText);
      let punyaQty = false;
      for (const g of gudangSorted) {
        const cell = row.cells[g.kode];
        if (!cell) continue;
        const qty = parseQtyInput(cell.qtyText);
        if (qty <= 0) continue;
        punyaQty = true;
        entries.push({
          barangKode: b.kode,
          gudangKode: g.kode,
          qty,
          satuanTingkat: cell.satuanTingkat,
          nilaiPerUnit: nilai,
        });
      }
      if (punyaQty && nilai <= 0) {
        setError(
          `Barang ${b.kode} sudah punya qty awal — nilai per ${getSatuanStokBarang(b)} harus > 0.`,
        );
        return;
      }
    }
    setSaving(true);
    try {
      const updated = await stokAwalSet({ entries });
      setSnapshot(updated);
      setInputs(buildInitialInputs(updated, barangFisik, gudangSorted));
      // Auto-kunci kembali setelah simpan sukses (kalau ada entry).
      setEditing(updated.entries.length === 0);
      setHint(
        updated.entries.length > 0
          ? `Saldo awal stok tersimpan sebagai jurnal pembuka per ${formatTanggalLokal(
              updated.tanggalJurnal,
            )}. Total nilai persediaan ${formatRupiah(updated.totalNilai)}. Form dikunci kembali — gunakan tombol Ubah untuk membuka.`
          : "Semua nilai 0 — jurnal saldo awal stok dihapus.",
      );
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const masterLoading = barangLoading || gudangLoading;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <Link
          to="/barang-jasa"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke barang & jasa
        </Link>
        <PageHeader
          title="Pengaturan stok awal"
          description="Tentukan saldo persediaan pembuka per barang & gudang. Saat disimpan, sistem otomatis mencatat jurnal pembuka pada tanggal awal periode operasional dengan lawan akun Historical Balance, sekaligus menginisialisasi HPP rata-rata dari saldo awal."
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
      {hint ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {hint}
        </div>
      ) : null}

      {loading || masterLoading ? (
        <Card className="p-6 text-sm text-zinc-500">
          Memuat pengaturan stok awal…
        </Card>
      ) : (
        <>
          {/* Prasyarat */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Prasyarat</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Tiga pengaturan ini harus terisi sebelum saldo awal stok bisa
              disimpan.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                {awalPeriode ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden
                  />
                )}
                <span className="flex-1">
                  <span className="font-medium text-zinc-900">
                    Tanggal awal periode operasional:
                  </span>{" "}
                  {awalPeriode ? (
                    <strong className="text-emerald-700">
                      {formatTanggalLokal(awalPeriode)}
                    </strong>
                  ) : (
                    <button
                      type="button"
                      className="cursor-pointer font-semibold text-brand-700 hover:underline"
                      onClick={() => navigate("/pengaturan?tab=operasional")}
                    >
                      Belum diset — atur di Pengaturan → Operasional
                    </button>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                {persediaanKode ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden
                  />
                )}
                <span className="flex-1">
                  <span className="font-medium text-zinc-900">
                    Akun Persediaan (Pembelian / inventori):
                  </span>{" "}
                  {persediaanKode ? (
                    <strong className="text-emerald-700">
                      {persediaanKode} —{" "}
                      {persediaanNama || "(nama tidak ditemukan)"}
                    </strong>
                  ) : (
                    <button
                      type="button"
                      className="cursor-pointer font-semibold text-brand-700 hover:underline"
                      onClick={() =>
                        navigate("/keuangan/konfigurasi-akun-jurnal", {
                          state: {
                            from: "/barang-jasa/atur-stok-awal",
                            label: "Pengaturan stok awal",
                          },
                        })
                      }
                    >
                      Belum diset — atur di Konfigurasi akun jurnal
                    </button>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2">
                {hbKode ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                    aria-hidden
                  />
                )}
                <span className="flex-1">
                  <span className="font-medium text-zinc-900">
                    Akun Historical Balance:
                  </span>{" "}
                  {hbKode ? (
                    <strong className="text-emerald-700">
                      {hbKode} — {hbNama || "(nama tidak ditemukan)"}
                    </strong>
                  ) : (
                    <button
                      type="button"
                      className="cursor-pointer font-semibold text-brand-700 hover:underline"
                      onClick={() =>
                        navigate("/keuangan/konfigurasi-akun-jurnal", {
                          state: {
                            from: "/barang-jasa/atur-stok-awal",
                            label: "Pengaturan stok awal",
                          },
                        })
                      }
                    >
                      Belum diset — atur di Konfigurasi akun jurnal
                    </button>
                  )}
                </span>
              </li>
            </ul>
          </Card>

          {prasyaratSiap ? (
            <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Bagaimana jurnal terbentuk</p>
                <p className="mt-0.5">
                  Setiap baris dengan qty &gt; 0 akan tercatat sebagai mutasi
                  stok pembuka di gudang masing-masing. Total nilai (Σ
                  qty&times;nilai) menjadi <strong>D {persediaanNama || persediaanKode}</strong>{" "}
                  dengan lawan <strong>K {hbNama || hbKode}</strong> di
                  tanggal <strong>{formatTanggalLokal(awalPeriode)}</strong>.
                  Re-simpan akan <strong>menggantikan</strong> data lama (mutasi
                  &amp; jurnal di-reverse otomatis).
                </p>
              </div>
            </div>
          ) : null}

          {/* Banner kunci — muncul saat sudah pernah disetel dan masih
              terkunci. */}
          {sudahPernahDiset && !editing ? (
            <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-700">
              <ShieldAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
                aria-hidden
              />
              <div className="flex-1">
                <p className="font-semibold text-zinc-800">
                  Saldo stok awal dikunci
                </p>
                <p className="mt-0.5">
                  Untuk melindungi konsistensi pembukuan &amp; HPP, perubahan
                  setelah ditetapkan butuh konfirmasi kata sandi.{" "}
                  {!punyaHakUbah ? (
                    <span className="font-medium text-rose-700">
                      Hak akses ini belum diberikan kepada Anda.
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          ) : null}

          {/* Grid input */}
          <Card className="p-0">
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Saldo awal per barang &amp; gudang
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Isi qty fisik di tiap gudang serta nilai per satuan terkecil
                  per{" "}
                  <strong className="text-zinc-700">
                    {awalPeriode ? formatTanggalLokal(awalPeriode) : "—"}
                  </strong>
                  .
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari barang…"
                    className="w-56 rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                {barangFisik.length > 0 && editing ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={kosongkanSemua}
                  >
                    <Trash className="h-4 w-4" aria-hidden />
                    Kosongkan semua
                  </Button>
                ) : null}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {barangFisik.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-zinc-500">
                  Belum ada barang tipe fisik. Tambahkan barang lebih dulu di
                  halaman Barang &amp; jasa.
                </div>
              ) : gudangSorted.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-zinc-500">
                  Belum ada gudang. Tambahkan gudang lebih dulu di Manajemen →
                  Gudang.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        <th className="sticky left-0 z-10 bg-zinc-50/90 px-3 py-3">
                          Barang
                        </th>
                        <th className="px-3 py-3 text-right">
                          Nilai / satuan terkecil
                        </th>
                        {gudangSorted.map((g) => (
                          <th key={g.kode} className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <Warehouse
                                className="h-3.5 w-3.5 text-zinc-400"
                                aria-hidden
                              />
                              <span className="truncate">
                                {g.kode} — {g.nama}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th className="px-3 py-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3 + gudangSorted.length}
                            className="px-3 py-10 text-center text-sm text-zinc-500"
                          >
                            Tidak ada barang yang cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((b) => {
                          const row = inputs[b.kode];
                          if (!row) return null;
                          const satuanOpts = getSatuanPilihanOptions(b);
                          const satuanStok = getSatuanStokBarang(b);
                          const sub = rowSubtotals[b.kode] ?? 0;
                          const nilai = parseRupiahInput(row.nilaiText);
                          return (
                            <tr
                              key={b.kode}
                              className="bg-white hover:bg-zinc-50/50"
                            >
                              <td className="sticky left-0 z-10 bg-white px-3 py-2 align-top">
                                <div className="flex items-start gap-2">
                                  <PackageOpen
                                    className="mt-0.5 h-4 w-4 text-zinc-400"
                                    aria-hidden
                                  />
                                  <div>
                                    <div className="font-mono text-xs font-semibold text-brand-700">
                                      {b.kode}
                                    </div>
                                    <div className="text-sm font-medium text-zinc-900">
                                      {b.nama}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                      Stok dalam {satuanStok}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="flex flex-col items-end gap-0.5">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={row.nilaiText}
                                      onChange={(e) =>
                                        handleNilai(b.kode, e.target.value)
                                      }
                                      placeholder="0"
                                      disabled={
                                        saving || !prasyaratSiap || !editing
                                      }
                                      aria-readonly={!editing}
                                      className={`w-36 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-right text-sm tabular-nums text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50 ${!editing ? "pr-8" : ""}`}
                                    />
                                    {!editing && sudahPernahDiset ? (
                                      <Lock
                                        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                                        aria-hidden
                                      />
                                    ) : null}
                                  </div>
                                  <span
                                    className={`text-xs tabular-nums ${
                                      nilai > 0
                                        ? "text-emerald-700"
                                        : "text-zinc-400"
                                    }`}
                                  >
                                    /{satuanStok}
                                  </span>
                                </div>
                              </td>
                              {gudangSorted.map((g) => {
                                const cell = row.cells[g.kode];
                                if (!cell) return <td key={g.kode} />;
                                const qty = parseQtyInput(cell.qtyText);
                                const qtySmallest =
                                  qty > 0
                                    ? qtyToSatuanTerkecil(
                                        b,
                                        cell.satuanTingkat,
                                        qty,
                                      )
                                    : 0;
                                const showKonversi =
                                  qty > 0 &&
                                  satuanOpts.length > 1 &&
                                  qtySmallest !== qty;
                                return (
                                  <td
                                    key={g.kode}
                                    className="px-3 py-2 align-top"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <TokoInput
                                        type="number"
                                        value={cell.qtyText}
                                        onChange={(e) =>
                                          handleCellQty(
                                            b.kode,
                                            g.kode,
                                            e.target.value,
                                          )
                                        }
                                        placeholder="0"
                                        disabled={
                                          saving || !prasyaratSiap || !editing
                                        }
                                      />
                                      <TokoSelect
                                        value={cell.satuanTingkat}
                                        onChange={(e) =>
                                          handleCellSatuan(
                                            b.kode,
                                            g.kode,
                                            Number(e.target.value),
                                          )
                                        }
                                        disabled={
                                          saving ||
                                          !prasyaratSiap ||
                                          !editing ||
                                          satuanOpts.length <= 1
                                        }
                                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-zinc-50"
                                      >
                                        {satuanOpts.map((o) => (
                                          <option
                                            key={o.tingkat}
                                            value={o.tingkat}
                                          >
                                            {o.nama}
                                          </option>
                                        ))}
                                      </TokoSelect>
                                    </div>
                                    {showKonversi ? (
                                      <div className="mt-1 text-right text-[11px] text-zinc-500">
                                        ≈ {formatAngka(qtySmallest)} {satuanStok}
                                      </div>
                                    ) : null}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-right align-top text-sm tabular-nums font-medium text-zinc-900">
                                {sub > 0 ? formatRupiah(sub) : "—"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-200 bg-zinc-50/60 text-sm font-semibold text-zinc-900">
                        <td
                          colSpan={2 + gudangSorted.length}
                          className="px-3 py-2.5 text-right"
                        >
                          Total saldo awal persediaan
                          <span className="ml-1 text-xs font-normal text-zinc-500">
                            (D {persediaanNama || persediaanKode || "Persediaan"} /
                            K {hbNama || hbKode || "Historical Balance"})
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatRupiah(total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {sudahPernahDiset ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Stok awal sudah pernah disetel
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      Belum pernah disetel
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                    {rowsBerisi} barang akan dicatat
                  </span>
                  {snapshot?.jurnalId ? (
                    <Link
                      to={`/keuangan/jurnal-umum?jurnal=${snapshot.jurnalId}`}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <BookText className="h-3.5 w-3.5" aria-hidden />
                      Lihat jurnal aktif (#{snapshot.jurnalId})
                    </Link>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button
                        type="submit"
                        disabled={
                          saving ||
                          !prasyaratSiap ||
                          (rowsBerisi === 0 && !sudahPernahDiset)
                        }
                      >
                        <PackageOpen className="h-4 w-4" aria-hidden />
                        {saving ? "Menyimpan…" : "Simpan saldo awal stok"}
                      </Button>
                      {sudahPernahDiset ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          Batal
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRequestUnlock}
                      disabled={!punyaHakUbah}
                      title={
                        punyaHakUbah
                          ? "Buka kunci untuk mengubah saldo awal stok"
                          : "Anda tidak punya hak akses untuk aksi ini"
                      }
                    >
                      <Unlock className="h-4 w-4" aria-hidden />
                      Ubah
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Card>
        </>
      )}

      <PasswordConfirmModal
        open={passwordModalOpen}
        title="Buka kunci saldo stok awal"
        description="Anda akan mengubah saldo stok awal yang sudah ditetapkan. Re-simpan akan mereverse mutasi dan jurnal pembuka lama. Masukkan kata sandi untuk membuka kunci."
        confirmLabel="Buka kunci"
        confirmVariant="danger"
        onClose={() => setPasswordModalOpen(false)}
        onConfirmed={handlePasswordConfirmed}
      />
    </div>
  );
}
