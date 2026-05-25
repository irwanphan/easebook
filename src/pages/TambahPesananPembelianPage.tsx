import { useNavigate } from "react-router-dom";
import { PesananPembelianForm } from "@/features/pembelian/PesananPembelianForm";

/**
 * Halaman input pesanan pembelian baru. Setelah submit, langsung dialihkan
 * ke halaman detail pesanan agar user dapat lanjut ke aksi berikutnya
 * (mis. "Buat faktur pembelian" setelah barang diterima).
 */
export function TambahPesananPembelianPage() {
  const navigate = useNavigate();
  return (
    <PesananPembelianForm
      mode="create"
      cancelHref="/pembelian/pesanan"
      onSuccess={(nomor) =>
        navigate(`/pembelian/pesanan/detail/${encodeURIComponent(nomor)}`, {
          replace: true,
        })
      }
    />
  );
}
