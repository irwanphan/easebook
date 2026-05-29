import { useMemo, type ReactNode } from "react";
import { Filter, Hourglass, RefreshCcw, Sheet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabsBar } from "@/components/ui/TabsBar";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";
import { formatRupiah, formatTanggalIso } from "@/lib/format";
import {
  getAgingBuckets,
  type AgingBasis,
  type AgingBucketKey,
  type AgingSnapshot,
} from "./aging";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

const TONE_BG: Record<string, string> = {
  neutral: "bg-zinc-50 text-zinc-900",
  amber: "bg-amber-50 text-amber-900",
  orange: "bg-orange-50 text-orange-900",
  rose: "bg-rose-50 text-rose-900",
  red: "bg-red-50 text-red-900",
};

const TONE_TEXT: Record<string, string> = {
  neutral: "text-zinc-700",
  amber: "text-amber-700",
  orange: "text-orange-700",
  rose: "text-rose-700",
  red: "text-red-700",
};

const TONE_BADGE: Record<string, string> = {
  neutral: "bg-zinc-100 text-zinc-800",
  amber: "bg-amber-100 text-amber-800",
  orange: "bg-orange-100 text-orange-800",
  rose: "bg-rose-100 text-rose-800",
  red: "bg-red-100 text-red-800",
};

export type AgingView = "ringkasan" | "faktur";

type PartnerOption = { kode: string; nama: string };

export type AgingReportProps = {
  /** Judul halaman, mis. "Laporan aging piutang". */
  judul: string;
  /** Deskripsi singkat di bawah judul. */
  deskripsi: string;
  /** "Pelanggan" / "Pemasok" — label kolom partner. */
  partnerLabel: string;
  /** "pelanggan" / "pemasok" — label lowercase untuk pesan. */
  partnerLabelLow: string;
  /** "piutang" / "hutang" — kata kunci nominal. */
  jenisLabelLow: string;

  // Data
  snapshot: AgingSnapshot | null;
  loading: boolean;
  error: string | null;
  partnerOptions: PartnerOption[];

  // Filter (controlled)
  cutoff: string;
  onChangeCutoff: (s: string) => void;
  basis: AgingBasis;
  onChangeBasis: (b: AgingBasis) => void;
  filterPartnerKode: string;
  onChangeFilterPartnerKode: (s: string) => void;

  // Tampilan
  view: AgingView;
  onChangeView: (v: AgingView) => void;

  // Actions
  onRefresh: () => void;
  onExport: () => void;
  exporting: boolean;

  /** Tombol custom di pojok header (mis. "Kembali ke daftar piutang"). */
  extraHeaderActions?: ReactNode;
};

/**
 * Komponen presentasional Laporan Aging. Dipakai oleh
 * `LaporanAgingPiutangPage` dan `LaporanAgingHutangPage` lewat thin wrapper.
 *
 * Tidak melakukan fetch sendiri — caller yang menyediakan `snapshot` dan
 * filter state. Hal ini menjaga komponen tetap pure (sesuai SRP) dan
 * memudahkan unit test maupun reuse di laporan lain (mis. konsolidasi).
 */
export function AgingReport({
  judul,
  deskripsi,
  partnerLabel,
  partnerLabelLow,
  jenisLabelLow,
  snapshot,
  loading,
  error,
  partnerOptions,
  cutoff,
  onChangeCutoff,
  basis,
  onChangeBasis,
  filterPartnerKode,
  onChangeFilterPartnerKode,
  view,
  onChangeView,
  onRefresh,
  onExport,
  exporting,
  extraHeaderActions,
}: AgingReportProps) {
  const buckets = useMemo(() => getAgingBuckets(basis), [basis]);

  const filteredFaktur = useMemo(() => {
    if (!snapshot) return [];
    if (!filterPartnerKode) return snapshot.faktur;
    return snapshot.faktur.filter((f) => f.partnerKode === filterPartnerKode);
  }, [snapshot, filterPartnerKode]);

  const filteredPartner = useMemo(() => {
    if (!snapshot) return [];
    if (!filterPartnerKode) return snapshot.perPartner;
    return snapshot.perPartner.filter((p) => p.partnerKode === filterPartnerKode);
  }, [snapshot, filterPartnerKode]);

  const filteredBucketTotals = useMemo(() => {
    if (!snapshot) return null;
    if (!filterPartnerKode) {
      return {
        bucketTotals: snapshot.bucketTotals,
        totalKeseluruhan: snapshot.totalKeseluruhan,
      };
    }
    const totals: Record<AgingBucketKey, number> = {
      BELUM: 0,
      B1_30: 0,
      B31_60: 0,
      B61_90: 0,
      B90_PLUS: 0,
    };
    let grand = 0;
    for (const p of filteredPartner) {
      for (const b of buckets) {
        totals[b.key] += p.totals[b.key];
      }
      grand += p.total;
    }
    return { bucketTotals: totals, totalKeseluruhan: grand };
  }, [snapshot, filterPartnerKode, filteredPartner, buckets]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={judul}
        description={deskripsi}
        actions={
          <>
            {extraHeaderActions}
            <Button type="button" variant="secondary" onClick={onRefresh} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
              {loading ? "Memuat…" : "Refresh"}
            </Button>
          </>
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

      {/* === Filter === */}
      <Card className="overflow-hidden p-5">
        <div className="border-b border-zinc-100 pb-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-900">Filter</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Aging menampilkan eksposur {jenisLabelLow} dikelompokkan berdasarkan umur per
            tanggal cutoff.
          </p>
        </div>
        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="aging-cutoff" className="block text-sm font-medium text-zinc-700">
                Per tanggal
              </label>
              <TokoInput
                id="aging-cutoff"
                type="date"
                value={cutoff}
                onChange={(e) => onChangeCutoff(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="aging-basis" className="block text-sm font-medium text-zinc-700">
                Basis perhitungan
              </label>
              <TokoSelect
                id="aging-basis"
                value={basis}
                onChange={(e) => onChangeBasis(e.target.value as AgingBasis)}
                disabled={loading}
              >
                <option value="jatuh_tempo">Hari lewat jatuh tempo</option>
                <option value="tanggal_faktur">Umur dari tanggal faktur</option>
              </TokoSelect>
            </div>
            <div>
              <label htmlFor="aging-partner" className="block text-sm font-medium text-zinc-700">
                {partnerLabel}
              </label>
              <TokoSelect
                id="aging-partner"
                value={filterPartnerKode}
                onChange={(e) => onChangeFilterPartnerKode(e.target.value)}
                disabled={loading}
              >
                <option value="">Semua {partnerLabelLow}</option>
                {partnerOptions.map((p) => (
                  <option key={p.kode} value={p.kode}>
                    {p.kode} — {p.nama}
                  </option>
                ))}
              </TokoSelect>
            </div>
          </div>
          <div className="flex gap-2 self-end">
            <Button
              type="button"
              variant="secondary"
              className="h-9 self-end"
              disabled={loading}
              onClick={onRefresh}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {loading ? "Memuat…" : "Terapkan"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onExport}
              disabled={
                loading || exporting || !snapshot || snapshot.faktur.length === 0
              }
              title={
                !snapshot || snapshot.faktur.length === 0
                  ? "Tidak ada data untuk diexport"
                  : "Export laporan aging ke .xlsx"
              }
            >
              <Sheet className="h-4 w-4" aria-hidden />
              {exporting ? "Mengexport…" : "Export XLSX"}
            </Button>
          </div>
        </div>
      </Card>

      {/* === Summary cards per bucket === */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {buckets.map((b) => {
          const nilai = filteredBucketTotals?.bucketTotals[b.key] ?? 0;
          const ratio =
            filteredBucketTotals && filteredBucketTotals.totalKeseluruhan > 0
              ? Math.round((nilai / filteredBucketTotals.totalKeseluruhan) * 100)
              : 0;
          return (
            <Card key={b.key} className="flex flex-col gap-1 p-4">
              <span className={`text-xs font-medium uppercase tracking-wide ${TONE_TEXT[b.tone] ?? ""}`}>
                <Hourglass className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden />
                {b.label}
              </span>
              <span className="text-base font-semibold tabular-nums text-zinc-900">
                {formatRupiah(nilai)}
              </span>
              <span className="text-[0.6875rem] text-zinc-400">
                {ratio}% dari total
              </span>
            </Card>
          );
        })}
      </div>

      {/* === Total grand === */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Total {jenisLabelLow} per {formatTanggalIso(cutoff)}
          </span>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">
            {formatRupiah(filteredBucketTotals?.totalKeseluruhan ?? 0)}
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p>{filteredFaktur.length} faktur</p>
          <p>{filteredPartner.length} {partnerLabelLow}</p>
        </div>
      </Card>

      {/* === Tab: ringkasan per partner / per faktur === */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 pt-2">
          <TabsBar
            tabs={[
              { id: "ringkasan", label: `Per ${partnerLabelLow}` },
              { id: "faktur", label: "Per faktur" },
            ]}
            activeId={view}
            onChange={(id) => onChangeView(id as AgingView)}
          />
        </div>

        {view === "ringkasan" ? (
          <RingkasanTable
            partnerLabel={partnerLabel}
            partnerLabelLow={partnerLabelLow}
            jenisLabelLow={jenisLabelLow}
            buckets={buckets}
            partners={filteredPartner}
            totals={filteredBucketTotals}
            loading={loading}
            snapshot={snapshot}
            filterPartnerKode={filterPartnerKode}
          />
        ) : (
          <FakturTable
            partnerLabel={partnerLabel}
            partnerLabelLow={partnerLabelLow}
            jenisLabelLow={jenisLabelLow}
            basis={basis}
            buckets={buckets}
            faktur={filteredFaktur}
            loading={loading}
            snapshot={snapshot}
            filterPartnerKode={filterPartnerKode}
          />
        )}
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-komponen: tabel ringkasan per partner
// ──────────────────────────────────────────────────────────────────────────
function RingkasanTable({
  partnerLabel,
  partnerLabelLow,
  jenisLabelLow,
  buckets,
  partners,
  totals,
  loading,
  snapshot,
  filterPartnerKode,
}: {
  partnerLabel: string;
  partnerLabelLow: string;
  jenisLabelLow: string;
  buckets: ReturnType<typeof getAgingBuckets>;
  partners: AgingSnapshot["perPartner"];
  totals: { bucketTotals: Record<AgingBucketKey, number>; totalKeseluruhan: number } | null;
  loading: boolean;
  snapshot: AgingSnapshot | null;
  filterPartnerKode: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-5 py-3">{partnerLabel}</th>
            <th className="px-5 py-3 text-center">#</th>
            {buckets.map((b) => (
              <th
                key={b.key}
                className={`px-3 py-3 text-right ${TONE_TEXT[b.tone] ?? ""}`}
                title={b.label}
              >
                {b.short}
              </th>
            ))}
            <th className="px-5 py-3 text-right text-zinc-900">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {loading ? (
            <tr>
              <td colSpan={buckets.length + 3} className="px-5 py-10 text-center text-sm text-zinc-500">
                Memuat aging…
              </td>
            </tr>
          ) : !snapshot ? (
            <tr>
              <td colSpan={buckets.length + 3} className="px-5 py-10 text-center text-sm text-zinc-500">
                Belum ada data — terapkan filter terlebih dahulu.
              </td>
            </tr>
          ) : partners.length === 0 ? (
            <tr>
              <td colSpan={buckets.length + 3} className="px-5 py-12 text-center text-sm text-zinc-500">
                {filterPartnerKode
                  ? `Tidak ada ${jenisLabelLow} untuk ${partnerLabelLow} ini pada cutoff ini.`
                  : `Tidak ada ${jenisLabelLow} terbuka pada cutoff ini.`}
              </td>
            </tr>
          ) : (
            partners.map((p) => (
              <tr key={p.partnerKode} className="bg-white hover:bg-zinc-50/50">
                <td className="px-5 py-3">
                  <div className="font-medium text-zinc-900">{p.partnerNama}</div>
                  <div className="font-mono text-[0.6875rem] text-zinc-400">{p.partnerKode}</div>
                </td>
                <td className="px-5 py-3 text-center tabular-nums text-zinc-600">{p.fakturCount}</td>
                {buckets.map((b) => (
                  <BucketCell key={b.key} nilai={p.totals[b.key]} tone={b.tone} />
                ))}
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                  {formatRupiah(p.total)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {snapshot && partners.length > 0 && totals ? (
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
              <td className="px-5 py-3 text-sm font-bold text-zinc-900" colSpan={2}>
                TOTAL
              </td>
              {buckets.map((b) => (
                <td
                  key={b.key}
                  className={`px-3 py-3 text-right font-semibold tabular-nums ${
                    totals.bucketTotals[b.key] > 0 ? "text-zinc-900" : "text-zinc-300"
                  }`}
                >
                  {totals.bucketTotals[b.key] > 0
                    ? formatRupiah(totals.bucketTotals[b.key])
                    : "—"}
                </td>
              ))}
              <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-zinc-900">
                {formatRupiah(totals.totalKeseluruhan)}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Sub-komponen: tabel detail per faktur
// ──────────────────────────────────────────────────────────────────────────
function FakturTable({
  partnerLabel,
  partnerLabelLow,
  jenisLabelLow,
  basis,
  buckets,
  faktur,
  loading,
  snapshot,
  filterPartnerKode,
}: {
  partnerLabel: string;
  partnerLabelLow: string;
  jenisLabelLow: string;
  basis: AgingBasis;
  buckets: ReturnType<typeof getAgingBuckets>;
  faktur: AgingSnapshot["faktur"];
  loading: boolean;
  snapshot: AgingSnapshot | null;
  filterPartnerKode: string;
}) {
  const bucketByKey = useMemo(() => {
    const m = new Map<AgingBucketKey, (typeof buckets)[number]>();
    for (const b of buckets) m.set(b.key, b);
    return m;
  }, [buckets]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1024px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-5 py-3">No. faktur</th>
            <th className="px-5 py-3">Tanggal faktur</th>
            <th className="px-5 py-3">Jatuh tempo</th>
            <th className="px-5 py-3">{partnerLabel}</th>
            <th className="px-5 py-3 text-right">
              {basis === "jatuh_tempo" ? "Hari lewat" : "Umur (hari)"}
            </th>
            <th className="px-5 py-3">Bucket</th>
            <th className="px-5 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                Memuat aging…
              </td>
            </tr>
          ) : !snapshot ? (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                Belum ada data — terapkan filter terlebih dahulu.
              </td>
            </tr>
          ) : faktur.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                {filterPartnerKode
                  ? `Tidak ada faktur ${jenisLabelLow} untuk ${partnerLabelLow} ini.`
                  : `Tidak ada faktur ${jenisLabelLow} terbuka pada cutoff ini.`}
              </td>
            </tr>
          ) : (
            faktur.map((f) => {
              const bucket = bucketByKey.get(f.bucket);
              return (
                <tr key={f.nomor} className="bg-white hover:bg-zinc-50/50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">
                    {f.nomor}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {formatTanggalIso(f.tanggalFaktur)}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {formatTanggalIso(f.jatuhTempo)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-zinc-900">{f.partnerNama}</div>
                    <div className="font-mono text-[0.6875rem] text-zinc-400">{f.partnerKode}</div>
                  </td>
                  <td
                    className={`px-5 py-3 text-right tabular-nums ${
                      f.hari > 0 ? "font-semibold text-rose-700" : "text-zinc-600"
                    }`}
                  >
                    {f.hari}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold ${
                        bucket ? (TONE_BADGE[bucket.tone] ?? "") : ""
                      }`}
                    >
                      {bucket?.short ?? f.bucket}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                    {formatRupiah(f.total)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {snapshot && faktur.length > 0 ? (
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
              <td colSpan={6} className="px-5 py-3 text-right text-sm font-bold text-zinc-900">
                TOTAL {faktur.length} faktur
              </td>
              <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-zinc-900">
                {formatRupiah(faktur.reduce((s, r) => s + r.total, 0))}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function BucketCell({
  nilai,
  tone,
}: {
  nilai: number;
  tone: string;
}) {
  if (nilai <= 0) {
    return (
      <td className="px-3 py-3 text-right text-xs text-zinc-300">—</td>
    );
  }
  return (
    <td className={`px-3 py-3 text-right tabular-nums ${TONE_BG[tone] ?? ""}`}>
      <span className="font-medium">{formatRupiah(nilai)}</span>
    </td>
  );
}
