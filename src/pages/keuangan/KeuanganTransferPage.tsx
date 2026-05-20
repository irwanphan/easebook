import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Pencil, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { TransferKasListRow } from "@/data/transferKas";
import { TransferKasModal } from "@/features/keuangan/TransferKasModal";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultTanggalDariBulanIni(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultTanggalSampaiBulanIni(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTanggal(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function KeuanganTransferPage() {
  const [tanggalDari, setTanggalDari] = useState(defaultTanggalDariBulanIni);
  const [tanggalSampai, setTanggalSampai] = useState(defaultTanggalSampaiBulanIni);
  const [rows, setRows] = useState<TransferKasListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const rentangInvalid = useMemo(() => {
    if (!tanggalDari || !tanggalSampai) return true;
    return tanggalSampai < tanggalDari;
  }, [tanggalDari, tanggalSampai]);

  const totalKirim = useMemo(
    () => rows.reduce((s, r) => s + r.nominalKirim, 0),
    [rows],
  );
  const totalBiaya = useMemo(
    () => rows.reduce((s, r) => s + r.biayaTransfer, 0),
    [rows],
  );

  const fetchRows = useCallback(async () => {
    if (rentangInvalid) {
      setError("Tanggal akhir tidak boleh sebelum tanggal mulai.");
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<TransferKasListRow[]>("transfer_kas_list", {
        tanggalDari: tanggalDari.trim(),
        tanggalSampai: tanggalSampai.trim(),
      });
      setRows(list);
    } catch (e) {
      setError(tauriErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [rentangInvalid, tanggalDari, tanggalSampai]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  function handleSuccess(nomor: string) {
    setModalOpen(false);
    setFlash(`Transfer tersimpan dengan nomor ${nomor}.`);
    void fetchRows();
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Transfer antar kas"
        description="Pindahkan saldo antar rekening kas / bank. Setiap transfer otomatis tercatat di jurnal umum dan audit log."
        actions={
          <Button type="button" onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            Buat transfer
          </Button>
        }
      />

      {flash ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {flash}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 border-b border-zinc-100 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <div>
              <label htmlFor="trf-dari" className="block text-sm font-medium text-zinc-700">
                Tanggal mulai
              </label>
              <input
                id="trf-dari"
                type="date"
                value={tanggalDari}
                onChange={(e) => setTanggalDari(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="trf-sampai" className="block text-sm font-medium text-zinc-700">
                Tanggal akhir
              </label>
              <input
                id="trf-sampai"
                type="date"
                value={tanggalSampai}
                onChange={(e) => setTanggalSampai(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void fetchRows()}
            disabled={loading}
          >
            {loading ? "Memuat…" : "Terapkan filter"}
          </Button>
        </div>

        <div className="border-b border-zinc-100 px-6 py-3">
          <p className="text-sm text-zinc-500">
            {loading
              ? "Memuat daftar…"
              : rows.length === 0
                ? "Tidak ada transfer pada periode ini."
                : `${rows.length} transfer · total kirim ${formatRupiah(totalKirim)} · biaya ${formatRupiah(totalBiaya)}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">No.</th>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Kas asal → tujuan</th>
                <th className="px-5 py-3 text-right">Dikirim</th>
                <th className="px-5 py-3 text-right">Diterima</th>
                <th className="px-5 py-3 text-right">Biaya</th>
                <th className="px-5 py-3">Akun biaya</th>
                <th className="px-5 py-3">Catatan</th>
                <th className="w-24 px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-zinc-500">
                    Memuat transfer…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-zinc-500">
                    Belum ada transfer pada periode ini. Klik <strong>Buat transfer</strong>.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.nomor} className="bg-white hover:bg-zinc-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">
                      {row.nomor}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{formatTanggal(row.tanggal)}</td>
                    <td className="px-5 py-3 text-zinc-700">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs text-zinc-500">
                          {row.akunSumberKode}
                        </span>
                        <span className="text-zinc-600">— {row.akunSumberNama || "—"}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                        <span className="font-mono text-xs text-zinc-500">
                          {row.akunTujuanKode}
                        </span>
                        <span className="text-zinc-600">— {row.akunTujuanNama || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-zinc-900">
                      {formatRupiah(row.nominalKirim)}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-700">
                      {formatRupiah(row.nominalTerima)}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-700">
                      {row.biayaTransfer > 0 ? formatRupiah(row.biayaTransfer) : "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-700">
                      {row.akunBiayaKode ? (
                        <>
                          <span className="font-mono text-xs text-zinc-500">
                            {row.akunBiayaKode}
                          </span>
                          {row.akunBiayaNama ? (
                            <span className="ml-1.5 text-zinc-600">— {row.akunBiayaNama}</span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className="max-w-[200px] truncate px-5 py-3 text-zinc-600"
                      title={row.catatan || undefined}
                    >
                      {row.catatan || "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/keuangan/transfer/ubah/${encodeURIComponent(row.nomor)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                        aria-label={`Ubah transfer ${row.nomor}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Ubah
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <TransferKasModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
