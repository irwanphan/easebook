import { useMemo, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  Calendar,
  Filter,
  Hash,
  RefreshCcw,
  Sheet,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabsBar } from "@/components/ui/TabsBar";
import { TokoInput } from "@/components/ui/TokoInput";
import { formatRupiah } from "@/lib/format";
import {
  formatBulan,
  type LaporanTransaksiTotal,
  type RingkasanBarangRow,
  type RingkasanBulanRow,
  type RingkasanPartnerRow,
  type RingkasanSalesmanRow,
} from "@/data/laporanTransaksi";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

export type DimensiId = "partner" | "barang" | "bulan" | "salesman";

type Tone = "emerald" | "sky" | "amber" | "violet";

const TONE_BG: Record<Tone, string> = {
  emerald: "bg-emerald-50",
  sky: "bg-sky-50",
  amber: "bg-amber-50",
  violet: "bg-violet-50",
};
const TONE_TEXT: Record<Tone, string> = {
  emerald: "text-emerald-700",
  sky: "text-sky-700",
  amber: "text-amber-700",
  violet: "text-violet-700",
};
const TONE_BAR: Record<Tone, string> = {
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  violet: "bg-violet-400",
};

export type RingkasanTransaksiData = {
  perPartner: RingkasanPartnerRow[];
  perBarang: RingkasanBarangRow[];
  perBulan: RingkasanBulanRow[];
  /** Optional — hanya disediakan oleh laporan penjualan. */
  perSalesman?: RingkasanSalesmanRow[];
  total: LaporanTransaksiTotal;
};

export type RingkasanTransaksiReportProps = {
  judul: string;
  deskripsi: string;
  /** "Pelanggan" / "Pemasok" — label tab partner. */
  partnerLabel: string;
  /** "pelanggan" / "pemasok" — lowercase untuk pesan. */
  partnerLabelLow: string;
  /** "penjualan" / "pembelian" — kata kunci nominal. */
  jenisLabelLow: string;
  /** Apakah laporan ini menampilkan dimensi salesman. */
  enableSalesman?: boolean;
  /** Aksen warna utama untuk summary card & bar chart. */
  tone: Tone;

  // Data
  data: RingkasanTransaksiData | null;
  loading: boolean;
  error: string | null;

  // Filter
  tanggalDari: string;
  tanggalSampai: string;
  onChangeTanggalDari: (s: string) => void;
  onChangeTanggalSampai: (s: string) => void;

  // Tampilan
  dimensi: DimensiId;
  onChangeDimensi: (id: DimensiId) => void;

  // Aksi
  onRefresh: () => void;
  onExport: () => void;
  exporting: boolean;

  /** Tombol custom tambahan di header (mis. "Lihat Daftar Faktur"). */
  extraHeaderActions?: ReactNode;
};

/**
 * Komponen presentasional reusable untuk Laporan Penjualan / Pembelian
 * dengan agregasi multi-dimensi.
 *
 * Tidak fetch sendiri — caller (page wrapper) memasok `data` + filter state.
 * Ini menjaga SRP: page hanya menyiapkan data sesuai modul (penjualan /
 * pembelian), komponen ini fokus rendering yang konsisten antar modul.
 */
export function RingkasanTransaksiReport({
  judul,
  deskripsi,
  partnerLabel,
  partnerLabelLow,
  jenisLabelLow,
  enableSalesman = false,
  tone,
  data,
  loading,
  error,
  tanggalDari,
  tanggalSampai,
  onChangeTanggalDari,
  onChangeTanggalSampai,
  dimensi,
  onChangeDimensi,
  onRefresh,
  onExport,
  exporting,
  extraHeaderActions,
}: RingkasanTransaksiReportProps) {
  const rentangInvalid = !!tanggalDari && !!tanggalSampai && tanggalSampai < tanggalDari;
  const inputInvalid = !tanggalDari || !tanggalSampai || rentangInvalid;

  const tabs = useMemo(() => {
    const list: { id: DimensiId; label: string }[] = [
      { id: "partner", label: `Per ${partnerLabelLow}` },
      { id: "barang", label: "Per barang" },
      { id: "bulan", label: "Per bulan" },
    ];
    if (enableSalesman) list.push({ id: "salesman", label: "Per salesman" });
    return list;
  }, [partnerLabelLow, enableSalesman]);

  const avgPerFaktur = useMemo(() => {
    if (!data || data.total.jumlahFaktur <= 0) return 0;
    return Math.round(data.total.nominal / data.total.jumlahFaktur);
  }, [data]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={judul}
        description={deskripsi}
        actions={
          <>
            {extraHeaderActions}
            <Button
              type="button"
              variant="secondary"
              onClick={onRefresh}
              disabled={loading || inputInvalid}
            >
              <RefreshCcw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
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

      {/* ── Filter ──────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden p-5">
        <div className="border-b border-zinc-100 pb-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-900">Filter</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Faktur yang dibatalkan otomatis dikecualikan dari ringkasan.
          </p>
        </div>
        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="lap-dari" className="block text-sm font-medium text-zinc-700">
                Tanggal mulai
              </label>
              <TokoInput
                id="lap-dari"
                type="date"
                value={tanggalDari}
                onChange={(e) => onChangeTanggalDari(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="lap-sampai" className="block text-sm font-medium text-zinc-700">
                Tanggal akhir
              </label>
              <TokoInput
                id="lap-sampai"
                type="date"
                value={tanggalSampai}
                onChange={(e) => onChangeTanggalSampai(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-2 self-end">
            <Button
              type="button"
              variant="secondary"
              className="h-9 self-end"
              disabled={loading || inputInvalid}
              onClick={onRefresh}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {loading ? "Memuat…" : "Terapkan"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onExport}
              disabled={loading || exporting || !data || inputInvalid}
              title={!data ? "Belum ada data untuk diexport" : "Export ke .xlsx"}
            >
              <Sheet className="h-4 w-4" aria-hidden />
              {exporting ? "Mengexport…" : "Export XLSX"}
            </Button>
          </div>
        </div>
        {rentangInvalid ? (
          <p className="mt-2 text-sm text-amber-700">
            Tanggal akhir tidak boleh sebelum tanggal mulai.
          </p>
        ) : null}
      </Card>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={`Total ${jenisLabelLow}`}
          value={formatRupiah(data?.total.nominal ?? 0)}
          tone={tone}
        />
        <SummaryCard
          icon={<Hash className="h-4 w-4" />}
          label="Jumlah faktur"
          value={(data?.total.jumlahFaktur ?? 0).toLocaleString("id-ID")}
          tone={tone}
        />
        <SummaryCard
          icon={<Boxes className="h-4 w-4" />}
          label="Total qty"
          value={(data?.total.qty ?? 0).toLocaleString("id-ID")}
          hint={`${(data?.total.jumlahBaris ?? 0).toLocaleString("id-ID")} baris`}
          tone={tone}
        />
        <SummaryCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Rata-rata per faktur"
          value={formatRupiah(avgPerFaktur)}
          tone={tone}
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 pt-2">
          <TabsBar
            tabs={tabs}
            activeId={dimensi}
            onChange={(id) => onChangeDimensi(id as DimensiId)}
          />
        </div>

        {loading && !data ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-500">
            Memuat laporan…
          </div>
        ) : !data ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-500">
            Belum ada data — pilih rentang lalu klik &ldquo;Terapkan&rdquo;.
          </div>
        ) : (
          <>
            {dimensi === "partner" && (
              <PartnerTable
                rows={data.perPartner}
                partnerLabel={partnerLabel}
                partnerLabelLow={partnerLabelLow}
                tone={tone}
              />
            )}
            {dimensi === "barang" && (
              <BarangTable rows={data.perBarang} tone={tone} />
            )}
            {dimensi === "bulan" && (
              <BulanTable rows={data.perBulan} tone={tone} jenisLabel={jenisLabelLow} />
            )}
            {dimensi === "salesman" && enableSalesman && (
              <SalesmanTable rows={data.perSalesman ?? []} tone={tone} />
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ── Sub-tables ───────────────────────────────────────────────────────────

function PartnerTable({
  rows,
  partnerLabel,
  partnerLabelLow,
  tone,
}: {
  rows: RingkasanPartnerRow[];
  partnerLabel: string;
  partnerLabelLow: string;
  tone: Tone;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState message={`Tidak ada ${partnerLabelLow} yang punya transaksi pada periode ini.`} />
    );
  }
  const totals = totalsPartner(rows);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="w-12 px-5 py-3 text-center">#</th>
            <th className="px-5 py-3">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {partnerLabel}
              </span>
            </th>
            <th className="px-5 py-3 text-center">Faktur</th>
            <th className="px-5 py-3 text-right">Qty</th>
            <th className="px-5 py-3 text-right">Nominal</th>
            <th className="w-44 px-5 py-3">Kontribusi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r, idx) => (
            <tr key={r.kode} className="bg-white hover:bg-zinc-50/50">
              <td className="px-5 py-3 text-center text-xs text-zinc-400">{idx + 1}</td>
              <td className="px-5 py-3">
                <div className="font-medium text-zinc-900">{r.nama}</div>
                <div className="font-mono text-[0.6875rem] text-zinc-400">{r.kode}</div>
              </td>
              <td className="px-5 py-3 text-center tabular-nums text-zinc-700">
                {r.jumlahFaktur.toLocaleString("id-ID")}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                {r.qty.toLocaleString("id-ID")}
              </td>
              <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                {formatRupiah(r.nominal)}
              </td>
              <td className="px-5 py-3">
                <KontribusiBar value={r.kontribusi} tone={tone} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
            <td className="px-5 py-3" colSpan={2}>
              <span className="text-sm font-bold text-zinc-900">TOTAL</span>
              <span className="ml-2 text-xs text-zinc-500">
                {rows.length} {partnerLabelLow}
              </span>
            </td>
            <td className="px-5 py-3 text-center text-sm font-bold tabular-nums text-zinc-900">
              {totals.jumlahFaktur.toLocaleString("id-ID")}
            </td>
            <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-zinc-900">
              {totals.qty.toLocaleString("id-ID")}
            </td>
            <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-zinc-900">
              {formatRupiah(totals.nominal)}
            </td>
            <td className="px-5 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BarangTable({
  rows,
  tone,
}: {
  rows: RingkasanBarangRow[];
  tone: Tone;
}) {
  if (rows.length === 0) {
    return <EmptyState message="Tidak ada barang yang ditransaksikan pada periode ini." />;
  }
  const totals = totalsBarang(rows);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="w-12 px-5 py-3 text-center">#</th>
            <th className="px-5 py-3">
              <span className="inline-flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5" aria-hidden />
                Barang
              </span>
            </th>
            <th className="px-5 py-3">Kategori</th>
            <th className="px-5 py-3 text-center">Faktur</th>
            <th className="px-5 py-3 text-right">Qty</th>
            <th className="px-5 py-3 text-right">Nominal (subtotal)</th>
            <th className="w-44 px-5 py-3">Kontribusi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r, idx) => (
            <tr key={r.kode} className="bg-white hover:bg-zinc-50/50">
              <td className="px-5 py-3 text-center text-xs text-zinc-400">{idx + 1}</td>
              <td className="px-5 py-3">
                <div className="font-medium text-zinc-900">{r.nama}</div>
                <div className="font-mono text-[0.6875rem] text-zinc-400">{r.kode}</div>
              </td>
              <td className="px-5 py-3 text-zinc-600">
                {r.kategoriNama || <span className="text-zinc-400">—</span>}
              </td>
              <td className="px-5 py-3 text-center tabular-nums text-zinc-700">
                {r.jumlahFaktur.toLocaleString("id-ID")}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                {r.qty.toLocaleString("id-ID")}
              </td>
              <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                {formatRupiah(r.nominal)}
              </td>
              <td className="px-5 py-3">
                <KontribusiBar value={r.kontribusi} tone={tone} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
            <td className="px-5 py-3" colSpan={3}>
              <span className="text-sm font-bold text-zinc-900">TOTAL</span>
              <span className="ml-2 text-xs text-zinc-500">{rows.length} barang</span>
            </td>
            <td className="px-5 py-3 text-center text-sm font-bold tabular-nums text-zinc-900">
              {totals.jumlahFaktur.toLocaleString("id-ID")}
            </td>
            <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-zinc-900">
              {totals.qty.toLocaleString("id-ID")}
            </td>
            <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-zinc-900">
              {formatRupiah(totals.nominal)}
            </td>
            <td className="px-5 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BulanTable({
  rows,
  tone,
  jenisLabel,
}: {
  rows: RingkasanBulanRow[];
  tone: Tone;
  jenisLabel: string;
}) {
  if (rows.length === 0) {
    return <EmptyState message="Tidak ada transaksi pada rentang ini." />;
  }
  const maxNominal = Math.max(...rows.map((r) => r.nominal), 1);
  const totals = totalsBulan(rows);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-5 py-3">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                Bulan
              </span>
            </th>
            <th className="px-5 py-3 text-center">Faktur</th>
            <th className="px-5 py-3 text-right">Qty</th>
            <th className="px-5 py-3 text-right">{`Total ${jenisLabel}`}</th>
            <th className="px-5 py-3">Bar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => {
            const ratio = r.nominal / maxNominal;
            return (
              <tr key={r.bulan} className="bg-white hover:bg-zinc-50/50">
                <td className="px-5 py-3">
                  <div className="font-medium text-zinc-900">{formatBulan(r.bulan)}</div>
                  <div className="font-mono text-[0.6875rem] text-zinc-400">{r.bulan}</div>
                </td>
                <td className="px-5 py-3 text-center tabular-nums text-zinc-700">
                  {r.jumlahFaktur.toLocaleString("id-ID")}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                  {r.qty.toLocaleString("id-ID")}
                </td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                  {formatRupiah(r.nominal)}
                </td>
                <td className="px-5 py-3">
                  <div className="h-2 w-full rounded-full bg-zinc-100">
                    <div
                      className={`h-2 rounded-full ${TONE_BAR[tone]}`}
                      style={{ width: `${Math.max(2, Math.round(ratio * 100))}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
            <td className="px-5 py-3 text-sm font-bold text-zinc-900">TOTAL {rows.length} bulan</td>
            <td className="px-5 py-3 text-center text-sm font-bold tabular-nums text-zinc-900">
              {totals.jumlahFaktur.toLocaleString("id-ID")}
            </td>
            <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-zinc-900">
              {totals.qty.toLocaleString("id-ID")}
            </td>
            <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-zinc-900">
              {formatRupiah(totals.nominal)}
            </td>
            <td className="px-5 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SalesmanTable({
  rows,
  tone,
}: {
  rows: RingkasanSalesmanRow[];
  tone: Tone;
}) {
  if (rows.length === 0) {
    return <EmptyState message="Tidak ada data salesman pada periode ini." />;
  }
  const totals = rows.reduce(
    (acc, r) => ({
      jumlahFaktur: acc.jumlahFaktur + r.jumlahFaktur,
      qty: acc.qty + r.qty,
      nominal: acc.nominal + r.nominal,
    }),
    { jumlahFaktur: 0, qty: 0, nominal: 0 },
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="w-12 px-5 py-3 text-center">#</th>
            <th className="px-5 py-3">Salesman</th>
            <th className="px-5 py-3 text-center">Faktur</th>
            <th className="px-5 py-3 text-right">Qty</th>
            <th className="px-5 py-3 text-right">Omzet</th>
            <th className="w-44 px-5 py-3">Kontribusi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r, idx) => (
            <tr key={`${r.salesman}-${idx}`} className="bg-white hover:bg-zinc-50/50">
              <td className="px-5 py-3 text-center text-xs text-zinc-400">{idx + 1}</td>
              <td className="px-5 py-3 font-medium text-zinc-900">{r.salesman}</td>
              <td className="px-5 py-3 text-center tabular-nums text-zinc-700">
                {r.jumlahFaktur.toLocaleString("id-ID")}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-zinc-700">
                {r.qty.toLocaleString("id-ID")}
              </td>
              <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                {formatRupiah(r.nominal)}
              </td>
              <td className="px-5 py-3">
                <KontribusiBar value={r.kontribusi} tone={tone} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
            <td className="px-5 py-3" colSpan={2}>
              <span className="text-sm font-bold text-zinc-900">TOTAL</span>
              <span className="ml-2 text-xs text-zinc-500">{rows.length} salesman</span>
            </td>
            <td className="px-5 py-3 text-center text-sm font-bold tabular-nums text-zinc-900">
              {totals.jumlahFaktur.toLocaleString("id-ID")}
            </td>
            <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-zinc-900">
              {totals.qty.toLocaleString("id-ID")}
            </td>
            <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-zinc-900">
              {formatRupiah(totals.nominal)}
            </td>
            <td className="px-5 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Building blocks ──────────────────────────────────────────────────────

function KontribusiBar({ value, tone }: { value: number; tone: Tone }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-zinc-100">
        <div
          className={`h-2 rounded-full ${TONE_BAR[tone]}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <span className="w-12 text-right text-[0.6875rem] tabular-nums text-zinc-500">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: Tone;
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span
        className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${TONE_TEXT[tone]}`}
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${TONE_BG[tone]}`}>
          {icon}
        </span>
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums text-zinc-900">{value}</span>
      {hint ? (
        <span className="text-[0.6875rem] text-zinc-400">{hint}</span>
      ) : null}
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-14 text-center text-sm italic text-zinc-400">
      {message}
    </div>
  );
}

function totalsPartner(rows: RingkasanPartnerRow[]) {
  return rows.reduce(
    (acc, r) => ({
      jumlahFaktur: acc.jumlahFaktur + r.jumlahFaktur,
      qty: acc.qty + r.qty,
      nominal: acc.nominal + r.nominal,
    }),
    { jumlahFaktur: 0, qty: 0, nominal: 0 },
  );
}

function totalsBarang(rows: RingkasanBarangRow[]) {
  return rows.reduce(
    (acc, r) => ({
      jumlahFaktur: acc.jumlahFaktur + r.jumlahFaktur,
      qty: acc.qty + r.qty,
      nominal: acc.nominal + r.nominal,
    }),
    { jumlahFaktur: 0, qty: 0, nominal: 0 },
  );
}

function totalsBulan(rows: RingkasanBulanRow[]) {
  return rows.reduce(
    (acc, r) => ({
      jumlahFaktur: acc.jumlahFaktur + r.jumlahFaktur,
      qty: acc.qty + r.qty,
      nominal: acc.nominal + r.nominal,
    }),
    { jumlahFaktur: 0, qty: 0, nominal: 0 },
  );
}
