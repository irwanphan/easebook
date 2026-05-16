import { useNavigate } from "react-router-dom";
import { PembelianFakturForm } from "@/features/pembelian/PembelianFakturForm";

export function TambahPembelianPage() {
  const navigate = useNavigate();
  return (
    <PembelianFakturForm
      mode="create"
      cancelHref="/pembelian"
      onSuccess={(savedNomor) =>
        navigate(`/pembelian/detail/${encodeURIComponent(savedNomor)}`, { replace: true })
      }
    />
  );
}
