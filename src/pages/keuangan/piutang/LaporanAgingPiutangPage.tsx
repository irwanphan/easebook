import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PiutangBelumLunasRow } from "@/data/pelunasanPiutang";
import { tauriErrorMessage } from "@/lib/tauriError";
import { useXlsxExport } from "@/lib/useXlsxExport";
import { formatRupiah, formatTanggalIso } from "@/lib/format";
import {
  AgingReport,
  type AgingView,
} from "@/features/keuangan/aging/AgingReport";
import {
  computeAging,
  getAgingBuckets,
  type AgingBasis,
  type AgingSnapshot,
} from "@/features/keuangan/aging/aging";

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Halaman Laporan Aging Piutang. Memakai `piutang_belum_lunas_list` sebagai
 * sumber data (sama dengan halaman Daftar Piutang) lalu mengomputasi
 * bucket aging client-side berdasarkan cutoff tanggal.
 *
 * Page ini sengaja tipis: seluruh logika UI ada di `AgingReport`, sehingga
 * konsisten dengan halaman aging hutang.
 */
export function LaporanAgingPiutangPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PiutangBelumLunasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cutoff, setCutoff] = useState<string>(todayLocalISODate);
  const [basis, setBasis] = useState<AgingBasis>("jatuh_tempo");
  const [filterPelangganKode, setFilterPelangganKode] = useState("");
  const [view, setView] = useState<AgingView>("ringkasan");

  const { exporting, exportNow } = useXlsxExport();

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

  const snapshot: AgingSnapshot | null = useMemo(() => {
    if (loading && rows.length === 0) return null;
    return computeAging<PiutangBelumLunasRow>({
      rows,
      cutoff,
      basis,
      getNomor: (r) => r.nomor,
      getTanggalFaktur: (r) => r.tanggalFaktur,
      getJatuhTempo: (r) => r.jatuhTempo,
      getPartnerKode: (r) => r.pelangganKode,
      getPartnerNama: (r) => r.pelangganNama,
      getTotal: (r) => r.total,
      getCatatan: (r) => r.catatanFaktur,
    });
  }, [rows, cutoff, basis, loading]);

  const partnerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) if (!map.has(r.pelangganKode)) map.set(r.pelangganKode, r.pelangganNama);
    return [...map.entries()]
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [rows]);

  useEffect(() => {
    if (!filterPelangganKode) return;
    if (!partnerOptions.some((p) => p.kode === filterPelangganKode)) {
      setFilterPelangganKode("");
    }
  }, [partnerOptions, filterPelangganKode]);

  const handleExport = useCallback(async () => {
    if (!snapshot) return;
    const buckets = getAgingBuckets(basis);
    const partnerLabel = filterPelangganKode
      ? `${filterPelangganKode} — ${partnerOptions.find((p) => p.kode === filterPelangganKode)?.nama ?? ""}`
      : "Semua pelanggan";

    const filteredFaktur = filterPelangganKode
      ? snapshot.faktur.filter((f) => f.partnerKode === filterPelangganKode)
      : snapshot.faktur;

    const totalFiltered = filteredFaktur.reduce((s, r) => s + r.total, 0);

    await exportNow<typeof snapshot.faktur[number]>({
      fileName: `aging_piutang_${snapshot.cutoff}${
        filterPelangganKode ? `_${filterPelangganKode}` : ""
      }`,
      sheetName: "Aging piutang",
      title: "Laporan Aging Piutang",
      meta: [
        { label: "Per tanggal", value: formatTanggalIso(snapshot.cutoff) },
        {
          label: "Basis",
          value: basis === "jatuh_tempo" ? "Hari lewat jatuh tempo" : "Umur dari tanggal faktur",
        },
        { label: "Filter pelanggan", value: partnerLabel },
        { label: "Jumlah faktur", value: filteredFaktur.length },
        { label: "Total piutang", value: formatRupiah(totalFiltered) },
      ],
      columns: [
        { header: "No. faktur", value: (r) => r.nomor, type: "text", width: 18 },
        { header: "Tanggal faktur", value: (r) => r.tanggalFaktur, type: "date" },
        { header: "Jatuh tempo", value: (r) => r.jatuhTempo, type: "date" },
        { header: "Kode pelanggan", value: (r) => r.partnerKode, type: "text", width: 14 },
        { header: "Pelanggan", value: (r) => r.partnerNama, type: "text", width: 30 },
        {
          header: basis === "jatuh_tempo" ? "Hari lewat" : "Umur (hari)",
          value: (r) => r.hari,
          type: "text",
          width: 12,
          align: "right",
        },
        {
          header: "Bucket",
          value: (r) => buckets.find((b) => b.key === r.bucket)?.short ?? r.bucket,
          type: "text",
          width: 12,
        },
        { header: "Total piutang", value: (r) => r.total, type: "currency", width: 18 },
        { header: "Catatan faktur", value: (r) => r.catatan, type: "text", width: 40 },
      ],
      data: filteredFaktur,
      footerRow: [
        null,
        null,
        null,
        null,
        null,
        null,
        { value: "TOTAL", type: "text" },
        { value: totalFiltered, type: "currency" },
        null,
      ],
    });
  }, [basis, exportNow, filterPelangganKode, partnerOptions, snapshot]);

  return (
    <AgingReport
      judul="Aging piutang"
      deskripsi="Eksposur piutang dikelompokkan berdasarkan umur per tanggal cutoff."
      partnerLabel="Pelanggan"
      partnerLabelLow="pelanggan"
      jenisLabelLow="piutang"
      snapshot={snapshot}
      loading={loading}
      error={error}
      partnerOptions={partnerOptions}
      cutoff={cutoff}
      onChangeCutoff={setCutoff}
      basis={basis}
      onChangeBasis={setBasis}
      filterPartnerKode={filterPelangganKode}
      onChangeFilterPartnerKode={setFilterPelangganKode}
      view={view}
      onChangeView={setView}
      onRefresh={() => void fetchRows()}
      onExport={() => void handleExport()}
      exporting={exporting}
      extraHeaderActions={
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/keuangan/piutang/daftar-piutang")}
        >
          <ListOrdered className="h-4 w-4" aria-hidden />
          Daftar piutang
        </Button>
      }
    />
  );
}
