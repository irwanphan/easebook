import { useNavigate } from "react-router-dom";
import { PengeluaranForm } from "@/features/keuangan/PengeluaranForm";

export function TambahPengeluaranPage() {
  const navigate = useNavigate();
  return (
    <PengeluaranForm cancelHref="/keuangan/pengeluaran" onSuccess={() => navigate("/keuangan/pengeluaran")} />
  );
}
