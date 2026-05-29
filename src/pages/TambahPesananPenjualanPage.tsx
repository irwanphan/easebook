import { useNavigate } from "react-router-dom";
import { PesananPenjualanForm } from "@/features/penjualan/PesananPenjualanForm";

/**
 * Halaman input pesanan penjualan baru. Setelah submit, langsung dialihkan
 * ke halaman detail pesanan supaya user langsung lanjut ke aksi berikutnya
 * (mis. klik "Buat faktur penjualan").
 */
export function TambahPesananPenjualanPage() {
  const navigate = useNavigate();
  return (
    <PesananPenjualanForm
      mode="create"
      cancelHref="/penjualan/pesanan"
      onSuccess={(nomor) =>
        navigate(`/penjualan/pesanan/detail/${encodeURIComponent(nomor)}`, {
          replace: true,
        })
      }
    />
  );
}
