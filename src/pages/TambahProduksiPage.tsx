import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ProduksiForm } from "@/features/produksi/ProduksiForm";

export function TambahProduksiPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <PageHeader
          title="Produksi baru"
          description="Catat konversi bahan baku menjadi barang jadi. Stok & jurnal hanya diposting saat status berubah ke 'Selesai'."
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/barang-jasa/produksi")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali
        </Button>
      </div>
      <ProduksiForm mode="create" />
    </div>
  );
}
