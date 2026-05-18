import { useNavigate } from "react-router-dom";
import { PenjualanFakturForm } from "@/features/penjualan/PenjualanFakturForm";

export function TambahPenjualanPage() {
  const navigate = useNavigate();
  return (
    <PenjualanFakturForm
      mode="create"
      cancelHref="/penjualan"
      onSuccess={() => navigate("/penjualan")}
    />
  );
}
