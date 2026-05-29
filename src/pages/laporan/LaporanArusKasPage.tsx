import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Briefcase,
  Building2,
  CheckCircle2,
  Filter,
  RefreshCcw,
  Sheet,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TokoInput } from "@/components/ui/TokoInput";
import type {
  ArusKasAkunRow,
  ArusKasSaldoKasRow,
  ArusKasSnapshot,
} from "@/data/keuangan";
import { arusKasGet } from "@/features/keuangan/arusKasInvoke";
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

function defaultTanggalDari(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultTanggalSampai(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

/** Format akuntansi: nilai negatif dibungkus tanda kurung. */
function formatAkuntansi(n: number): string {
  if (n < 0) return `(${formatRupiah(Math.abs(n))})`;
  return formatRupiah(n);
}

const SECTION_META: Record<
  "OPERASI" | "INVESTASI" | "PENDANAAN",
  {
    label: string;
    hint: string;
    icon: typeof Briefcase;
    accent: "emerald" | "sky" | "violet";
  }
> = {
  OPERASI: {
    label: "Aktivitas operasi",
    hint: "Penjualan, pembelian, biaya, dan perubahan modal kerja.",
    icon: Briefcase,
    accent: "emerald",
  },
  INVESTASI: {
    label: "Aktivitas investasi",
    hint: "Perolehan & pelepasan aktiva tetap, investasi jangka panjang.",
    icon: Building2,
    accent: "sky",
  },
  PENDANAAN: {
    label: "Aktivitas pendanaan",
    hint: "Setoran/penarikan modal, pinjaman bank, dan kewajiban jangka panjang.",
    icon: Banknote,
    accent: "violet",
  },
};

const ACCENT_BG: Record<"emerald" | "sky" | "violet", string> = {
  emerald: "bg-emerald-50/50",
  sky: "bg-sky-50/50",
  violet: "bg-violet-50/50",
};
const ACCENT_TEXT: Record<"emerald" | "sky" | "violet", string> = {
  emerald: "text-emerald-900",
  sky: "text-sky-900",
  violet: "text-violet-900",
};
const ACCENT_BORDER: Record<"emerald" | "sky" | "violet", string> = {
  emerald: "border-emerald-300",
  sky: "border-sky-300",
  violet: "border-violet-300",
};

/**
 * Halaman Laporan Arus Kas (Cash Flow Statement) — Metode Langsung.
 *
 * Menampilkan distribusi kas masuk & keluar per aktivitas operasi / investasi /
 * pendanaan dalam periode, dengan saldo kas awal + akhir, dan banner
 * rekonsiliasi jika ada selisih antara perubahan kas terdistribusi vs.
 * mutasi langsung di akun kas.
 */
export function LaporanArusKasPage() {
  const [tanggalDari, setTanggalDari] = useState<string>(defaultTanggalDari);
  const [tanggalSampai, setTanggalSampai] = useState<string>(defaultTanggalSampai);
  const [snapshot, setSnapshot] = useState<ArusKasSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { exporting, exportNow } = useXlsxExport();

  const rentangInvalid = useMemo(
    () => !!tanggalDari && !!tanggalSampai && tanggalSampai < tanggalDari,
    [tanggalDari, tanggalSampai],
  );
  const inputInvalid = !tanggalDari || !tanggalSampai || rentangInvalid;

  const fetchSnapshot = useCallback(async () => {
    if (inputInvalid) {
      setError(
        rentangInvalid
          ? "Tanggal akhir tidak boleh sebelum tanggal mulai."
          : "Tanggal mulai & akhir wajib diisi.",
      );
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await arusKasGet({
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
  }, [tanggalDari, tanggalSampai, inputInvalid, rentangInvalid]);

  useEffect(() => {
    void fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = useCallback(async () => {
    if (!snapshot || inputInvalid) return;

    type ExportRow = {
      kind: "section" | "akun" | "subtotal" | "result" | "spacer";
      seksi: string;
      kode: string;
      label: string;
      kasMasuk: number | null;
      kasKeluar: number | null;
      net: number | null;
    };

    const flat: ExportRow[] = [];

    const pushSection = (
      seksiKey: "OPERASI" | "INVESTASI" | "PENDANAAN",
      rows: ArusKasAkunRow[],
      kasMasuk: number,
      kasKeluar: number,
      net: number,
    ) => {
      const meta = SECTION_META[seksiKey];
      flat.push({
        kind: "section",
        seksi: seksiKey,
        kode: "",
        label: meta.label.toUpperCase(),
        kasMasuk: null,
        kasKeluar: null,
        net: null,
      });
      if (rows.length === 0) {
        flat.push({
          kind: "akun",
          seksi: seksiKey,
          kode: "",
          label: "— Tidak ada arus kas pada periode ini —",
          kasMasuk: 0,
          kasKeluar: 0,
          net: 0,
        });
      } else {
        for (const r of rows) {
          flat.push({
            kind: "akun",
            seksi: seksiKey,
            kode: r.akunKode,
            label: r.akunNama,
            kasMasuk: r.kasMasuk,
            kasKeluar: r.kasKeluar,
            net: r.net,
          });
        }
      }
      flat.push({
        kind: "subtotal",
        seksi: seksiKey,
        kode: "",
        label: `Kas neto dari ${meta.label.toLowerCase()}`,
        kasMasuk,
        kasKeluar,
        net,
      });
      flat.push({
        kind: "spacer",
        seksi: "",
        kode: "",
        label: "",
        kasMasuk: null,
        kasKeluar: null,
        net: null,
      });
    };

    flat.push({
      kind: "akun",
      seksi: "",
      kode: "",
      label: `Saldo kas awal (per ${formatTanggalIso(snapshot.tanggalDari)})`,
      kasMasuk: null,
      kasKeluar: null,
      net: snapshot.saldoKasAwal,
    });
    flat.push({
      kind: "spacer",
      seksi: "",
      kode: "",
      label: "",
      kasMasuk: null,
      kasKeluar: null,
      net: null,
    });

    pushSection(
      "OPERASI",
      snapshot.akunOperasi,
      snapshot.kasMasukOperasi,
      snapshot.kasKeluarOperasi,
      snapshot.netOperasi,
    );
    pushSection(
      "INVESTASI",
      snapshot.akunInvestasi,
      snapshot.kasMasukInvestasi,
      snapshot.kasKeluarInvestasi,
      snapshot.netInvestasi,
    );
    pushSection(
      "PENDANAAN",
      snapshot.akunPendanaan,
      snapshot.kasMasukPendanaan,
      snapshot.kasKeluarPendanaan,
      snapshot.netPendanaan,
    );

    flat.push({
      kind: "result",
      seksi: "",
      kode: "",
      label: "PERUBAHAN BERSIH KAS PERIODE",
      kasMasuk: snapshot.totalKasMasuk,
      kasKeluar: snapshot.totalKasKeluar,
      net: snapshot.netPerubahanKas,
    });
    flat.push({
      kind: "result",
      seksi: "",
      kode: "",
      label: `SALDO KAS AKHIR (per ${formatTanggalIso(snapshot.tanggalSampai)})`,
      kasMasuk: null,
      kasKeluar: null,
      net: snapshot.saldoKasAkhir,
    });
    if (snapshot.selisihRekonsiliasi !== 0) {
      flat.push({
        kind: "subtotal",
        seksi: "",
        kode: "",
        label: "Selisih rekonsiliasi (saldo akhir − proyeksi)",
        kasMasuk: null,
        kasKeluar: null,
        net: snapshot.selisihRekonsiliasi,
      });
    }

    await exportNow<ExportRow>({
      fileName: `arus_kas_${snapshot.tanggalDari}_sd_${snapshot.tanggalSampai}`,
      sheetName: "Arus kas",
      title: `Laporan Arus Kas ${formatTanggalIso(snapshot.tanggalDari)} – ${formatTanggalIso(snapshot.tanggalSampai)}`,
      meta: [
        {
          label: "Periode",
          value: `${formatTanggalIso(snapshot.tanggalDari)} – ${formatTanggalIso(snapshot.tanggalSampai)}`,
        },
        { label: "Saldo kas awal", value: formatRupiah(snapshot.saldoKasAwal) },
        { label: "Kas neto operasi", value: formatRupiah(snapshot.netOperasi) },
        { label: "Kas neto investasi", value: formatRupiah(snapshot.netInvestasi) },
        { label: "Kas neto pendanaan", value: formatRupiah(snapshot.netPendanaan) },
        { label: "Perubahan kas neto", value: formatRupiah(snapshot.netPerubahanKas) },
        { label: "Saldo kas akhir", value: formatRupiah(snapshot.saldoKasAkhir) },
        {
          label: "Selisih rekonsiliasi",
          value: formatRupiah(snapshot.selisihRekonsiliasi),
        },
      ],
      columns: [
        { header: "Seksi", value: (r) => r.seksi, type: "text", width: 12 },
        { header: "Kode", value: (r) => r.kode, type: "text", width: 12 },
        { header: "Uraian", value: (r) => r.label, type: "text", width: 44 },
        {
          header: "Kas masuk",
          value: (r) => (r.kasMasuk == null ? "" : r.kasMasuk),
          type: "currency",
          width: 16,
        },
        {
          header: "Kas keluar",
          value: (r) => (r.kasKeluar == null ? "" : r.kasKeluar),
          type: "currency",
          width: 16,
        },
        {
          header: "Net",
          value: (r) => (r.net == null ? "" : r.net),
          type: "currency",
          width: 16,
        },
      ],
      data: flat,
    });
  }, [exportNow, snapshot, inputInvalid]);

  const seimbang = (snapshot?.selisihRekonsiliasi ?? 0) === 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Laporan arus kas"
        description="Pergerakan kas — masuk & keluar — dikelompokkan per aktivitas operasi, investasi, dan pendanaan (metode langsung, PSAK 2)."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void fetchSnapshot()}
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

      {/* ── Filter ─────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden p-5">
        <div className="border-b border-zinc-100 pb-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-900">Filter</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pilih rentang tanggal untuk menghitung arus kas. Saldo kas awal dihitung
            otomatis dari semua jurnal sebelum tanggal mulai.
          </p>
        </div>
        <div className="flex flex-wrap justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="ak-dari" className="block text-sm font-medium text-zinc-700">
                Tanggal mulai
              </label>
              <TokoInput
                id="ak-dari"
                type="date"
                value={tanggalDari}
                onChange={(e) => setTanggalDari(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="ak-sampai" className="block text-sm font-medium text-zinc-700">
                Tanggal akhir
              </label>
              <TokoInput
                id="ak-sampai"
                type="date"
                value={tanggalSampai}
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
              disabled={loading || inputInvalid}
              onClick={() => void fetchSnapshot()}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {loading ? "Memuat…" : "Terapkan"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleExport()}
              disabled={loading || exporting || inputInvalid || !snapshot}
              title={
                !snapshot ? "Belum ada data untuk diexport" : "Export laporan ke .xlsx"
              }
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

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard
          label="Saldo kas awal"
          icon={<Wallet className="h-4 w-4" />}
          value={formatRupiah(snapshot?.saldoKasAwal ?? 0)}
          tone="neutral"
        />
        <SummaryCard
          label="Kas neto operasi"
          icon={<Briefcase className="h-4 w-4" />}
          value={formatAkuntansi(snapshot?.netOperasi ?? 0)}
          tone={(snapshot?.netOperasi ?? 0) >= 0 ? "positive" : "loss"}
        />
        <SummaryCard
          label="Kas neto investasi"
          icon={<Building2 className="h-4 w-4" />}
          value={formatAkuntansi(snapshot?.netInvestasi ?? 0)}
          tone={(snapshot?.netInvestasi ?? 0) >= 0 ? "positive" : "loss"}
        />
        <SummaryCard
          label="Kas neto pendanaan"
          icon={<Banknote className="h-4 w-4" />}
          value={formatAkuntansi(snapshot?.netPendanaan ?? 0)}
          tone={(snapshot?.netPendanaan ?? 0) >= 0 ? "positive" : "loss"}
        />
        <SummaryCard
          label="Saldo kas akhir"
          icon={<Wallet className="h-4 w-4" />}
          value={formatRupiah(snapshot?.saldoKasAkhir ?? 0)}
          tone="neutral"
          hint={
            snapshot
              ? `Δ ${formatAkuntansi(snapshot.netPerubahanKas)} periode`
              : undefined
          }
        />
      </div>

      {loading && !snapshot ? (
        <Card className="py-12 text-center text-sm text-zinc-500">
          Memuat laporan arus kas…
        </Card>
      ) : !snapshot ? (
        <Card className="py-12 text-center text-sm text-zinc-500">
          Belum ada data — pilih rentang lalu klik &ldquo;Terapkan&rdquo;.
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
                <p className="font-semibold">Ada selisih rekonsiliasi</p>
                <p className="mt-0.5 text-xs leading-relaxed">
                  Selisih antara mutasi kas terdistribusi dengan saldo akhir aktual:{" "}
                  <span className="font-mono font-semibold">
                    {formatAkuntansi(snapshot.selisihRekonsiliasi)}
                  </span>
                  . Biasanya muncul karena ada jurnal kas yang akun lawannya
                  tidak/keliru terbaca (mis. saldo awal kas tanpa pasangan
                  &ldquo;Historical Balance&rdquo;).
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Arus kas terverifikasi</p>
                <p className="mt-0.5 text-xs leading-relaxed">
                  Saldo kas awal + perubahan neto = saldo kas akhir. Semua jurnal
                  kas memiliki akun lawan yang benar.
                </p>
              </div>
            </div>
          )}

          {/* ── 3 seksi arus kas ───────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <SeksiCard
              seksiKey="OPERASI"
              rows={snapshot.akunOperasi}
              kasMasuk={snapshot.kasMasukOperasi}
              kasKeluar={snapshot.kasKeluarOperasi}
              net={snapshot.netOperasi}
            />
            <SeksiCard
              seksiKey="INVESTASI"
              rows={snapshot.akunInvestasi}
              kasMasuk={snapshot.kasMasukInvestasi}
              kasKeluar={snapshot.kasKeluarInvestasi}
              net={snapshot.netInvestasi}
            />
            <SeksiCard
              seksiKey="PENDANAAN"
              rows={snapshot.akunPendanaan}
              kasMasuk={snapshot.kasMasukPendanaan}
              kasKeluar={snapshot.kasKeluarPendanaan}
              net={snapshot.netPendanaan}
            />
          </div>

          {/* ── Rekonsiliasi saldo per akun kas ─────────────────────────── */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-zinc-100 bg-zinc-50/70 px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Wallet className="h-4 w-4" aria-hidden />
                Rincian per akun kas
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Saldo awal, mutasi dalam periode, dan saldo akhir untuk setiap
                rekening kas/bank.
              </p>
            </div>
            <SaldoKasTable rows={snapshot.saldoPerKas} />
          </Card>

          {/* ── Ringkasan total bawah ───────────────────────────────────── */}
          <Card className="overflow-hidden p-0">
            <div className="grid gap-0 lg:grid-cols-2">
              <SummaryRow
                label="Saldo kas awal"
                hint={`per ${formatTanggalIso(snapshot.tanggalDari)}`}
                value={snapshot.saldoKasAwal}
              />
              <SummaryRow
                label="(+) Perubahan kas neto"
                hint="Operasi + Investasi + Pendanaan"
                value={snapshot.netPerubahanKas}
                emphasis
              />
              <SummaryRow
                label="Saldo kas akhir (proyeksi)"
                hint="awal + perubahan neto"
                value={snapshot.saldoKasAkhirProyeksi}
              />
              <SummaryRow
                label="Saldo kas akhir (aktual)"
                hint={`per ${formatTanggalIso(snapshot.tanggalSampai)}`}
                value={snapshot.saldoKasAkhir}
                emphasis
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Sub-komponen ─────────────────────────────────────────────────────────

function SeksiCard({
  seksiKey,
  rows,
  kasMasuk,
  kasKeluar,
  net,
}: {
  seksiKey: "OPERASI" | "INVESTASI" | "PENDANAAN";
  rows: ArusKasAkunRow[];
  kasMasuk: number;
  kasKeluar: number;
  net: number;
}) {
  const meta = SECTION_META[seksiKey];
  const Icon = meta.icon;
  const empty = rows.length === 0;
  return (
    <Card className="overflow-hidden p-0">
      <div className={`border-b border-zinc-100 px-5 py-3 ${ACCENT_BG[meta.accent]}`}>
        <h2
          className={`flex items-center gap-2 text-sm font-semibold ${ACCENT_TEXT[meta.accent]}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {meta.label}
        </h2>
        <p className={`mt-0.5 text-xs ${ACCENT_TEXT[meta.accent]}/70 opacity-70`}>
          {meta.hint}
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-2.5">Akun</th>
            <th className="px-3 py-2.5 text-right">Masuk</th>
            <th className="px-3 py-2.5 text-right">Keluar</th>
            <th className="px-4 py-2.5 text-right">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {empty ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center text-xs italic text-zinc-400"
              >
                Tidak ada arus kas pada periode ini.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.akunKode} className="bg-white hover:bg-zinc-50/50">
                <td className="px-4 py-2">
                  <div className="font-medium text-zinc-900">{r.akunNama}</div>
                  <div className="font-mono text-[0.6875rem] text-zinc-400">
                    {r.akunKode}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <MoneyCell nilai={r.kasMasuk} variant="masuk" />
                </td>
                <td className="px-3 py-2 text-right">
                  <MoneyCell nilai={r.kasKeluar} variant="keluar" />
                </td>
                <td className="px-4 py-2 text-right">
                  <MoneyCell nilai={r.net} variant="net" />
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr
            className={`border-t-2 ${ACCENT_BORDER[meta.accent]} ${ACCENT_BG[meta.accent]}`}
          >
            <td className={`px-4 py-3 text-sm font-bold ${ACCENT_TEXT[meta.accent]}`}>
              Kas neto
            </td>
            <td className="px-3 py-3 text-right">
              <MoneyCell nilai={kasMasuk} variant="masuk" bold />
            </td>
            <td className="px-3 py-3 text-right">
              <MoneyCell nilai={kasKeluar} variant="keluar" bold />
            </td>
            <td className={`px-4 py-3 text-right text-sm font-bold ${ACCENT_TEXT[meta.accent]}`}>
              {formatAkuntansi(net)}
            </td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

function SaldoKasTable({ rows }: { rows: ArusKasSaldoKasRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm italic text-zinc-400">
        Tidak ada akun kas yang aktif pada periode ini.
      </div>
    );
  }
  const totals = rows.reduce(
    (acc, r) => ({
      saldoAwal: acc.saldoAwal + r.saldoAwal,
      kasMasuk: acc.kasMasuk + r.kasMasuk,
      kasKeluar: acc.kasKeluar + r.kasKeluar,
      saldoAkhir: acc.saldoAkhir + r.saldoAkhir,
    }),
    { saldoAwal: 0, kasMasuk: 0, kasKeluar: 0, saldoAkhir: 0 },
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-5 py-3">Akun kas / bank</th>
            <th className="px-5 py-3 text-right">Saldo awal</th>
            <th className="px-5 py-3 text-right">Kas masuk</th>
            <th className="px-5 py-3 text-right">Kas keluar</th>
            <th className="px-5 py-3 text-right">Saldo akhir</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <tr key={r.akunKode} className="bg-white hover:bg-zinc-50/50">
              <td className="px-5 py-2.5">
                <div className="font-medium text-zinc-900">{r.akunNama}</div>
                <div className="font-mono text-[0.6875rem] text-zinc-400">{r.akunKode}</div>
              </td>
              <td className="px-5 py-2.5 text-right tabular-nums text-zinc-700">
                {formatAkuntansi(r.saldoAwal)}
              </td>
              <td className="px-5 py-2.5 text-right">
                <MoneyCell nilai={r.kasMasuk} variant="masuk" />
              </td>
              <td className="px-5 py-2.5 text-right">
                <MoneyCell nilai={r.kasKeluar} variant="keluar" />
              </td>
              <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-zinc-900">
                {formatAkuntansi(r.saldoAkhir)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
            <td className="px-5 py-3 text-sm font-bold text-zinc-900">TOTAL</td>
            <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-zinc-900">
              {formatAkuntansi(totals.saldoAwal)}
            </td>
            <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-emerald-700">
              {formatRupiah(totals.kasMasuk)}
            </td>
            <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-rose-700">
              {formatRupiah(totals.kasKeluar)}
            </td>
            <td className="px-5 py-3 text-right text-base font-bold tabular-nums text-zinc-900">
              {formatAkuntansi(totals.saldoAkhir)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function MoneyCell({
  nilai,
  variant,
  bold = false,
}: {
  nilai: number;
  variant: "masuk" | "keluar" | "net";
  bold?: boolean;
}) {
  if (nilai === 0) {
    return <span className="text-xs text-zinc-300">—</span>;
  }
  if (variant === "masuk") {
    return (
      <span
        className={`inline-flex items-center justify-end gap-1 tabular-nums text-emerald-700 ${bold ? "font-bold" : "font-medium"}`}
      >
        <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden />
        {formatRupiah(nilai)}
      </span>
    );
  }
  if (variant === "keluar") {
    return (
      <span
        className={`inline-flex items-center justify-end gap-1 tabular-nums text-rose-700 ${bold ? "font-bold" : "font-medium"}`}
      >
        <ArrowDownCircle className="h-3.5 w-3.5" aria-hidden />
        {formatRupiah(nilai)}
      </span>
    );
  }
  const negatif = nilai < 0;
  return (
    <span
      className={`tabular-nums ${bold ? "font-bold" : "font-medium"} ${
        negatif ? "text-rose-700" : "text-emerald-700"
      }`}
    >
      {formatAkuntansi(nilai)}
    </span>
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
  icon?: ReactNode;
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
        <span className="text-[0.6875rem] tracking-wide text-zinc-400">{hint}</span>
      ) : null}
    </Card>
  );
}

function SummaryRow({
  label,
  hint,
  value,
  emphasis = false,
}: {
  label: string;
  hint?: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-zinc-100 px-5 py-3 last:border-b-0 ${
        emphasis ? "bg-zinc-50/70" : "bg-white"
      }`}
    >
      <div>
        <p className={`text-sm ${emphasis ? "font-bold text-zinc-900" : "font-medium text-zinc-700"}`}>
          {label}
        </p>
        {hint ? <p className="text-[0.6875rem] text-zinc-400">{hint}</p> : null}
      </div>
      <p
        className={`tabular-nums ${
          emphasis ? "text-base font-bold" : "text-sm font-semibold"
        } ${value < 0 ? "text-rose-700" : "text-zinc-900"}`}
      >
        {formatAkuntansi(value)}
      </p>
    </div>
  );
}
