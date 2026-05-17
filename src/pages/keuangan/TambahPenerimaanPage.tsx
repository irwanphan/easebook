import { useNavigate } from "react-router-dom";
import { PenerimaanForm } from "@/features/keuangan/PenerimaanForm";

export function TambahPenerimaanPage() {
  const navigate = useNavigate();
  return (
    <PenerimaanForm cancelHref="/keuangan/penerimaan" onSuccess={() => navigate("/keuangan/penerimaan")} />
  );
}
