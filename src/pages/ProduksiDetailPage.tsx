import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Factory,
  FileText,
  Pencil,
  Trash2,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { ProduksiDetail, ProduksiStatus } from "@/data/produksi";
import {
  produksiBatalkan,
  produksiDelete,
  produksiDetail,
  produksiTandaiSelesai,
} from "@/features/produksi/produksiInvoke";
import { formatRupiah, formatTanggalIso } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";

function statusVariant(s: ProduksiStatus) {
  if (s === "Selesai") return "success" as const;
  if (s === "Menunggu") return "processing" as const;
  return "delayed" as const;
}

type DialogKind = "selesai" | "batal" | "hapus" | null;

export function ProduksiDetailPage() {
  const navigate = useNavigate();
  const { nomor } = useParams<{ nomor: string }>();

  const [detail, setDetail] = useState<ProduksiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!nomor) return;
    setError(null);
    try {
      const d = await produksiDetail(nomor);
      setDetail(d);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [nomor]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = useCallback(
    async (kind: NonNullable<DialogKind>) => {
      if (!nomor) return;
      setActing(true);
      setActionError(null);
      try {
        if (kind === "selesai") {
          await produksiTandaiSelesai(nomor);
          await refresh();
          setDialog(null);
        } else if (kind === "batal") {
          await produksiBatalkan(nomor);
          await refresh();
          setDialog(null);
        } else {
          await produksiDelete(nomor);
          navigate("/barang-jasa/produksi");
        }
      } catch (e) {
        setActionError(tauriErrorMessage(e));
      } finally {
        setActing(false);
      }
    },
    [navigate, nomor, refresh],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card className="p-6 text-sm text-zinc-500">Memuat detail produksi…</Card>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card className="border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{error}</Card>
      </div>
    );
  }
  if (!detail) return null;

  const canSelesai = detail.status === "Menunggu";
  const canEdit = detail.status === "Menunggu";
  const canBatal = detail.status === "Menunggu" || detail.status === "Selesai";
  const canHapus = detail.status !== "Selesai";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3">
            <Factory className="h-6 w-6 text-brand-700" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight font-mono text-zinc-900">
              {detail.nomor}
            </h1>
            <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Tanggal produksi: {formatTanggalIso(detail.tanggal)}
            {detail.tanggalSelesai
              ? ` · selesai ${formatTanggalIso(detail.tanggalSelesai)}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="bg-white"
            onClick={() => navigate("/barang-jasa/produksi")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Kembali
          </Button>
          {canEdit ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                navigate(`/barang-jasa/produksi/ubah/${encodeURIComponent(detail.nomor)}`)
              }
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Ubah
            </Button>
          ) : null}
          {canSelesai ? (
            <Button type="button" onClick={() => setDialog("selesai")}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Tandai selesai
            </Button>
          ) : null}
          {canBatal ? (
            <Button type="button" variant="danger" onClick={() => setDialog("batal")}>
              <XCircle className="h-4 w-4" aria-hidden />
              Batalkan
            </Button>
          ) : null}
          {canHapus ? (
            <Button type="button" variant="danger" onClick={() => setDialog("hapus")}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Hapus
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {actionError}
        </div>
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Field label="Gudang bahan baku">
            <span className="font-mono text-xs text-zinc-500">{detail.gudangBbKode}</span>{" "}
            {detail.gudangBbNama}
          </Field>
          <Field label="Gudang barang jadi">
            <span className="font-mono text-xs text-zinc-500">{detail.gudangHasilKode}</span>{" "}
            {detail.gudangHasilNama}
          </Field>
          <Field label="Dibuat oleh">{detail.dibuatOleh || "—"}</Field>
          <Field label="Biaya produksi">{formatRupiah(detail.biayaProduksi)}</Field>
          <Field label="Akun lawan biaya">
            {detail.akunBiayaKode ? (
              <>
                <span className="font-mono text-xs text-zinc-500">{detail.akunBiayaKode}</span>{" "}
                {detail.akunBiayaNama}
              </>
            ) : (
              "—"
            )}
          </Field>
          <Field label="Jurnal">
            {detail.jurnalId ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
                onClick={() => navigate("/keuangan/jurnal-umum")}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                #{detail.jurnalId}
              </button>
            ) : (
              <span className="text-zinc-400">Belum diposting</span>
            )}
          </Field>
          <Field label="Catatan" wide>
            {detail.catatan || <span className="text-zinc-400">—</span>}
          </Field>
        </div>
      </Card>

      <LinesTable
        title="Bahan baku"
        lines={detail.bahanBaku}
        total={detail.totalNilaiBb}
        footnote={
          detail.status === "Selesai"
            ? "HPP telah di-snapshot dari rata-rata tertimbang saat produksi diselesaikan."
            : detail.status === "Menunggu"
              ? "Nilai HPP di tabel ini masih estimasi. Saat 'Tandai Selesai' sistem akan menghitung ulang dari rata-rata tertimbang terkini."
              : undefined
        }
      />

      <LinesTable
        title="Hasil produksi"
        lines={detail.hasil}
        total={detail.totalNilaiHasil}
      />

      <Card className="p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-zinc-900">Ringkasan akuntansi</h3>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <SummaryItem label="Nilai bahan baku" value={detail.totalNilaiBb} />
          <SummaryItem label="Biaya produksi" value={detail.biayaProduksi} />
          <SummaryItem
            label="Total diserap (BB + biaya)"
            value={detail.totalNilaiBb + detail.biayaProduksi}
          />
          <SummaryItem label="Nilai barang jadi" value={detail.totalNilaiHasil} highlight />
          <SummaryItem
            label="Selisih"
            value={detail.selisih}
            tone={
              detail.selisih === 0
                ? "neutral"
                : detail.selisih > 0
                  ? "positive"
                  : "negative"
            }
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Saat status berubah ke <strong>Selesai</strong>, sistem memutasi stok bahan baku{" "}
          <span className="inline-flex items-center gap-1">
            ({detail.gudangBbNama}
            <ArrowRight className="inline h-3 w-3 text-zinc-400" />
            {detail.gudangHasilNama})
          </span>{" "}
          dan memposting jurnal: <span className="font-mono">D Persediaan</span> sebesar biaya
          produksi (± selisih) dan <span className="font-mono">K {detail.akunBiayaNama ?? "—"}</span>{" "}
          sebesar biaya. Selisih HPP otomatis dijurnal ke akun{" "}
          <span className="font-mono">5010 Laba Rugi Pembulatan</span>.
        </p>
      </Card>

      <ConfirmModal
        open={dialog === "selesai"}
        title="Selesaikan produksi"
        message={`Posting stok dan jurnal untuk produksi ${detail.nomor}? Pastikan stok bahan baku di gudang ${detail.gudangBbNama} cukup. Tindakan ini tidak bisa diedit, hanya bisa dibatalkan.`}
        confirmLabel="Ya, selesaikan"
        loading={acting}
        onConfirm={() => void runAction("selesai")}
        onCancel={() => setDialog(null)}
      />
      <ConfirmModal
        open={dialog === "batal"}
        title="Batalkan produksi"
        variant="danger"
        message={
          detail.status === "Selesai"
            ? `Membatalkan produksi yang sudah selesai akan mengembalikan stok bahan baku dan menarik kembali stok barang jadi, serta menghapus jurnalnya. Lanjutkan?`
            : `Tandai produksi ${detail.nomor} sebagai Dibatalkan?`
        }
        confirmLabel="Ya, batalkan"
        loading={acting}
        onConfirm={() => void runAction("batal")}
        onCancel={() => setDialog(null)}
      />
      <ConfirmModal
        open={dialog === "hapus"}
        title="Hapus produksi"
        variant="danger"
        message={`Hapus permanen produksi ${detail.nomor}? Hanya status 'Menunggu' atau 'Dibatalkan' yang dapat dihapus.`}
        confirmLabel="Ya, hapus"
        loading={acting}
        onConfirm={() => void runAction("hapus")}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-zinc-900">{children}</p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
  tone = "neutral",
}: {
  label: string;
  value: number;
  highlight?: boolean;
  tone?: "neutral" | "positive" | "negative";
}) {
  const colorClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-rose-700"
        : highlight
          ? "text-brand-700"
          : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${colorClass}`}>{formatRupiah(value)}</p>
    </div>
  );
}

function LinesTable({
  title,
  lines,
  total,
  footnote,
}: {
  title: string;
  lines: ProduksiDetail["bahanBaku"];
  total: number;
  footnote?: string;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {footnote ? (
          <p className="mt-1 text-xs text-zinc-500">{footnote}</p>
        ) : null}
      </div>
      {lines.length === 0 ? (
        <p className="px-6 py-8 text-sm text-zinc-500">Tidak ada baris.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Barang</th>
                <th className="px-5 py-3 text-right">Qty</th>
                <th className="px-5 py-3">Satuan</th>
                <th className="px-5 py-3 text-right">HPP / unit</th>
                <th className="px-5 py-3 text-right">Subtotal</th>
                <th className="px-5 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {lines.map((l) => (
                <tr key={l.id} className="bg-white">
                  <td className="px-5 py-3 text-zinc-900">
                    <div className="font-medium">{l.barangNama}</div>
                    <div className="font-mono text-xs text-zinc-500">{l.barangKode}</div>
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-900">{l.qty}</td>
                  <td className="px-5 py-3 text-zinc-600">{l.satuanNama}</td>
                  <td className="px-5 py-3 text-right text-zinc-900">{formatRupiah(l.hppPerUnit)}</td>
                  <td className="px-5 py-3 text-right font-medium text-zinc-900">
                    {formatRupiah(l.subtotalNilai)}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{l.catatan || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50/60">
                <td colSpan={4} className="px-5 py-3 text-right text-sm font-semibold text-zinc-700">
                  Total
                </td>
                <td className="px-5 py-3 text-right text-base font-bold text-zinc-900">
                  {formatRupiah(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
