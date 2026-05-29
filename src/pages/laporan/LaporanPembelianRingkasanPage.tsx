import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LaporanPembelianSnapshot } from "@/data/laporanTransaksi";
import { formatBulan } from "@/data/laporanTransaksi";
import { laporanPembelianGet } from "@/features/laporan/laporanTransaksiInvoke";
import {
  RingkasanTransaksiReport,
  type DimensiId,
  type RingkasanTransaksiData,
} from "@/features/laporan/RingkasanTransaksiReport";
import { formatRupiah, formatTanggalIso } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";
import { useXlsxExport } from "@/lib/useXlsxExport";

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

/**
 * Laporan analitik pembelian: agregasi per pemasok / barang / bulan.
 * Berbeda dari `PembelianPage` (daftar faktur untuk navigasi), page ini
 * fokus untuk evaluasi kinerja pemasok & strategi pengadaan.
 */
export function LaporanPembelianRingkasanPage() {
  const navigate = useNavigate();
  const [tanggalDari, setTanggalDari] = useState<string>(defaultTanggalDari);
  const [tanggalSampai, setTanggalSampai] = useState<string>(defaultTanggalSampai);
  const [snapshot, setSnapshot] = useState<LaporanPembelianSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensi, setDimensi] = useState<DimensiId>("partner");

  const { exporting, exportNow } = useXlsxExport();

  const fetchSnapshot = useCallback(async () => {
    if (!tanggalDari || !tanggalSampai || tanggalSampai < tanggalDari) {
      setError("Tanggal mulai & akhir wajib diisi dengan rentang yang valid.");
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snap = await laporanPembelianGet({
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
  }, [tanggalDari, tanggalSampai]);

  useEffect(() => {
    void fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data: RingkasanTransaksiData | null = useMemo(
    () =>
      snapshot
        ? {
            perPartner: snapshot.perPemasok,
            perBarang: snapshot.perBarang,
            perBulan: snapshot.perBulan,
            total: snapshot.total,
          }
        : null,
    [snapshot],
  );

  const handleExport = useCallback(async () => {
    if (!snapshot) return;

    const meta = [
      {
        label: "Periode",
        value: `${formatTanggalIso(snapshot.tanggalDari)} – ${formatTanggalIso(snapshot.tanggalSampai)}`,
      },
      { label: "Jumlah faktur", value: snapshot.total.jumlahFaktur },
      { label: "Total pembelian", value: formatRupiah(snapshot.total.nominal) },
    ];

    if (dimensi === "partner") {
      await exportNow<typeof snapshot.perPemasok[number]>({
        fileName: `pembelian_per_pemasok_${snapshot.tanggalDari}_sd_${snapshot.tanggalSampai}`,
        sheetName: "Per pemasok",
        title: "Laporan Pembelian — Per pemasok",
        meta,
        columns: [
          { header: "Kode", value: (r) => r.kode, type: "text", width: 14 },
          { header: "Pemasok", value: (r) => r.nama, type: "text", width: 32 },
          { header: "Jumlah faktur", value: (r) => r.jumlahFaktur, type: "text", width: 14, align: "right" },
          { header: "Qty", value: (r) => r.qty, type: "text", width: 14, align: "right" },
          { header: "Pembelian", value: (r) => r.nominal, type: "currency", width: 18 },
          {
            header: "Kontribusi (%)",
            value: (r) => Number((r.kontribusi * 100).toFixed(2)),
            type: "text",
            width: 14,
            align: "right",
          },
        ],
        data: snapshot.perPemasok,
        footerRow: [
          null,
          { value: "TOTAL", type: "text" },
          { value: snapshot.total.jumlahFaktur, type: "text" },
          { value: snapshot.total.qty, type: "text" },
          { value: snapshot.total.nominal, type: "currency" },
          null,
        ],
      });
    } else if (dimensi === "barang") {
      await exportNow<typeof snapshot.perBarang[number]>({
        fileName: `pembelian_per_barang_${snapshot.tanggalDari}_sd_${snapshot.tanggalSampai}`,
        sheetName: "Per barang",
        title: "Laporan Pembelian — Per barang",
        meta,
        columns: [
          { header: "Kode", value: (r) => r.kode, type: "text", width: 14 },
          { header: "Barang", value: (r) => r.nama, type: "text", width: 32 },
          { header: "Kategori", value: (r) => r.kategoriNama, type: "text", width: 18 },
          { header: "Jumlah faktur", value: (r) => r.jumlahFaktur, type: "text", width: 14, align: "right" },
          { header: "Qty", value: (r) => r.qty, type: "text", width: 14, align: "right" },
          { header: "Nominal (subtotal)", value: (r) => r.nominal, type: "currency", width: 20 },
          {
            header: "Kontribusi (%)",
            value: (r) => Number((r.kontribusi * 100).toFixed(2)),
            type: "text",
            width: 14,
            align: "right",
          },
        ],
        data: snapshot.perBarang,
      });
    } else if (dimensi === "bulan") {
      await exportNow<typeof snapshot.perBulan[number]>({
        fileName: `pembelian_per_bulan_${snapshot.tanggalDari}_sd_${snapshot.tanggalSampai}`,
        sheetName: "Per bulan",
        title: "Laporan Pembelian — Per bulan",
        meta,
        columns: [
          { header: "Bulan", value: (r) => formatBulan(r.bulan), type: "text", width: 18 },
          { header: "Kode bulan", value: (r) => r.bulan, type: "text", width: 12 },
          { header: "Jumlah faktur", value: (r) => r.jumlahFaktur, type: "text", width: 14, align: "right" },
          { header: "Qty", value: (r) => r.qty, type: "text", width: 14, align: "right" },
          { header: "Pembelian", value: (r) => r.nominal, type: "currency", width: 18 },
        ],
        data: snapshot.perBulan,
        footerRow: [
          { value: "TOTAL", type: "text" },
          null,
          { value: snapshot.total.jumlahFaktur, type: "text" },
          { value: snapshot.total.qty, type: "text" },
          { value: snapshot.total.nominal, type: "currency" },
        ],
      });
    }
  }, [exportNow, snapshot, dimensi]);

  return (
    <RingkasanTransaksiReport
      judul="Laporan pembelian"
      deskripsi="Ringkasan pembelian per pemasok, barang, dan bulan — untuk evaluasi pemasok & strategi pengadaan."
      partnerLabel="Pemasok"
      partnerLabelLow="pemasok"
      jenisLabelLow="pembelian"
      tone="amber"
      data={data}
      loading={loading}
      error={error}
      tanggalDari={tanggalDari}
      tanggalSampai={tanggalSampai}
      onChangeTanggalDari={setTanggalDari}
      onChangeTanggalSampai={setTanggalSampai}
      dimensi={dimensi}
      onChangeDimensi={setDimensi}
      onRefresh={() => void fetchSnapshot()}
      onExport={() => void handleExport()}
      exporting={exporting}
      extraHeaderActions={
        <Button type="button" variant="secondary" onClick={() => navigate("/pembelian")}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Daftar faktur
        </Button>
      }
    />
  );
}
