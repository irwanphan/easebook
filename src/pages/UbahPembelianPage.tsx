import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { PembelianFakturForm } from "@/features/pembelian/PembelianFakturForm";

export function UbahPembelianPage() {
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
        <Button type="button" variant="ghost" className="self-start" onClick={() => navigate("/pembelian")}>
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  const detailHref = `/pembelian/detail/${encodeURIComponent(nomor)}`;

  return (
    <PembelianFakturForm
      mode="edit"
      nomor={nomor}
      cancelHref={detailHref}
      onSuccess={() => navigate(detailHref, { replace: true })}
    />
  );
}
