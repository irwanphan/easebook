import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LaporanPenjualanSnapshot } from "@/data/laporanTransaksi";
import { formatBulan } from "@/data/laporanTransaksi";
import { laporanPenjualanGet } from "@/features/laporan/laporanTransaksiInvoke";
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
 * Laporan analitik penjualan: agregasi per pelanggan / barang / bulan /
 * salesman dalam satu page. Berbeda dari `PenjualanPage` (daftar faktur
 * untuk navigasi), page ini fokus untuk pengambilan keputusan bisnis.
 */
export function LaporanPenjualanRingkasanPage() {
  const navigate = useNavigate();
  const [tanggalDari, setTanggalDari] = useState<string>(defaultTanggalDari);
  const [tanggalSampai, setTanggalSampai] = useState<string>(defaultTanggalSampai);
  const [snapshot, setSnapshot] = useState<LaporanPenjualanSnapshot | null>(null);
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
      const snap = await laporanPenjualanGet({
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
            perPartner: snapshot.perPelanggan,
            perBarang: snapshot.perBarang,
            perBulan: snapshot.perBulan,
            perSalesman: snapshot.perSalesman,
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
      { label: "Total omzet", value: formatRupiah(snapshot.total.nominal) },
    ];

    if (dimensi === "partner") {
      await exportNow<typeof snapshot.perPelanggan[number]>({
        fileName: `penjualan_per_pelanggan_${snapshot.tanggalDari}_sd_${snapshot.tanggalSampai}`,
        sheetName: "Per pelanggan",
        title: "Laporan Penjualan — Per pelanggan",
        meta,
        columns: [
          { header: "Kode", value: (r) => r.kode, type: "text", width: 14 },
          { header: "Pelanggan", value: (r) => r.nama, type: "text", width: 32 },
          { header: "Jumlah faktur", value: (r) => r.jumlahFaktur, type: "text", width: 14, align: "right" },
          { header: "Qty", value: (r) => r.qty, type: "text", width: 14, align: "right" },
          { header: "Omzet", value: (r) => r.nominal, type: "currency", width: 18 },
          {
            header: "Kontribusi (%)",
            value: (r) => Number((r.kontribusi * 100).toFixed(2)),
            type: "text",
            width: 14,
            align: "right",
          },
        ],
        data: snapshot.perPelanggan,
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
        fileName: `penjualan_per_barang_${snapshot.tanggalDari}_sd_${snapshot.tanggalSampai}`,
        sheetName: "Per barang",
        title: "Laporan Penjualan — Per barang",
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
        fileName: `penjualan_per_bulan_${snapshot.tanggalDari}_sd_${snapshot.tanggalSampai}`,
        sheetName: "Per bulan",
        title: "Laporan Penjualan — Per bulan",
        meta,
        columns: [
          { header: "Bulan", value: (r) => formatBulan(r.bulan), type: "text", width: 18 },
          { header: "Kode bulan", value: (r) => r.bulan, type: "text", width: 12 },
          { header: "Jumlah faktur", value: (r) => r.jumlahFaktur, type: "text", width: 14, align: "right" },
          { header: "Qty", value: (r) => r.qty, type: "text", width: 14, align: "right" },
          { header: "Omzet", value: (r) => r.nominal, type: "currency", width: 18 },
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
    } else if (dimensi === "salesman") {
      await exportNow<typeof snapshot.perSalesman[number]>({
        fileName: `penjualan_per_salesman_${snapshot.tanggalDari}_sd_${snapshot.tanggalSampai}`,
        sheetName: "Per salesman",
        title: "Laporan Penjualan — Per salesman",
        meta,
        columns: [
          { header: "Salesman", value: (r) => r.salesman, type: "text", width: 26 },
          { header: "Jumlah faktur", value: (r) => r.jumlahFaktur, type: "text", width: 14, align: "right" },
          { header: "Qty", value: (r) => r.qty, type: "text", width: 14, align: "right" },
          { header: "Omzet", value: (r) => r.nominal, type: "currency", width: 18 },
          {
            header: "Kontribusi (%)",
            value: (r) => Number((r.kontribusi * 100).toFixed(2)),
            type: "text",
            width: 14,
            align: "right",
          },
        ],
        data: snapshot.perSalesman,
      });
    }
  }, [exportNow, snapshot, dimensi]);

  return (
    <RingkasanTransaksiReport
      judul="Laporan penjualan"
      deskripsi="Ringkasan omzet penjualan per pelanggan, barang, bulan, dan salesman — untuk pengambilan keputusan bisnis."
      partnerLabel="Pelanggan"
      partnerLabelLow="pelanggan"
      jenisLabelLow="penjualan"
      enableSalesman
      tone="emerald"
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
        <Button type="button" variant="secondary" onClick={() => navigate("/penjualan")}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Daftar faktur
        </Button>
      }
    />
  );
}
