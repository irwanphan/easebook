import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PelunasanPiutangModal } from "@/features/keuangan/PelunasanPiutangModal";
import type { BuatPelunasanPiutangLocationState, PiutangBelumLunasRow } from "@/data/pelunasanPiutang";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoSelect } from "@/components/ui/TokoInput";
import { HandCoins, List, Plus, RefreshCcw, Sheet } from "lucide-react";
import { VerticalSeparator } from "@/components/ui/Separator";
import { useXlsxExport } from "@/lib/useXlsxExport";

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

function formatTanggal(iso: string) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function isJatuhTempoLewat(jatuhTempo: string) {
  return jatuhTempo < todayLocalISODate();
}

type FilterTampilan = "semua" | "jatuh_tempo";

export function KeuanganPelunasanPiutangPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PiutangBelumLunasRow[]>([]);
  const [filter, setFilter] = useState<FilterTampilan>("semua");
  const [filterPelangganKode, setFilterPelangganKode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalFaktur, setModalFaktur] = useState<PiutangBelumLunasRow | null>(null);
  const { exporting, exportNow } = useXlsxExport();

  const pelangganOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (!map.has(r.pelangganKode)) map.set(r.pelangganKode, r.pelangganNama);
    }
    return [...map.entries()]
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [rows]);

  const rowsByPelanggan = useMemo(() => {
    if (!filterPelangganKode) return rows;
    return rows.filter((r) => r.pelangganKode === filterPelangganKode);
  }, [rows, filterPelangganKode]);

  const filteredRows = useMemo(() => {
    let list = rowsByPelanggan;
    if (filter === "jatuh_tempo") {
      list = list.filter((r) => isJatuhTempoLewat(r.jatuhTempo));
    }
    return list;
  }, [rowsByPelanggan, filter]);

  const totalPiutang = useMemo(() => filteredRows.reduce((s, r) => s + r.total, 0), [filteredRows]);

  const jatuhTempoCount = useMemo(
    () => rowsByPelanggan.filter((r) => isJatuhTempoLewat(r.jatuhTempo)).length,
    [rowsByPelanggan],
  );

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<PiutangBelumLunasRow[]>("piutang_belum_lunas_list");
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (!filterPelangganKode) return;
    if (!pelangganOptions.some((p) => p.kode === filterPelangganKode)) {
      setFilterPelangganKode("");
    }
  }, [pelangganOptions, filterPelangganKode]);

  function goBuatPelunasan(state?: BuatPelunasanPiutangLocationState) {
    navigate("/keuangan/pelunasan-piutang/buat", { state });
  }

  function openPelunasan(row: PiutangBelumLunasRow) {
    setModalFaktur(row);
  }

  function openPelunasanBaru() {
    goBuatPelunasan(
      filterPelangganKode ? { pelangganKode: filterPelangganKode } : undefined,
    );
  }

  const handleExport = useCallback(async () => {
    if (filteredRows.length === 0) return;

    const pelangganLabel = filterPelangganKode
      ? `${filterPelangganKode} — ${pelangganOptions.find((p) => p.kode === filterPelangganKode)?.nama ?? ""}`
      : "Semua pelanggan";
    const jatuhTempoLabel =
      filter === "jatuh_tempo" ? "Hanya jatuh tempo lewat" : "Semua piutang belum lunas";
    const today = todayLocalISODate();

    await exportNow<PiutangBelumLunasRow>({
      fileName: `piutang_belum_lunas${filterPelangganKode ? `_${filterPelangganKode}` : ""}`,
      sheetName: "Piutang belum lunas",
      title: "Daftar Piutang Belum Lunas",
      meta: [
        { label: "Tanggal cetak", value: formatTanggal(today) },
        { label: "Filter pelanggan", value: pelangganLabel },
        { label: "Filter jatuh tempo", value: jatuhTempoLabel },
        { label: "Jumlah faktur", value: filteredRows.length },
        { label: "Total piutang", value: formatRupiah(totalPiutang) },
      ],
      columns: [
        { header: "No. faktur", value: (r) => r.nomor, type: "text", width: 18 },
        { header: "Tanggal faktur", value: (r) => r.tanggalFaktur, type: "date" },
        { header: "Jatuh tempo", value: (r) => r.jatuhTempo, type: "date" },
        {
          header: "Status",
          value: (r) => (isJatuhTempoLewat(r.jatuhTempo) ? "Lewat tempo" : "Dalam tempo"),
          type: "text",
          width: 14,
        },
        { header: "Kode pelanggan", value: (r) => r.pelangganKode, type: "text", width: 14 },
        { header: "Pelanggan", value: (r) => r.pelangganNama, type: "text", width: 30 },
        { header: "Total piutang", value: (r) => r.total, type: "currency", width: 18 },
        { header: "Catatan faktur", value: (r) => r.catatanFaktur, type: "text", width: 40 },
      ],
      data: filteredRows,
      footerRow: [
        null,
        null,
        null,
        null,
        null,
        { value: "TOTAL", type: "text" },
        { value: totalPiutang, type: "currency" },
        null,
      ],
    });
  }, [exportNow, filter, filterPelangganKode, filteredRows, pelangganOptions, totalPiutang]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Pelunasan piutang"
        description="Faktur penjualan kredit (belum diterima tunai). Catat pembayaran pelanggan untuk melunasi piutang."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate("/keuangan/pelunasan-piutang/daftar")}>
              <List className="h-4 w-4" aria-hidden />
              Daftar pelunasan
            </Button>
            <Button type="button" variant="secondary" onClick={() => void fetchRows()} disabled={loading}>
              <RefreshCcw className="h-4 w-4" aria-hidden />
              {loading ? "Memuat…" : "Refresh"}
            </Button>
            <VerticalSeparator />
            <Button type="button" onClick={() => openPelunasanBaru()} disabled={loading || rows.length === 0}>
              <Plus className="h-4 w-4" aria-hidden />
              Buat pelunasan
            </Button>
          </>
        }
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 pb-3 mb-3">
          <div className="flex justify-between gap-4">
            <div className="flex gap-4">
              <div>
                <label htmlFor="pp-pelanggan" className="block text-sm font-medium text-zinc-700">
                  Pelanggan
                </label>
                <TokoSelect
                  id="pp-pelanggan"
                  value={filterPelangganKode}
                  onChange={(e) => setFilterPelangganKode(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Semua pelanggan</option>
                  {pelangganOptions.map((p) => (
                    <option key={p.kode} value={p.kode}>
                      {p.kode} — {p.nama}
                    </option>
                  ))}
                </TokoSelect>
              </div>
              <div>
                <label htmlFor="pp-filter" className="block text-sm font-medium text-zinc-700">
                  Jatuh tempo
                </label>
                <TokoSelect
                  id="pp-filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterTampilan)}
                  disabled={loading}
                >
                  <option value="semua">Semua piutang belum lunas</option>
                  <option value="jatuh_tempo">Hanya jatuh tempo lewat ({jatuhTempoCount})</option>
                </TokoSelect>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-700">Piutang belum lunas</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {loading
                    ? "Memuat…"
                    : rows.length === 0
                      ? "Tidak ada piutang terbuka."
                      : filteredRows.length === 0
                        ? rowsByPelanggan.length === 0
                          ? filterPelangganKode
                            ? "Tidak ada piutang untuk pelanggan ini."
                            : filter === "jatuh_tempo"
                              ? `Tidak ada faktur jatuh tempo (${rows.length} piutang lain masih dalam tempo).`
                              : "Tidak ada faktur sesuai filter."
                          : filter === "jatuh_tempo"
                            ? `Tidak ada faktur jatuh tempo untuk filter ini (${rowsByPelanggan.length} faktur masih dalam tempo).`
                            : "Tidak ada faktur sesuai filter."
                        : `${filteredRows.length} faktur ditampilkan · total ${formatRupiah(totalPiutang)}`}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9 self-end"
                onClick={() => void handleExport()}
                disabled={loading || exporting || filteredRows.length === 0}
                title={
                  filteredRows.length === 0
                    ? "Tidak ada data pada filter ini"
                    : `Export ${filteredRows.length} faktur ke .xlsx`
                }
              >
                <Sheet className="h-4 w-4" aria-hidden />
                {exporting ? "Mengexport…" : "Export XLSX"}
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No. faktur</th>
                <th className="px-5 py-3">Tanggal faktur</th>
                <th className="px-5 py-3">Jatuh tempo</th>
                <th className="px-5 py-3">Pelanggan</th>
                <th className="px-5 py-3 text-right">Total piutang</th>
                <th className="px-5 py-3">Catatan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat piutang…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Semua faktur sudah lunas atau penjualan dicatat tunai saat faktur dibuat.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Tidak ada faktur sesuai filter. Ubah pelanggan atau jatuh tempo untuk melihat faktur lain.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const lewat = isJatuhTempoLewat(row.jatuhTempo);
                  return (
                    <tr key={row.nomor} className="bg-white hover:bg-zinc-50/50">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{row.nomor}</td>
                      <td className="px-5 py-3 text-zinc-600">{formatTanggal(row.tanggalFaktur)}</td>
                      <td className="px-5 py-3">
                        <span className={lewat ? "font-medium text-rose-700" : "text-zinc-600"}>
                          {formatTanggal(row.jatuhTempo)}
                        </span>
                        {lewat ? (
                          <span className="ml-2 inline-flex">
                            <Badge variant="delayed">Lewat tempo</Badge>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 font-medium text-zinc-900">{row.pelangganNama}</td>
                      <td className="px-5 py-3 text-right font-semibold text-zinc-900">{formatRupiah(row.total)}</td>
                      <td className="max-w-[200px] truncate px-5 py-3 text-zinc-600" title={row.catatanFaktur || undefined}>
                        {row.catatanFaktur || "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button type="button" variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => openPelunasan(row)}>
                          <HandCoins
                            className="h-4 w-4"
                            aria-hidden />
                          Lunaskan
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <PelunasanPiutangModal
        open={modalFaktur != null}
        faktur={modalFaktur}
        onClose={() => setModalFaktur(null)}
        onSaved={fetchRows}
      />
    </div>
  );
}
