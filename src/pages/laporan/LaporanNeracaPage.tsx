import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCcw,
  Scale,
  Sheet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokoInput } from "@/components/ui/TokoInput";
import type { NeracaAkunRow, NeracaSnapshot } from "@/data/keuangan";
import {
  OPERASIONAL_KONFIGURASI_DEFAULT,
  type OperasionalKonfigurasi,
} from "@/data/operasionalKonfigurasi";
import { operasionalKonfigurasiGet } from "@/features/pengaturan/operasionalKonfigurasiInvoke";
import { neracaGet } from "@/features/keuangan/neracaInvoke";
import { formatRupiah, formatTanggalIso } from "@/lib/format";
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

function resolveDefaultTanggal(): string {
  return toIsoDate(new Date());
}

/**
 * Format nilai akuntansi: nilai negatif dibungkus tanda kurung sesuai
 * konvensi laporan keuangan.
 */
function formatAkuntansi(n: number): string {
  if (n < 0) return `(${formatRupiah(Math.abs(n))})`;
  return formatRupiah(n);
}

type RowAlign = "left" | "right";

function MoneyText({
  nilai,
  bold = false,
  className = "",
  align = "right",
}: {
  nilai: number;
  bold?: boolean;
  className?: string;
  align?: RowAlign;
}) {
  const negatif = nilai < 0;
  return (
    <span
      className={[
        "tabular-nums",
        bold ? "font-semibold" : "font-medium",
        negatif ? "text-rose-700" : "text-zinc-900",
        align === "right" ? "text-right" : "text-left",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {formatAkuntansi(nilai)}
    </span>
  );
}

/**
 * Halaman Laporan Neraca (Balance Sheet). Menampilkan posisi keuangan
 * (aktiva = hutang + modal) pada satu tanggal cutoff. Laba berjalan
 * period-to-date dihitung otomatis dari akun pendapatan/HPP/beban.
 */
export function LaporanNeracaPage() {
  const [operasional, setOperasional] = useState<OperasionalKonfigurasi>(
    OPERASIONAL_KONFIGURASI_DEFAULT,
  );
  const [tanggal, setTanggal] = useState<string>(resolveDefaultTanggal);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const [snapshot, setSnapshot] = useState<NeracaSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { exporting, exportNow } = useXlsxExport();

  const tanggalInvalid = useMemo(() => !tanggal || tanggal.length !== 10, [tanggal]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const konf = await operasionalKonfigurasiGet();
        if (cancelled) return;
        setOperasional(konf);
        setDefaultsApplied(true);
      } catch (e) {
        if (cancelled) return;
        setError(tauriErrorMessage(e));
        setDefaultsApplied(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (tanggalInvalid) {
      setError("Tanggal cutoff wajib diisi.");
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await neracaGet({ tanggal: tanggal.trim() });
      setSnapshot(snap);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [tanggal, tanggalInvalid]);

  useEffect(() => {
    if (!defaultsApplied) return;
    void fetchSnapshot();
  }, [defaultsApplied, fetchSnapshot]);

  const handleExport = useCallback(async () => {
    if (!snapshot || tanggalInvalid) return;

    type ExportRow = {
      kind: "section" | "akun" | "subtotal" | "result" | "spacer";
      sisi: "AKTIVA" | "PASIVA" | "";
      label: string;
      kode: string;
      nilai: number | null;
    };

    const flat: ExportRow[] = [];

    const pushSection = (
      sisi: "AKTIVA" | "PASIVA",
      title: string,
      rows: NeracaAkunRow[],
      subtotalLabel: string,
      subtotal: number,
    ) => {
      flat.push({ kind: "section", sisi, label: title, kode: "", nilai: null });
      if (rows.length === 0) {
        flat.push({
          kind: "akun",
          sisi,
          label: "— Tidak ada saldo —",
          kode: "",
          nilai: 0,
        });
      } else {
        for (const r of rows) {
          flat.push({
            kind: "akun",
            sisi,
            label: r.akunNama,
            kode: r.akunKode,
            nilai: r.saldo,
          });
        }
      }
      flat.push({
        kind: "subtotal",
        sisi,
        label: subtotalLabel,
        kode: "",
        nilai: subtotal,
      });
    };

    pushSection(
      "AKTIVA",
      "Aktiva lancar",
      snapshot.aktivaLancar,
      "Subtotal aktiva lancar",
      snapshot.totalAktivaLancar,
    );
    pushSection(
      "AKTIVA",
      "Aktiva tetap",
      snapshot.aktivaTetap,
      "Subtotal aktiva tetap",
      snapshot.totalAktivaTetap,
    );
    flat.push({
      kind: "result",
      sisi: "AKTIVA",
      label: "TOTAL AKTIVA",
      kode: "",
      nilai: snapshot.totalAktiva,
    });
    flat.push({ kind: "spacer", sisi: "", label: "", kode: "", nilai: null });

    pushSection(
      "PASIVA",
      "Hutang lancar",
      snapshot.hutangLancar,
      "Subtotal hutang lancar",
      snapshot.totalHutangLancar,
    );
    pushSection(
      "PASIVA",
      "Hutang jangka panjang",
      snapshot.hutangJangkaPanjang,
      "Subtotal hutang jangka panjang",
      snapshot.totalHutangJangkaPanjang,
    );
    flat.push({
      kind: "subtotal",
      sisi: "PASIVA",
      label: "Total hutang",
      kode: "",
      nilai: snapshot.totalHutang,
    });
    pushSection(
      "PASIVA",
      "Modal",
      snapshot.modal,
      "Subtotal modal (tercatat)",
      snapshot.totalModalTercatat,
    );
    flat.push({
      kind: "akun",
      sisi: "PASIVA",
      label: "Laba / rugi berjalan",
      kode: "",
      nilai: snapshot.labaBerjalan,
    });
    flat.push({
      kind: "subtotal",
      sisi: "PASIVA",
      label: "Total modal",
      kode: "",
      nilai: snapshot.totalModal,
    });
    flat.push({
      kind: "result",
      sisi: "PASIVA",
      label: "TOTAL PASIVA",
      kode: "",
      nilai: snapshot.totalPasiva,
    });

    await exportNow<ExportRow>({
      fileName: `neraca_${snapshot.tanggal}`,
      sheetName: "Neraca",
      title: `Laporan Neraca per ${formatTanggalIso(snapshot.tanggal)}`,
      meta: [
        { label: "Per tanggal", value: formatTanggalIso(snapshot.tanggal) },
        { label: "Total aktiva", value: formatRupiah(snapshot.totalAktiva) },
        { label: "Total hutang", value: formatRupiah(snapshot.totalHutang) },
        { label: "Total modal", value: formatRupiah(snapshot.totalModal) },
        { label: "Laba / rugi berjalan", value: formatRupiah(snapshot.labaBerjalan) },
        {
          label: "Selisih (aktiva − pasiva)",
          value: formatRupiah(snapshot.selisih),
        },
      ],
      columns: [
        { header: "Sisi", value: (r) => r.sisi, type: "text", width: 10 },
        { header: "Kode akun", value: (r) => r.kode, type: "text", width: 14 },
        { header: "Uraian", value: (r) => r.label, type: "text", width: 44 },
        {
          header: "Nilai",
          value: (r) => (r.nilai == null ? "" : r.nilai),
          type: "currency",
          width: 20,
        },
      ],
      data: flat,
    });
  }, [exportNow, snapshot, tanggalInvalid]);

  const summary = snapshot;
  const seimbang = (summary?.selisih ?? 0) === 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Laporan neraca"
        description="Posisi keuangan per tanggal tertentu — total aktiva harus seimbang dengan total kewajiban + modal."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => void fetchSnapshot()}
            disabled={loading || tanggalInvalid}
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
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
          <h2 className="text-sm font-semibold text-zinc-900">Filter</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Neraca menampilkan saldo akun aktiva, hutang, dan modal sampai dengan
            tanggal yang dipilih.
            {operasional.awalPeriode
              ? ` Awal periode operasional: ${operasional.awalPeriode}.`
              : null}
          </p>
        </div>

        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <label htmlFor="neraca-tanggal" className="block text-sm font-medium text-zinc-700">
              Per tanggal
            </label>
            <TokoInput
              id="neraca-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2 self-end">
            <Button
              type="button"
              variant="secondary"
              className="h-9 self-end"
              disabled={loading || tanggalInvalid}
              onClick={() => void fetchSnapshot()}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {loading ? "Memuat…" : "Terapkan"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 self-end"
              disabled={loading || exporting || tanggalInvalid || !snapshot}
              onClick={() => void handleExport()}
              title={!snapshot ? "Belum ada data untuk diexport" : "Export laporan ke .xlsx"}
            >
              <Sheet className="h-4 w-4" aria-hidden />
              {exporting ? "Mengexport…" : "Export XLSX"}
            </Button>
          </div>
        </div>
        {tanggalInvalid ? (
          <p className="mt-2 text-sm text-amber-700">Pilih tanggal cutoff terlebih dahulu.</p>
        ) : null}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total aktiva"
          value={formatRupiah(summary?.totalAktiva ?? 0)}
          tone="neutral"
        />
        <SummaryCard
          label="Total hutang"
          value={formatRupiah(summary?.totalHutang ?? 0)}
          tone="neutral"
        />
        <SummaryCard
          label="Total modal"
          value={formatRupiah(summary?.totalModal ?? 0)}
          tone="neutral"
          hint={
            summary && summary.labaBerjalan !== 0
              ? `Termasuk laba/rugi berjalan ${formatAkuntansi(summary.labaBerjalan)}`
              : undefined
          }
        />
        <SummaryCard
          label="Selisih"
          tone={seimbang ? "positive" : "loss"}
          icon={
            seimbang ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )
          }
          value={formatAkuntansi(summary?.selisih ?? 0)}
          hint={seimbang ? "Neraca seimbang" : "Tidak seimbang"}
        />
      </div>

      {loading && !snapshot ? (
        <Card className="py-12 text-center text-sm text-zinc-500">Memuat laporan neraca…</Card>
      ) : !snapshot ? (
        <Card className="py-12 text-center text-sm text-zinc-500">
          Belum ada data — pilih tanggal lalu klik &ldquo;Terapkan&rdquo;.
        </Card>
      ) : (
        <>
          {!seimbang ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Neraca belum seimbang</p>
                <p className="mt-0.5 text-xs leading-relaxed">
                  Selisih antara total aktiva dan total pasiva sebesar{" "}
                  <span className="font-mono font-semibold">
                    {formatAkuntansi(snapshot.selisih)}
                  </span>
                  . Ini biasanya terjadi karena ada saldo awal yang belum
                  diseimbangkan ke akun lawan (mis. <em>Historical Balance</em>),
                  atau jurnal pembuka belum lengkap. Periksa buku besar untuk
                  akun-akun saldo awal.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* ===== Sisi AKTIVA ===== */}
            <Card className="overflow-hidden p-0">
              <div className="border-b border-zinc-100 bg-sky-50/50 px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-900">
                  <Scale className="h-4 w-4" aria-hidden />
                  Aktiva
                </h2>
                <p className="mt-0.5 text-xs text-sky-800/70">
                  Aset yang dimiliki perusahaan per {formatTanggalIso(snapshot.tanggal)}.
                </p>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="w-24 px-5 py-2.5">Kode</th>
                    <th className="px-5 py-2.5">Uraian</th>
                    <th className="w-44 px-5 py-2.5 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <NeracaSeksiBlock
                    label="Aktiva lancar"
                    rows={snapshot.aktivaLancar}
                    subtotalLabel="Subtotal aktiva lancar"
                    subtotal={snapshot.totalAktivaLancar}
                    accent="sky"
                  />
                  <NeracaSeksiBlock
                    label="Aktiva tetap"
                    rows={snapshot.aktivaTetap}
                    subtotalLabel="Subtotal aktiva tetap"
                    subtotal={snapshot.totalAktivaTetap}
                    accent="sky"
                  />
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-sky-300 bg-sky-50">
                    <td className="px-5 py-3.5" />
                    <td className="px-5 py-3.5 text-base font-bold text-sky-900">
                      TOTAL AKTIVA
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <MoneyText
                        nilai={snapshot.totalAktiva}
                        bold
                        className="text-sky-900"
                      />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Card>

            {/* ===== Sisi PASIVA ===== */}
            <Card className="overflow-hidden p-0">
              <div className="border-b border-zinc-100 bg-violet-50/50 px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                  <Scale className="h-4 w-4" aria-hidden />
                  Pasiva (kewajiban + modal)
                </h2>
                <p className="mt-0.5 text-xs text-violet-800/70">
                  Sumber dana yang membiayai aset.
                </p>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="w-24 px-5 py-2.5">Kode</th>
                    <th className="px-5 py-2.5">Uraian</th>
                    <th className="w-44 px-5 py-2.5 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <NeracaSeksiBlock
                    label="Hutang lancar"
                    rows={snapshot.hutangLancar}
                    subtotalLabel="Subtotal hutang lancar"
                    subtotal={snapshot.totalHutangLancar}
                    accent="violet"
                  />
                  <NeracaSeksiBlock
                    label="Hutang jangka panjang"
                    rows={snapshot.hutangJangkaPanjang}
                    subtotalLabel="Subtotal hutang jangka panjang"
                    subtotal={snapshot.totalHutangJangkaPanjang}
                    accent="violet"
                  />
                  <tr className="border-t border-violet-200 bg-violet-50/40">
                    <td className="px-5 py-2.5" />
                    <td className="px-5 py-2.5 text-sm font-semibold text-violet-900">
                      Total hutang
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <MoneyText nilai={snapshot.totalHutang} bold className="text-violet-900" />
                    </td>
                  </tr>
                  <NeracaSeksiBlock
                    label="Modal"
                    rows={snapshot.modal}
                    subtotalLabel="Modal tercatat"
                    subtotal={snapshot.totalModalTercatat}
                    accent="violet"
                    appendix={{
                      label: "Laba / rugi berjalan",
                      nilai: snapshot.labaBerjalan,
                      hint: "Dihitung dari pendapatan − HPP − beban sampai tanggal cutoff",
                    }}
                    finalSubtotal={{
                      label: "Total modal",
                      nilai: snapshot.totalModal,
                    }}
                  />
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-violet-300 bg-violet-50">
                    <td className="px-5 py-3.5" />
                    <td className="px-5 py-3.5 text-base font-bold text-violet-900">
                      TOTAL PASIVA
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <MoneyText
                        nilai={snapshot.totalPasiva}
                        bold
                        className="text-violet-900"
                      />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function NeracaSeksiBlock({
  label,
  rows,
  subtotalLabel,
  subtotal,
  accent,
  appendix,
  finalSubtotal,
}: {
  label: string;
  rows: NeracaAkunRow[];
  subtotalLabel: string;
  subtotal: number;
  accent: "sky" | "violet";
  /** Baris tambahan setelah subtotal (mis. "Laba berjalan" di seksi Modal). */
  appendix?: { label: string; nilai: number; hint?: string };
  /** Subtotal final setelah appendix (mis. "Total modal" = modal + laba berjalan). */
  finalSubtotal?: { label: string; nilai: number };
}) {
  const accentText = accent === "sky" ? "text-sky-900" : "text-violet-900";
  const accentBg = accent === "sky" ? "bg-sky-50/40" : "bg-violet-50/40";

  return (
    <>
      <tr className="bg-zinc-50/70">
        <td
          colSpan={3}
          className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600"
        >
          {label}
        </td>
      </tr>
      {rows.length === 0 ? (
        <tr>
          <td className="px-5 py-2.5" />
          <td className="px-5 py-2.5 italic text-zinc-400">— Tidak ada saldo —</td>
          <td className="px-5 py-2.5 text-right">
            <MoneyText nilai={0} />
          </td>
        </tr>
      ) : (
        rows.map((r) => (
          <tr key={r.akunKode} className="bg-white hover:bg-zinc-50/50">
            <td className="px-5 py-2 font-mono text-xs text-brand-800">{r.akunKode}</td>
            <td className="px-5 py-2 text-zinc-700">{r.akunNama}</td>
            <td className="px-5 py-2 text-right">
              <MoneyText nilai={r.saldo} />
            </td>
          </tr>
        ))
      )}
      <tr className={`border-t border-zinc-200 ${accentBg}`}>
        <td className="px-5 py-2.5" />
        <td className={`px-5 py-2.5 text-sm font-semibold ${accentText}`}>{subtotalLabel}</td>
        <td className="px-5 py-2.5 text-right">
          <MoneyText nilai={subtotal} bold className={accentText} />
        </td>
      </tr>
      {appendix ? (
        <tr className="bg-white">
          <td className="px-5 py-2" />
          <td className="px-5 py-2 text-zinc-700">
            {appendix.label}
            {appendix.hint ? (
              <span className="mt-0.5 block text-[0.6875rem] text-zinc-400">{appendix.hint}</span>
            ) : null}
          </td>
          <td className="px-5 py-2 text-right">
            <MoneyText nilai={appendix.nilai} />
          </td>
        </tr>
      ) : null}
      {finalSubtotal ? (
        <tr className={`border-t border-zinc-200 ${accentBg}`}>
          <td className="px-5 py-2.5" />
          <td className={`px-5 py-2.5 text-sm font-semibold ${accentText}`}>
            {finalSubtotal.label}
          </td>
          <td className="px-5 py-2.5 text-right">
            <MoneyText nilai={finalSubtotal.nilai} bold className={accentText} />
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
  tone: "positive" | "loss" | "neutral";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "loss"
        ? "text-rose-700"
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
