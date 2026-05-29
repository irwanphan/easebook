import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { HutangBelumLunasRow } from "@/data/pelunasanHutang";
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
 * Halaman Laporan Aging Hutang. Memakai `hutang_belum_lunas_list` sebagai
 * sumber data (sama dengan halaman Daftar Hutang) lalu mengomputasi
 * bucket aging client-side berdasarkan cutoff tanggal.
 */
export function LaporanAgingHutangPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<HutangBelumLunasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cutoff, setCutoff] = useState<string>(todayLocalISODate);
  const [basis, setBasis] = useState<AgingBasis>("jatuh_tempo");
  const [filterPemasokKode, setFilterPemasokKode] = useState("");
  const [view, setView] = useState<AgingView>("ringkasan");

  const { exporting, exportNow } = useXlsxExport();

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<HutangBelumLunasRow[]>("hutang_belum_lunas_list");
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
    return computeAging<HutangBelumLunasRow>({
      rows,
      cutoff,
      basis,
      getNomor: (r) => r.nomor,
      getTanggalFaktur: (r) => r.tanggalFaktur,
      getJatuhTempo: (r) => r.jatuhTempo,
      getPartnerKode: (r) => r.pemasokKode,
      getPartnerNama: (r) => r.pemasokNama,
      getTotal: (r) => r.total,
      getCatatan: (r) => r.metodePembayaran,
    });
  }, [rows, cutoff, basis, loading]);

  const partnerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) if (!map.has(r.pemasokKode)) map.set(r.pemasokKode, r.pemasokNama);
    return [...map.entries()]
      .map(([kode, nama]) => ({ kode, nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [rows]);

  useEffect(() => {
    if (!filterPemasokKode) return;
    if (!partnerOptions.some((p) => p.kode === filterPemasokKode)) {
      setFilterPemasokKode("");
    }
  }, [partnerOptions, filterPemasokKode]);

  const handleExport = useCallback(async () => {
    if (!snapshot) return;
    const buckets = getAgingBuckets(basis);
    const partnerLabel = filterPemasokKode
      ? `${filterPemasokKode} — ${partnerOptions.find((p) => p.kode === filterPemasokKode)?.nama ?? ""}`
      : "Semua pemasok";

    const filteredFaktur = filterPemasokKode
      ? snapshot.faktur.filter((f) => f.partnerKode === filterPemasokKode)
      : snapshot.faktur;

    const totalFiltered = filteredFaktur.reduce((s, r) => s + r.total, 0);

    await exportNow<typeof snapshot.faktur[number]>({
      fileName: `aging_hutang_${snapshot.cutoff}${
        filterPemasokKode ? `_${filterPemasokKode}` : ""
      }`,
      sheetName: "Aging hutang",
      title: "Laporan Aging Hutang",
      meta: [
        { label: "Per tanggal", value: formatTanggalIso(snapshot.cutoff) },
        {
          label: "Basis",
          value: basis === "jatuh_tempo" ? "Hari lewat jatuh tempo" : "Umur dari tanggal faktur",
        },
        { label: "Filter pemasok", value: partnerLabel },
        { label: "Jumlah faktur", value: filteredFaktur.length },
        { label: "Total hutang", value: formatRupiah(totalFiltered) },
      ],
      columns: [
        { header: "No. faktur", value: (r) => r.nomor, type: "text", width: 18 },
        { header: "Tanggal faktur", value: (r) => r.tanggalFaktur, type: "date" },
        { header: "Jatuh tempo", value: (r) => r.jatuhTempo, type: "date" },
        { header: "Kode pemasok", value: (r) => r.partnerKode, type: "text", width: 14 },
        { header: "Pemasok", value: (r) => r.partnerNama, type: "text", width: 30 },
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
        { header: "Total hutang", value: (r) => r.total, type: "currency", width: 18 },
        { header: "Metode pembayaran", value: (r) => r.catatan, type: "text", width: 24 },
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
  }, [basis, exportNow, filterPemasokKode, partnerOptions, snapshot]);

  return (
    <AgingReport
      judul="Aging hutang"
      deskripsi="Eksposur hutang dikelompokkan berdasarkan umur per tanggal cutoff."
      partnerLabel="Pemasok"
      partnerLabelLow="pemasok"
      jenisLabelLow="hutang"
      snapshot={snapshot}
      loading={loading}
      error={error}
      partnerOptions={partnerOptions}
      cutoff={cutoff}
      onChangeCutoff={setCutoff}
      basis={basis}
      onChangeBasis={setBasis}
      filterPartnerKode={filterPemasokKode}
      onChangeFilterPartnerKode={setFilterPemasokKode}
      view={view}
      onChangeView={setView}
      onRefresh={() => void fetchRows()}
      onExport={() => void handleExport()}
      exporting={exporting}
      extraHeaderActions={
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate("/keuangan/hutang/daftar-hutang")}
        >
          <ListOrdered className="h-4 w-4" aria-hidden />
          Daftar hutang
        </Button>
      }
    />
  );
}
