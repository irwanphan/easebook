import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PrintButton } from "@/components/ui/PrintButton";
import { buildTransferKasPrintHtml } from "@/features/keuangan/transferKasPrintTemplate";
import type { SignatureColumn } from "@/features/keuangan/printSignature";
import type { TransferKasDetail } from "@/data/transferKas";
import { tauriErrorMessage } from "@/lib/tauriError";

// Transfer antar kas internal:
// kiri  = PIC kas asal (yang menyerahkan saldo)
// kanan = PIC kas tujuan (yang menerima saldo)
const TRANSFER_KAS_SIGNATURES: SignatureColumn[] = [
  { label: "Yang Menyerahkan" },
  { label: "Yang Menerima" },
];

const DAFTAR_HREF = "/keuangan/transfer";

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
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

export function TransferKasDetailPage() {
  const { nomor: nomorParam } = useParams();
  const navigate = useNavigate();
  const nomor = nomorParam ? decodeURIComponent(nomorParam) : "";

  const [detail, setDetail] = useState<TransferKasDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!nomor.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const d = await invoke<TransferKasDetail>("transfer_kas_detail", {
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
        <PageHeader
          title="Transfer tidak valid"
          description="Nomor transfer tidak ada di URL."
        />
        <Button
          type="button"
          variant="ghost"
          className="self-start"
          onClick={() => navigate(DAFTAR_HREF)}
        >
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
            Kembali ke daftar transfer
          </Link>
          <PageHeader
            title="Detail transfer kas"
            description={detail ? `Nomor ${detail.nomor}` : "Memuat data transfer…"}
          />
        </div>
        {detail ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                navigate(`/keuangan/transfer/ubah/${encodeURIComponent(detail.nomor)}`)
              }
              className="gap-2"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Ubah
            </Button>
            <PrintButton
              mode="browser"
              label="Cetak"
              filenameHint={`transfer-${detail.nomor}`}
              htmlBuilder={({ paperSize }) =>
                buildTransferKasPrintHtml(detail, paperSize, TRANSFER_KAS_SIGNATURES)
              }
              onError={(msg) => setError(msg)}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Memuat…</p> : null}

      {!loading && !detail && !error ? (
        <p className="text-sm text-zinc-500">Data transfer tidak tersedia.</p>
      ) : null}

      {detail && !loading ? (
        <>
          <Card>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Nomor transfer
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-brand-800">
                  {detail.nomor}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Tanggal transfer
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {formatTanggal(detail.tanggal)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Dicatat pada
                </p>
                <p className="mt-1 text-sm text-zinc-800">
                  {formatWaktuDicatat(detail.createdAt)}
                </p>
                {detail.updatedAt > detail.createdAt ? (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Terakhir diperbarui {formatWaktuDicatat(detail.updatedAt)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Waktu sistem saat transfer disimpan di aplikasi.
                  </p>
                )}
              </div>
              {detail.catatan.trim() ? (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Catatan
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                    {detail.catatan}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="pb-3">
              <h2 className="text-sm font-semibold text-zinc-900">Kas asal → tujuan</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                Saldo dipindahkan antar rekening kas / bank.
              </p>
            </div>
            <div className="grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr] border-y border-zinc-100">
              <KasPanel
                role="Kas asal"
                roleHint="Yang menyerahkan saldo"
                akunNama={detail.akunSumberNama}
                akunKode={detail.akunSumberKode}
              />
              <div className="flex items-center justify-center border-y border-dashed border-zinc-200 px-4 py-3 sm:border-x sm:border-y-0 sm:px-6">
                <ArrowRight
                  className="h-6 w-6 text-zinc-400"
                  aria-label="ke"
                />
              </div>
              <KasPanel
                role="Kas tujuan"
                roleHint="Yang menerima saldo"
                akunNama={detail.akunTujuanNama}
                akunKode={detail.akunTujuanKode}
              />
            </div>

            <div className="border-b border-zinc-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Ringkasan nominal</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Selisih kirim &amp; terima dibebankan ke akun biaya admin / bank.
              </p>
            </div>
            <dl className="divide-y divide-zinc-100">
              <SummaryRow
                label="Nominal dikirim dari kas asal"
                value={formatRupiah(detail.nominalKirim)}
              />
              {detail.biayaTransfer > 0 ? (
                <SummaryRow
                  label="Biaya transfer (admin / bank)"
                  value={`− ${formatRupiah(detail.biayaTransfer)}`}
                  subtle
                />
              ) : null}
              <SummaryRow
                label="Nominal diterima di kas tujuan"
                value={formatRupiah(detail.nominalTerima)}
                emphasize
              />
            </dl>
            {detail.biayaTransfer > 0 ? (
              <div className="border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 text-xs text-zinc-600">
                Akun biaya:{" "}
                {detail.akunBiayaKode ? (
                  <>
                    <span className="font-mono text-zinc-700">{detail.akunBiayaKode}</span>
                    {detail.akunBiayaNama ? (
                      <span className="ml-1.5 text-zinc-700">— {detail.akunBiayaNama}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="italic text-zinc-500">tidak diset</span>
                )}
              </div>
            ) : null}
          </Card>

          {detail.jurnalId != null ? (
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Jurnal umum
              </p>
              <Link
                to="/keuangan/jurnal-umum"
                className="mt-1 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Lihat di jurnal umum (ID {detail.jurnalId})
              </Link>
              <p className="mt-1 text-xs text-zinc-500">
                Setiap perubahan transfer otomatis menulis jurnal pembalik + jurnal baru
                sehingga jejak audit tetap utuh.
              </p>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

type KasPanelProps = {
  role: string;
  roleHint: string;
  akunNama: string;
  akunKode: string;
};

function KasPanel({ role, roleHint, akunNama, akunKode }: KasPanelProps) {
  return (
    <div className="flex py-2 justify-between items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {role}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">{roleHint}</p>
      </div>
      <div>
        <p className="text-base font-semibold text-zinc-900">
          {akunNama || akunKode}
        </p>
        <p className="font-mono text-xs text-zinc-500">{akunKode}</p>
      </div>
    </div>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  subtle?: boolean;
  emphasize?: boolean;
};

function SummaryRow({ label, value, subtle, emphasize }: SummaryRowProps) {
  return (
    <div
      className={`flex items-center justify-between py-2 text-sm ${
        emphasize ? "bg-zinc-50/80" : ""
      }`}
    >
      <dt className={subtle ? "text-zinc-500" : "text-zinc-700"}>{label}</dt>
      <dd
        className={`font-semibold tabular-nums ${
          emphasize
            ? "text-base text-zinc-900"
            : subtle
              ? "text-zinc-500"
              : "text-zinc-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
