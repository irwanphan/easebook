import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PrintButton } from "@/components/ui/PrintButton";
import {
  buildPelunasanPrintHtml,
  type PelunasanPrintConfig,
} from "@/features/keuangan/templates/pelunasanPrintTemplate";
import type { SignatureColumn } from "@/features/keuangan/printSignature";
import type { PelunasanHutangDetail } from "@/data/pelunasanHutang";
import { tauriErrorMessage } from "@/lib/tauriError";

// Pelunasan hutang (kita bayar ke pemasok):
// kiri = kasir kita (yang membayar), kanan = pemasok (yang menerima).
const PELUNASAN_HUTANG_SIGNATURES: SignatureColumn[] = [
  { label: "Yang Membayar" },
  { label: "Yang Menerima" },
];

const PELUNASAN_HUTANG_PRINT_CONFIG: PelunasanPrintConfig = {
  judulDokumen: "Bukti pembayaran hutang",
  pihakLabel: "Pemasok",
  kasLabel: "Dibayar dari kas",
  fakturTitle: "Faktur pembelian yang dilunasi",
  fakturNomorLabel: "No. faktur pembelian",
  signatures: PELUNASAN_HUTANG_SIGNATURES,
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTanggal(iso: string) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function formatWaktuDicatat(ts: number) {
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PelunasanHutangDetailPage() {
  const { nomor: nomorParam } = useParams();
  const navigate = useNavigate();
  const nomor = nomorParam ? decodeURIComponent(nomorParam) : "";

  const [detail, setDetail] = useState<PelunasanHutangDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!nomor.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const d = await invoke<PelunasanHutangDetail>("pelunasan_hutang_riwayat_detail", {
        nomor: nomor.trim(),
      });
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
        <PageHeader title="Pelunasan tidak valid" description="Nomor pelunasan tidak ada di URL." />
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => navigate("/keuangan/pelunasan-hutang/daftar")}
        >
          Kembali ke daftar
        </Button>
      </div>
    );
  }

  const daftarHref = "/keuangan/pelunasan-hutang/daftar";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            to={daftarHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 print:hidden"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Kembali ke daftar pelunasan hutang
          </Link>
          <PageHeader
            title="Detail pelunasan hutang"
            description={detail ? `Nomor ${detail.nomor}` : "Memuat data pelunasan…"}
          />
        </div>
        {detail ? (
          <PrintButton
            mode="browser"
            label="Cetak"
            filenameHint={`pelunasan-hutang-${detail.nomor}`}
            htmlBuilder={({ paperSize }) =>
              buildPelunasanPrintHtml(
                {
                  nomor: detail.nomor,
                  tanggal: detail.tanggal,
                  pihakKode: detail.pemasokKode,
                  pihakNama: detail.pemasokNama,
                  akunKasKode: detail.akunKasKode,
                  akunKasNama: detail.akunKasNama,
                  total: detail.total,
                  catatan: detail.catatan,
                  createdAt: detail.createdAt,
                  faktur: detail.faktur,
                },
                PELUNASAN_HUTANG_PRINT_CONFIG,
                paperSize,
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
        <p className="text-sm text-zinc-500">Data pelunasan tidak tersedia.</p>
      ) : null}

      {detail && !loading ? (
        <>
          <Card>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Nomor pelunasan</p>
                <p className="mt-1 font-mono text-sm font-semibold text-brand-800">{detail.nomor}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tanggal pelunasan</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">{formatTanggal(detail.tanggal)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dicatat pada</p>
                <p className="mt-1 text-sm text-zinc-800">{formatWaktuDicatat(detail.createdAt)}</p>
                <p className="mt-0.5 text-xs text-zinc-500">Waktu sistem saat transaksi disimpan di aplikasi.</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pemasok</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">{detail.pemasokNama}</p>
                <p className="font-mono text-xs text-zinc-500">{detail.pemasokKode}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dibayar dari kas</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">{detail.akunKasNama || detail.akunKasKode}</p>
                <p className="font-mono text-xs text-zinc-500">{detail.akunKasKode}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total pelunasan</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">{formatRupiah(detail.total)}</p>
              </div>
              
              {detail.catatan.trim() ? (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Catatan</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{detail.catatan}</p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Faktur pembelian yang dilunasi</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {detail.faktur.length} faktur · total {formatRupiah(detail.total)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-5 py-3">No. faktur pembelian</th>
                    <th className="px-5 py-3">Tanggal faktur</th>
                    <th className="px-5 py-3">Jatuh tempo</th>
                    <th className="px-5 py-3 text-right">Jumlah dilunasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {detail.faktur.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-500">
                        Tidak ada baris faktur tercatat.
                      </td>
                    </tr>
                  ) : (
                    detail.faktur.map((f) => (
                      <tr key={f.fakturNomor} className="bg-white">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{f.fakturNomor}</td>
                        <td className="px-5 py-3 text-zinc-600">{formatTanggal(f.tanggalFaktur)}</td>
                        <td className="px-5 py-3 text-zinc-600">{formatTanggal(f.jatuhTempo)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-zinc-900">{formatRupiah(f.jumlah)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {detail.faktur.length > 0 ? (
                  <tfoot>
                    <tr className="border-t border-zinc-200 bg-zinc-50/80">
                      <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-zinc-700">
                        Total
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-zinc-900">
                        {formatRupiah(detail.total)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </Card>

          <Card>
            {detail.jurnalId != null ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Jurnal umum</p>
                <Link
                  to="/keuangan/jurnal-umum"
                  className="mt-1 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Lihat di jurnal umum (ID {detail.jurnalId})
                </Link>
              </div>
            ) : null}
          </Card>
        </>
      ) : null}
    </div>
  );
}
