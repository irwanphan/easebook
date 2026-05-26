import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProduksiForm } from "@/features/produksi/ProduksiForm";
import type { ProduksiDetail } from "@/data/produksi";
import { produksiDetail } from "@/features/produksi/produksiInvoke";
import { tauriErrorMessage } from "@/lib/tauriError";

export function UbahProduksiPage() {
  const navigate = useNavigate();
  const { nomor } = useParams<{ nomor: string }>();
  const [detail, setDetail] = useState<ProduksiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nomor) {
      setError("Nomor produksi tidak ada.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const d = await produksiDetail(nomor);
        if (cancelled) return;
        setDetail(d);
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nomor]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <PageHeader
          title={`Ubah produksi ${nomor ?? ""}`}
          description="Edit hanya tersedia bila status masih 'Menunggu'."
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/barang-jasa/produksi/detail/${encodeURIComponent(nomor ?? "")}`)}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke detail
        </Button>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-zinc-500">Memuat data produksi…</Card>
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{error}</Card>
      ) : detail && detail.status !== "Menunggu" ? (
        <Card className="border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Produksi sudah berstatus <strong>{detail.status}</strong> dan tidak dapat diedit. Bila
          perlu, batalkan dulu produksi ini lalu buat dokumen baru.
        </Card>
      ) : detail ? (
        <ProduksiForm mode="edit" nomor={nomor} initial={detail} />
      ) : null}
    </div>
  );
}
