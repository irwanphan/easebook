import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { PenjualanFakturForm } from "@/features/penjualan/PenjualanFakturForm";

export function UbahPenjualanPage() {
  const { nomor: nomorParam } = useParams();
  const navigate = useNavigate();
  const nomor = nomorParam ? decodeURIComponent(nomorParam) : "";

  if (!nomor.trim()) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeader 
          title="Faktur tidak valid" 
          // description="Nomor faktur tidak ada di URL." 
        />
        <Button type="button" variant="ghost" className="self-start" onClick={() => navigate("/penjualan")}>
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  const detailHref = `/penjualan/detail/${encodeURIComponent(nomor)}`;

  return (
    <PenjualanFakturForm
      mode="edit"
      nomor={nomor}
      cancelHref={detailHref}
      onSuccess={() => navigate(detailHref, { replace: true })}
    />
  );
}
