import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, RefreshCcw, Sheet, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokoInput } from "@/components/ui/TokoInput";
import type { LabaRugiAkunRow, LabaRugiSnapshot } from "@/data/keuangan";
import { labelLabaRugiSeksi } from "@/data/keuangan";
import {
  OPERASIONAL_KONFIGURASI_DEFAULT,
  type OperasionalKonfigurasi,
} from "@/data/operasionalKonfigurasi";
import { operasionalKonfigurasiGet } from "@/features/pengaturan/operasionalKonfigurasiInvoke";
import { labaRugiGet } from "@/features/keuangan/labaRugiInvoke";
import { formatRupiah } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";
import { useXlsxExport } from "@/lib/useXlsxExport";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Default tanggal mulai: awal periode operasional bila ada, else awal bulan ini. */
function resolveDefaultDari(awalPeriode: string | null): string {
  if (awalPeriode && awalPeriode.length === 10) return awalPeriode;
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

/** Default tanggal akhir: hari ini. */
function resolveDefaultSampai(): string {
  return toIsoDate(new Date());
}

const SEKSI_URUTAN: Array<{ key: "PENDAPATAN" | "HPP" | "BEBAN"; label: string; sign: 1 | -1 }> = [
  { key: "PENDAPATAN", label: "Pendapatan", sign: 1 },
  { key: "HPP", label: "Harga pokok penjualan", sign: -1 },
  { key: "BEBAN", label: "Beban operasional", sign: -1 },
];

/**
 * Format nilai untuk display laporan: negatif dibungkus tanda kurung
 * (konvensi akuntansi). Nol selalu ditampilkan apa adanya.
 */
function formatAkuntansi(n: number): string {
  if (n < 0) return `(${formatRupiah(Math.abs(n))})`;
  return formatRupiah(n);
}

function MoneyCell({
  nilai,
  className = "",
  bold = false,
}: {
  nilai: number;
  className?: string;
  bold?: boolean;
}) {
  const negatif = nilai < 0;
  return (
    <span
      className={`tabular-nums ${bold ? "font-semibold" : "font-medium"} ${
        negatif ? "text-rose-700" : "text-zinc-900"
      } ${className}`}
    >
      {formatAkuntansi(nilai)}
    </span>
  );
}

/**
 * Halaman Laporan Laba Rugi (Income Statement). Menampilkan pendapatan,
 * HPP, beban, laba kotor, dan laba/rugi bersih untuk satu rentang tanggal.
 *
 * Klasifikasi akun memakai `kelompok_lr` (PENDAPATAN/HPP/BEBAN) bila di-set,
 * else fallback ke `kelompok` standar (PENDAPATAN/BIAYA).
 */
export function LaporanLabaRugiPage() {
  const [operasional, setOperasional] = useState<OperasionalKonfigurasi>(
    OPERASIONAL_KONFIGURASI_DEFAULT,
  );
  const [tanggalDari, setTanggalDari] = useState("");
  const [tanggalSampai, setTanggalSampai] = useState(resolveDefaultSampai);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const [snapshot, setSnapshot] = useState<LabaRugiSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { exporting, exportNow } = useXlsxExport();

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return true;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

  // Initial prasyarat: ambil awalPeriode untuk default tanggal mulai.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const konf = await operasionalKonfigurasiGet();
        if (cancelled) return;
        setOperasional(konf);
        setTanggalDari(resolveDefaultDari(konf.awalPeriode));
        setDefaultsApplied(true);
      } catch (e) {
        if (cancelled) return;
        setError(tauriErrorMessage(e));
        setTanggalDari(resolveDefaultDari(null));
        setDefaultsApplied(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (rentangInvalid) {
      setError("Tanggal akhir tidak boleh sebelum tanggal mulai.");
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await labaRugiGet({
        tanggalDari: tanggalDari.trim(),
        tanggalSampai: tanggalSampai.trim(),
      });
      setSnapshot(snap);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [rentangInvalid, tanggalDari, tanggalSampai]);

  useEffect(() => {
    if (!defaultsApplied) return;
    void fetchSnapshot();
  }, [defaultsApplied, fetchSnapshot]);

  /** Pisah baris per seksi sesuai urutan tampilan. */
  const seksiRows = useMemo(() => {
    const acc: Record<"PENDAPATAN" | "HPP" | "BEBAN", LabaRugiAkunRow[]> = {
      PENDAPATAN: [],
      HPP: [],
      BEBAN: [],
    };
    if (snapshot) {
      for (const row of snapshot.akun) {
        const key = row.seksi as "PENDAPATAN" | "HPP" | "BEBAN";
        if (acc[key]) acc[key].push(row);
      }
    }
    return acc;
  }, [snapshot]);

  const handleExport = useCallback(async () => {
    if (!snapshot || rentangInvalid) return;

    type ExportRow = {
      kind: "section" | "akun" | "subtotal" | "result";
      label: string;
      kode: string;
      seksi: string;
      nilai: number | null;
    };

    const flat: ExportRow[] = [];
    for (const s of SEKSI_URUTAN) {
      const rows = seksiRows[s.key];
      flat.push({ kind: "section", label: s.label, kode: "", seksi: s.key, nilai: null });
      for (const r of rows) {
        flat.push({
          kind: "akun",
          label: r.akunNama,
          kode: r.akunKode,
          seksi: s.key,
          nilai: r.nilai,
        });
      }
      const subtotal =
        s.key === "PENDAPATAN"
          ? snapshot.totalPendapatan
          : s.key === "HPP"
            ? snapshot.totalHpp
            : snapshot.totalBeban;
      flat.push({
        kind: "subtotal",
        label: `Subtotal ${s.label}`,
        kode: "",
        seksi: s.key,
        nilai: subtotal,
      });
      if (s.key === "HPP") {
        flat.push({
          kind: "result",
          label: "Laba kotor (Pendapatan − HPP)",
          kode: "",
          seksi: "",
          nilai: snapshot.labaKotor,
        });
      }
    }
    flat.push({
      kind: "result",
      label: "Laba / Rugi bersih",
      kode: "",
      seksi: "",
      nilai: snapshot.labaBersih,
    });

    await exportNow<ExportRow>({
      fileName: `laba_rugi_${snapshot.tanggalDari}_sd_${snapshot.tanggalSampai}`,
      sheetName: "Laba rugi",
      title: "Laporan Laba Rugi",
      meta: [
        { label: "Periode", value: `${snapshot.tanggalDari} – ${snapshot.tanggalSampai}` },
        { label: "Total pendapatan", value: formatRupiah(snapshot.totalPendapatan) },
        { label: "Total HPP", value: formatRupiah(snapshot.totalHpp) },
        { label: "Laba kotor", value: formatRupiah(snapshot.labaKotor) },
        { label: "Total beban", value: formatRupiah(snapshot.totalBeban) },
        { label: "Laba / rugi bersih", value: formatRupiah(snapshot.labaBersih) },
      ],
      columns: [
        { header: "Seksi", value: (r) => labelLabaRugiSeksi(r.seksi), type: "text", width: 22 },
        { header: "Kode akun", value: (r) => r.kode, type: "text", width: 14 },
        { header: "Uraian", value: (r) => r.label, type: "text", width: 40 },
        {
          header: "Nilai",
          value: (r) => (r.nilai == null ? "" : r.nilai),
          type: "currency",
          width: 18,
        },
      ],
      data: flat,
    });
  }, [exportNow, rentangInvalid, seksiRows, snapshot]);

  const summary = snapshot;
  const labaPositif = (summary?.labaBersih ?? 0) >= 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Laporan laba rugi"
        description="Ringkasan pendapatan, HPP, dan beban operasional pada periode tertentu — laba/rugi kotor & bersih."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => void fetchSnapshot()}
            disabled={loading || rentangInvalid}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            {loading ? "Memuat…" : "Refresh"}
          </Button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-5">
        <div className="border-b border-zinc-100 pb-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-900">Filter periode</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Tentukan rentang tanggal laporan.
            {operasional.awalPeriode
              ? ` Awal periode operasional: ${operasional.awalPeriode}.`
              : null}
          </p>
        </div>

        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="lr-dari" className="block text-sm font-medium text-zinc-700">
                Tanggal mulai
              </label>
              <TokoInput
                id="lr-dari"
                type="date"
                value={tanggalDari}
                onChange={(e) => setTanggalDari(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="lr-sampai" className="block text-sm font-medium text-zinc-700">
                Tanggal akhir
              </label>
              <TokoInput
                id="lr-sampai"
                type="date"
                value={tanggalSampai}
                min={tanggalDari}
                onChange={(e) => setTanggalSampai(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-2 self-end">
            <Button
              type="button"
              variant="secondary"
              className="h-9 self-end"
              disabled={loading || rentangInvalid}
              onClick={() => void fetchSnapshot()}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {loading ? "Memuat…" : "Terapkan filter"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 self-end"
              disabled={loading || exporting || rentangInvalid || !snapshot}
              onClick={() => void handleExport()}
              title={
                !snapshot
                  ? "Belum ada data untuk diexport"
                  : "Export laporan ke .xlsx"
              }
            >
              <Sheet className="h-4 w-4" aria-hidden />
              {exporting ? "Mengexport…" : "Export XLSX"}
            </Button>
          </div>
        </div>
        {rentangInvalid ? (
          <p className="mt-2 text-sm text-amber-700">
            Tanggal akhir harus sama atau setelah tanggal mulai.
          </p>
        ) : null}
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Pendapatan"
          tone="positive"
          value={formatRupiah(summary?.totalPendapatan ?? 0)}
        />
        <SummaryCard
          label="HPP"
          tone="negative"
          value={formatRupiah(summary?.totalHpp ?? 0)}
        />
        <SummaryCard
          label="Beban"
          tone="negative"
          value={formatRupiah(summary?.totalBeban ?? 0)}
        />
        <SummaryCard
          label="Laba / Rugi bersih"
          tone={labaPositif ? "positive" : "loss"}
          hint={labaPositif ? "Laba" : "Rugi"}
          value={formatAkuntansi(summary?.labaBersih ?? 0)}
          icon={labaPositif ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Rincian laba rugi</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Nilai negatif ditampilkan dalam tanda kurung sesuai konvensi akuntansi.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Kode</th>
                <th className="px-5 py-3">Uraian</th>
                <th className="px-5 py-3 text-right">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat laporan…
                  </td>
                </tr>
              ) : !snapshot ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Belum ada data — terapkan filter terlebih dahulu.
                  </td>
                </tr>
              ) : (
                <>
                  {SEKSI_URUTAN.map((s) => {
                    const rows = seksiRows[s.key];
                    const subtotal =
                      s.key === "PENDAPATAN"
                        ? snapshot.totalPendapatan
                        : s.key === "HPP"
                          ? snapshot.totalHpp
                          : snapshot.totalBeban;
                    return (
                      <SeksiBlock
                        key={s.key}
                        label={s.label}
                        rows={rows}
                        subtotal={subtotal}
                        appendLabaKotor={s.key === "HPP" ? snapshot.labaKotor : undefined}
                      />
                    );
                  })}
                  <tr className="border-t-2 border-zinc-300 bg-brand-50/40">
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4 text-base font-bold text-zinc-900">
                      Laba / Rugi bersih
                    </td>
                    <td className="px-5 py-4 text-right text-base">
                      <MoneyCell nilai={snapshot.labaBersih} bold />
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SeksiBlock({
  label,
  rows,
  subtotal,
  appendLabaKotor,
}: {
  label: string;
  rows: LabaRugiAkunRow[];
  subtotal: number;
  /** Bila diisi, tampilkan baris "Laba kotor" di bawah subtotal HPP. */
  appendLabaKotor?: number;
}) {
  return (
    <>
      <tr className="bg-zinc-50/70">
        <td colSpan={3} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          {label}
        </td>
      </tr>
      {rows.length === 0 ? (
        <tr>
          <td className="px-5 py-3" />
          <td className="px-5 py-3 italic text-zinc-400">— Tidak ada mutasi pada periode ini —</td>
          <td className="px-5 py-3 text-right">
            <MoneyCell nilai={0} />
          </td>
        </tr>
      ) : (
        rows.map((r) => (
          <tr key={r.akunKode} className="bg-white hover:bg-zinc-50/50">
            <td className="px-5 py-2.5 font-mono text-xs text-brand-800">{r.akunKode}</td>
            <td className="px-5 py-2.5 text-zinc-700">{r.akunNama}</td>
            <td className="px-5 py-2.5 text-right">
              <MoneyCell nilai={r.nilai} />
            </td>
          </tr>
        ))
      )}
      <tr className="border-t border-zinc-200 bg-zinc-50/40">
        <td className="px-5 py-2.5" />
        <td className="px-5 py-2.5 text-sm font-semibold text-zinc-800">Subtotal {label}</td>
        <td className="px-5 py-2.5 text-right">
          <MoneyCell nilai={subtotal} bold />
        </td>
      </tr>
      {appendLabaKotor !== undefined ? (
        <tr className="border-t border-zinc-200 bg-emerald-50/40">
          <td className="px-5 py-3" />
          <td className="px-5 py-3 text-sm font-semibold text-emerald-900">
            Laba kotor
            <span className="ml-1 text-xs font-normal text-emerald-700">
              (Pendapatan − HPP)
            </span>
          </td>
          <td className="px-5 py-3 text-right">
            <MoneyCell nilai={appendLabaKotor} bold className="text-emerald-900" />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "positive" | "negative" | "loss" | "neutral";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "loss"
        ? "text-rose-700"
        : tone === "negative"
          ? "text-zinc-700"
          : "text-zinc-900";
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {icon ? <span className={toneClass}>{icon}</span> : null}
        {label}
      </span>
      <span className={`text-lg font-semibold tabular-nums ${toneClass}`}>{value}</span>
      {hint ? (
        <span className="text-[0.6875rem] uppercase tracking-wide text-zinc-400">{hint}</span>
      ) : null}
    </Card>
  );
}
