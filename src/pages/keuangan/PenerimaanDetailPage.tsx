import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { PrintButton } from "@/components/ui/PrintButton";
import {
  KasTransaksiDetailView,
  type KasTransaksiDetailVariant,
} from "@/features/keuangan/KasTransaksiDetailView";
import { buildKasTransaksiPrintHtml } from "@/features/keuangan/templates/kasTransaksiPrintTemplate";
import type { SignatureColumn } from "@/features/keuangan/printSignature";
import type { PenerimaanDetail } from "@/data/penerimaan";
import { tauriErrorMessage } from "@/lib/tauriError";

const PENERIMAAN_VARIANT: KasTransaksiDetailVariant = {
  kasLabel: "Diterima ke kas",
  akunBarisLabel: "Akun pendapatan",
  baristTitle: "Rincian pendapatan",
  arahJurnal: "Debit kas (total) · Kredit akun pendapatan per baris.",
};

// Penerimaan kas (uang masuk): kiri = pihak luar yang menyetor, kanan = kasir kita.
// Konvensi: pemberi uang di kiri, penerima uang di kanan.
const PENERIMAAN_SIGNATURES: SignatureColumn[] = [
  { label: "Yang Menyerahkan" },
  { label: "Yang Menerima" },
];

const DAFTAR_HREF = "/keuangan/penerimaan";

export function PenerimaanDetailPage() {
  const { nomor: nomorParam } = useParams();
  const navigate = useNavigate();
  const nomor = nomorParam ? decodeURIComponent(nomorParam) : "";

  const [detail, setDetail] = useState<PenerimaanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!nomor.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const d = await invoke<PenerimaanDetail>("penerimaan_detail", { nomor: nomor.trim() });
      setDetail(d);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [nomor]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!nomor.trim()) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeader title="Penerimaan tidak valid" description="Nomor penerimaan tidak ada di URL." />
        <Button type="button" variant="ghost" className="self-start" onClick={() => navigate(DAFTAR_HREF)}>
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            to={DAFTAR_HREF}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 print:hidden"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Kembali ke daftar penerimaan
          </Link>
          <PageHeader
            title="Detail penerimaan"
            description={detail ? `No. bukti ${detail.nomor}` : "Memuat data penerimaan…"}
          />
        </div>
        {detail ? (
          <PrintButton
            mode="browser"
            label="Cetak"
            filenameHint={`penerimaan-${detail.nomor}`}
            htmlBuilder={({ paperSize }) =>
              buildKasTransaksiPrintHtml(
                detail,
                PENERIMAAN_VARIANT,
                "Bukti penerimaan",
                paperSize,
                PENERIMAAN_SIGNATURES,
                "paraf"
              )
            }
            onError={(msg) => setError(msg)}
          />
        ) : null}
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Memuat…</p> : null}

      {!loading && !detail && !error ? (
        <p className="text-sm text-zinc-500">Data penerimaan tidak tersedia.</p>
      ) : null}

      {detail && !loading ? (
        <KasTransaksiDetailView detail={detail} variant={PENERIMAAN_VARIANT} />
      ) : null}
    </div>
  );
}
