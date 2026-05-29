import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { BookOpen, Filter, RefreshCcw, Sheet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TokoInput } from "@/components/ui/TokoInput";
import { TokoLookup } from "@/components/ui/TokoLookup";
import type { AkunKeuanganRow, BukuBesarSnapshot } from "@/data/keuangan";
import { labelKelompokAkun } from "@/data/keuangan";
import {
  OPERASIONAL_KONFIGURASI_DEFAULT,
  type OperasionalKonfigurasi,
} from "@/data/operasionalKonfigurasi";
import { operasionalKonfigurasiGet } from "@/features/pengaturan/operasionalKonfigurasiInvoke";
import { bukuBesarGet } from "@/features/keuangan/bukuBesarInvoke";
import { jenisBadgeVariant, jenisLabel } from "@/features/keuangan/jurnalJenis";
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

/**
 * Format saldo natural akun + label sisi (D/K). Nilai positif berarti saldo
 * berada di sisi normal akun (D untuk akun aset/biaya, K untuk akun
 * hutang/modal/pendapatan). Negatif berarti saldo di sisi berlawanan.
 */
function formatSaldoNatural(
  nilai: number,
  kolomNorm: string,
): { text: string; sisi: "D" | "K" | "—" } {
  if (nilai === 0) return { text: formatRupiah(0), sisi: "—" };
  const abs = Math.abs(nilai);
  const naturalSide: "D" | "K" = kolomNorm === "K" ? "K" : "D";
  const sisi: "D" | "K" = nilai > 0 ? naturalSide : naturalSide === "D" ? "K" : "D";
  return { text: formatRupiah(abs), sisi };
}

function SaldoCell({ nilai, kolomNorm }: { nilai: number; kolomNorm: string }) {
  const { text, sisi } = formatSaldoNatural(nilai, kolomNorm);
  if (sisi === "—") {
    return <span className="font-medium tabular-nums text-zinc-400">{text}</span>;
  }
  const colorClass = sisi === "D" ? "text-sky-700" : "text-violet-700";
  const badgeClass =
    sisi === "D" ? "bg-sky-50 text-sky-800" : "bg-violet-50 text-violet-800";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${colorClass}`}>
      <span>{text}</span>
      <span
        className={`inline-flex min-w-[1.5rem] justify-center rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold ${badgeClass}`}
      >
        {sisi}
      </span>
    </span>
  );
}

/**
 * Halaman Buku Besar (general ledger). Menampilkan mutasi pada satu akun
 * dalam rentang tanggal tertentu, lengkap dengan saldo awal periode, total
 * debet/kredit, saldo akhir, dan saldo running per baris.
 *
 * Pre-filter akun bisa dilakukan via URL query `?akun=<kode>` (mis. tombol
 * "Jurnal" pada halaman Akun kas).
 */
export function BukuBesarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAkun = searchParams.get("akun") ?? "";
  const initialDari = searchParams.get("dari") ?? "";
  const initialSampai = searchParams.get("sampai") ?? "";

  const [akunList, setAkunList] = useState<AkunKeuanganRow[]>([]);
  const [akunLoading, setAkunLoading] = useState(true);
  const [operasional, setOperasional] = useState<OperasionalKonfigurasi>(
    OPERASIONAL_KONFIGURASI_DEFAULT,
  );

  const [akunKode, setAkunKode] = useState(initialAkun);
  const [tanggalDari, setTanggalDari] = useState(initialDari);
  const [tanggalSampai, setTanggalSampai] = useState(
    initialSampai || resolveDefaultSampai(),
  );

  const [snapshot, setSnapshot] = useState<BukuBesarSnapshot | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const { exporting, exportNow } = useXlsxExport();

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return true;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

  const akunDipilih = useMemo<AkunKeuanganRow | null>(() => {
    if (!akunKode) return null;
    return akunList.find((a) => a.kode === akunKode) ?? null;
  }, [akunKode, akunList]);

  const fetchPrasyarat = useCallback(async () => {
    setAkunLoading(true);
    try {
      const [akun, konf] = await Promise.all([
        invoke<AkunKeuanganRow[]>("akun_keuangan_list"),
        operasionalKonfigurasiGet(),
      ]);
      setAkunList(akun);
      setOperasional(konf);
      if (!initialDari) {
        setTanggalDari(resolveDefaultDari(konf.awalPeriode));
      }
      setDefaultsApplied(true);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setAkunLoading(false);
    }
  }, [initialDari]);

  useEffect(() => {
    void fetchPrasyarat();
  }, [fetchPrasyarat]);

  const fetchSnapshot = useCallback(async () => {
    if (!akunKode) {
      setSnapshot(null);
      return;
    }
    if (rentangInvalid) {
      setError("Tanggal akhir tidak boleh sebelum tanggal mulai.");
      setSnapshot(null);
      return;
    }
    setListLoading(true);
    setError(null);
    try {
      const snap = await bukuBesarGet({
        akunKode,
        tanggalDari: tanggalDari.trim(),
        tanggalSampai: tanggalSampai.trim(),
      });
      setSnapshot(snap);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setSnapshot(null);
    } finally {
      setListLoading(false);
    }
  }, [akunKode, rentangInvalid, tanggalDari, tanggalSampai]);

  // Auto-fetch saat akun / tanggal sudah siap.
  useEffect(() => {
    if (!defaultsApplied) return;
    if (!akunKode) return;
    void fetchSnapshot();
  }, [defaultsApplied, akunKode, tanggalDari, tanggalSampai, fetchSnapshot]);

  // Sync URL ?akun=... agar shareable.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (akunKode) next.set("akun", akunKode);
    else next.delete("akun");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [akunKode]);

  const summary = snapshot;
  const kolomNorm = akunDipilih?.kolomNorm ?? summary?.kolomNorm ?? "D";

  const handleExport = useCallback(async () => {
    if (rentangInvalid || !akunKode || !snapshot || snapshot.entries.length === 0) {
      return;
    }

    const akunLabel = akunDipilih
      ? `${akunDipilih.kode} — ${akunDipilih.nama}`
      : `${snapshot.akunKode} — ${snapshot.akunNama}`;
    const kelompokLabel = akunDipilih
      ? labelKelompokAkun(akunDipilih.kelompok)
      : labelKelompokAkun(snapshot.kelompok);
    const saldoAwalFmt = formatSaldoNatural(snapshot.saldoAwal, kolomNorm);
    const saldoAkhirFmt = formatSaldoNatural(snapshot.saldoAkhir, kolomNorm);

    await exportNow<typeof snapshot.entries[number]>({
      fileName: `buku_besar_${snapshot.akunKode}_${tanggalDari}_sd_${tanggalSampai}`,
      sheetName: "Buku besar",
      title: `Buku Besar — ${akunLabel}`,
      meta: [
        { label: "Akun", value: akunLabel },
        { label: "Kelompok", value: kelompokLabel },
        { label: "Sisi normal", value: kolomNorm === "K" ? "Kredit" : "Debit" },
        { label: "Periode", value: `${snapshot.tanggalDari} – ${snapshot.tanggalSampai}` },
        {
          label: "Saldo awal periode",
          value: `${saldoAwalFmt.text} (${saldoAwalFmt.sisi})`,
        },
        { label: "Total debet", value: formatRupiah(snapshot.totalDebit) },
        { label: "Total kredit", value: formatRupiah(snapshot.totalKredit) },
        {
          label: "Saldo akhir",
          value: `${saldoAkhirFmt.text} (${saldoAkhirFmt.sisi})`,
        },
      ],
      columns: [
        { header: "Tanggal", value: (r) => r.tanggal, type: "date" },
        { header: "Jenis", value: (r) => jenisLabel(r.jenis), type: "text", width: 22 },
        { header: "Referensi", value: (r) => r.referensi, type: "text", width: 18 },
        { header: "Catatan", value: (r) => r.catatan, type: "text", width: 30 },
        { header: "Debet", value: (r) => r.debit, type: "currency", width: 16 },
        { header: "Kredit", value: (r) => r.kredit, type: "currency", width: 16 },
        {
          header: "Saldo",
          value: (r) => Math.abs(r.saldoRunning),
          type: "currency",
          width: 16,
        },
        {
          header: "Sisi",
          value: (r) => formatSaldoNatural(r.saldoRunning, kolomNorm).sisi,
          type: "text",
          width: 8,
          align: "center",
        },
      ],
      data: snapshot.entries,
      footerRow: [
        null,
        null,
        null,
        { value: "TOTAL MUTASI", type: "text" },
        { value: snapshot.totalDebit, type: "currency" },
        { value: snapshot.totalKredit, type: "currency" },
        { value: Math.abs(snapshot.saldoAkhir), type: "currency" },
        { value: saldoAkhirFmt.sisi, type: "text" },
      ],
    });
  }, [
    akunDipilih,
    akunKode,
    exportNow,
    kolomNorm,
    rentangInvalid,
    snapshot,
    tanggalDari,
    tanggalSampai,
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Buku besar"
        description="Riwayat mutasi per akun dengan saldo awal periode, total mutasi, dan saldo running per baris."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => void fetchSnapshot()}
            disabled={listLoading || rentangInvalid || !akunKode}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden />
            {listLoading ? "Memuat…" : "Refresh"}
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

      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 pb-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-900">Filter</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Pilih akun dan rentang tanggal yang ingin ditampilkan.
            {operasional.awalPeriode
              ? ` Awal periode operasional: ${operasional.awalPeriode}.`
              : null}
          </p>
        </div>

        <div className="flex justify-between gap-4">
          <div className="flex gap-4">
            <div>
              <label htmlFor="bb-akun" className="block text-sm font-medium text-zinc-700">
                Akun
              </label>
              <TokoLookup
                id="bb-akun"
                options={akunList}
                value={akunKode || null}
                getKey={(a) => a.kode}
                getLabel={(a) => `${a.kode} — ${a.nama}`}
                getDescription={(a) => labelKelompokAkun(a.kelompok)}
                onChange={(opt) => setAkunKode(opt ? opt.kode : "")}
                placeholder={akunLoading ? "Memuat akun…" : "— Pilih akun —"}
                searchPlaceholder="Cari berdasarkan kode atau nama akun…"
                disabled={akunLoading}
                clearable
              />
            </div>
            <div>
              <label htmlFor="bb-dari" className="block text-sm font-medium text-zinc-700">
                Tanggal mulai
              </label>
              <TokoInput
                id="bb-dari"
                type="date"
                value={tanggalDari}
                onChange={(e) => setTanggalDari(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="bb-sampai" className="block text-sm font-medium text-zinc-700">
                Tanggal akhir
              </label>
              <TokoInput
                id="bb-sampai"
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
              className="h-9 self-end"
              variant="secondary"
              disabled={listLoading || rentangInvalid || !akunKode}
              onClick={() => void fetchSnapshot()}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {listLoading ? "Memuat…" : "Terapkan filter"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 self-end"
              onClick={() => void handleExport()}
              disabled={
                listLoading ||
                exporting ||
                rentangInvalid ||
                !akunKode ||
                !snapshot ||
                snapshot.entries.length === 0
              }
              title={
                !akunKode
                  ? "Pilih akun terlebih dahulu"
                  : !snapshot || snapshot.entries.length === 0
                    ? "Tidak ada mutasi pada rentang ini"
                    : `Export ${snapshot.entries.length} baris mutasi ke .xlsx`
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

      {!akunKode ? (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <BookOpen className="h-6 w-6" aria-hidden />
          </span>
          <h3 className="text-base font-semibold text-zinc-900">
            Pilih akun untuk melihat buku besar
          </h3>
          <p className="max-w-md text-sm text-zinc-500">
            Buku besar menampilkan riwayat mutasi (debet/kredit) dan saldo running untuk
            satu akun. Mulai dengan memilih akun di filter di atas.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              label="Saldo awal periode"
              hint={tanggalDari ? `Per awal ${tanggalDari}` : undefined}
              value={
                <SaldoCell nilai={summary?.saldoAwal ?? 0} kolomNorm={kolomNorm} />
              }
            />
            <SummaryCard
              label="Total debet"
              hint="Σ debet pada rentang"
              value={
                <span className="font-semibold tabular-nums text-zinc-900">
                  {formatRupiah(summary?.totalDebit ?? 0)}
                </span>
              }
            />
            <SummaryCard
              label="Total kredit"
              hint="Σ kredit pada rentang"
              value={
                <span className="font-semibold tabular-nums text-zinc-900">
                  {formatRupiah(summary?.totalKredit ?? 0)}
                </span>
              }
            />
            <SummaryCard
              label="Saldo akhir"
              hint={tanggalSampai ? `Per akhir ${tanggalSampai}` : undefined}
              value={
                <SaldoCell nilai={summary?.saldoAkhir ?? 0} kolomNorm={kolomNorm} />
              }
            />
          </div>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-col gap-2 border-b border-zinc-100 pb-3 mb-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Mutasi
                  {akunDipilih ? (
                    <span className="ml-2 font-mono text-xs font-semibold text-brand-700">
                      {akunDipilih.kode}
                    </span>
                  ) : null}
                  {akunDipilih ? (
                    <span className="ml-2 text-zinc-500">— {akunDipilih.nama}</span>
                  ) : null}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {akunDipilih
                    ? `${labelKelompokAkun(akunDipilih.kelompok)} · saldo normal di sisi ${
                        kolomNorm === "K" ? "Kredit" : "Debit"
                      }.`
                    : "Saldo running ditampilkan pada basis natural akun (positif = sisi normal akun)."}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1024px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3">Jenis</th>
                    <th className="px-5 py-3">Referensi</th>
                    <th className="px-5 py-3">Catatan</th>
                    <th className="px-5 py-3 text-right">Debet</th>
                    <th className="px-5 py-3 text-right">Kredit</th>
                    <th className="px-5 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr className="bg-zinc-50/60">
                    <td colSpan={6} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Saldo awal periode {tanggalDari ? `(${tanggalDari})` : ""}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <SaldoCell
                        nilai={summary?.saldoAwal ?? 0}
                        kolomNorm={kolomNorm}
                      />
                    </td>
                  </tr>
                  {listLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                        Memuat mutasi…
                      </td>
                    </tr>
                  ) : !summary || summary.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                        Tidak ada mutasi pada rentang {tanggalDari} s/d {tanggalSampai}.
                      </td>
                    </tr>
                  ) : (
                    summary.entries.map((r) => (
                      <tr key={r.lineId} className="bg-white hover:bg-zinc-50/50">
                        <td className="px-5 py-3 text-zinc-600">{r.tanggal}</td>
                        <td className="px-5 py-3">
                          <Badge variant={jenisBadgeVariant(r.jenis)}>
                            {jenisLabel(r.jenis)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">
                          {r.referensi || "—"}
                        </td>
                        <td className="px-5 py-3 text-zinc-600">{r.catatan || "—"}</td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums text-zinc-900">
                          {r.debit > 0 ? formatRupiah(r.debit) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums text-zinc-900">
                          {r.kredit > 0 ? formatRupiah(r.kredit) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <SaldoCell nilai={r.saldoRunning} kolomNorm={kolomNorm} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {summary && summary.entries.length > 0 ? (
                  <tfoot>
                    <tr className="border-t border-zinc-100 bg-zinc-50/60 text-sm">
                      <td colSpan={4} className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Total mutasi
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                        {formatRupiah(summary.totalDebit)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900">
                        {formatRupiah(summary.totalKredit)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <SaldoCell
                          nilai={summary.saldoAkhir}
                          kolomNorm={kolomNorm}
                        />
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  hint,
  value,
}: {
  label: string;
  hint?: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <div className="mt-0.5">{value}</div>
      {hint ? <span className="text-[0.6875rem] text-zinc-400">{hint}</span> : null}
    </Card>
  );
}
