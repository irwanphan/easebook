import { useNavigate } from "react-router-dom";
import { PembelianFakturForm } from "@/features/pembelian/PembelianFakturForm";

export function TambahPembelianPage() {
  const navigate = useNavigate();
  return (
    <PembelianFakturForm mode="create" cancelHref="/pembelian" onSuccess={() => navigate("/pembelian")} />
  );
}
