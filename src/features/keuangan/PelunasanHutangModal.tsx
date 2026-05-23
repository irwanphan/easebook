import { useEffect, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { AkunKeuanganRow } from "@/data/keuangan";
import type { HutangBelumLunasRow, PelunasanHutangPayload } from "@/data/pelunasanHutang";
import { tauriErrorMessage } from "@/lib/tauriError";
import { Save, X } from "lucide-react";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";

const FORM_ID = "pelunasan-hutang-form";

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export type PelunasanHutangModalProps = {
  open: boolean;
  faktur: HutangBelumLunasRow | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function PelunasanHutangModal({ open, faktur, onClose, onSaved }: PelunasanHutangModalProps) {
  const [tanggal, setTanggal] = useState(todayLocalISODate);
  const [kasKode, setKasKode] = useState("");
  const [catatan, setCatatan] = useState("");
  const [akunKasList, setAkunKasList] = useState<AkunKeuanganRow[]>([]);
  const [akunKasLoading, setAkunKasLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setAkunKasLoading(true);
      try {
        const list = await invoke<AkunKeuanganRow[]>("akun_keuangan_list");
        if (!cancelled) {
          const kas = list.filter((a) => a.isAkunKas);
          setAkunKasList(kas);
          setKasKode((prev) => prev || kas[0]?.kode || "");
        }
      } catch {
        if (!cancelled) setAkunKasList([]);
      } finally {
        if (!cancelled) setAkunKasLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTanggal(todayLocalISODate());
    setCatatan("");
    setError(null);
    setKasKode("");
  }, [open, faktur?.nomor]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!faktur || submitting) return;
    if (!kasKode.trim()) {
      setError("Pilih akun kas pembayaran.");
      return;
    }

    const payload: PelunasanHutangPayload = {
      nomorFaktur: faktur.nomor,
      tanggal: tanggal.trim(),
      kasKode: kasKode.trim(),
      jumlah: Math.round(faktur.total),
      catatan: catatan.trim(),
    };

    setSubmitting(true);
    setError(null);
    try {
      await invoke("pelunasan_hutang_apply", { payload });
      await onSaved();
      onClose();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || !faktur || akunKasLoading;

  return (
    <Modal
      open={open}
      title="Pelunasan hutang"
      panelClassName="max-w-lg"
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
            Batal
          </Button>
          <Button type="submit" form={FORM_ID} disabled={disabled || akunKasList.length === 0}>
            <Save className="h-4 w-4" aria-hidden />
            {submitting ? "Menyimpan…" : "Simpan pelunasan"}
          </Button>
        </div>
      }
    >
      {!faktur ? (
        <p className="text-sm text-zinc-500">Pilih faktur dari daftar hutang.</p>
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">No. faktur pembelian</p>
            <p className="mt-0.5 font-mono text-xs font-semibold text-brand-700">{faktur.nomor}</p>
            <p className="mt-2 font-medium text-zinc-900">{faktur.pemasokNama}</p>
            <p className="mt-2 text-lg font-bold text-zinc-900">{formatRupiah(faktur.total)}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Jatuh tempo: {formatTanggal(faktur.jatuhTempo)} · Faktur: {formatTanggal(faktur.tanggalFaktur)}
            </p>
          </div>

          <div>
            <label htmlFor="ph-tgl" className="block text-sm font-medium text-zinc-700">
              Tanggal pelunasan
            </label>
            <TokoInput
              id="ph-tgl"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              disabled={disabled}
              required
            />
          </div>

          <div>
            <label htmlFor="ph-kas" className="block text-sm font-medium text-zinc-700">
              Dibayar dari (kas / bank)
            </label>
            <TokoSelect
              id="ph-kas"
              value={kasKode}
              onChange={(e) => setKasKode(e.target.value)}
              disabled={disabled}
              required
            >
              <option value="">— Pilih akun kas —</option>
              {akunKasList.map((a) => (
                <option key={a.kode} value={a.kode}>
                  {a.kode} — {a.nama}
                </option>
              ))}
            </TokoSelect>
            {akunKasLoading ? (
              <p className="mt-1.5 text-xs text-zinc-400">Memuat akun kas…</p>
            ) : akunKasList.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-700">Belum ada akun kas di Daftar akun.</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="ph-catatan" className="block text-sm font-medium text-zinc-700">
              Catatan
            </label>
            <TokoInput
              id="ph-catatan"
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              disabled={disabled}
              placeholder="opsional"
            />
          </div>

          <p className="text-xs text-zinc-500">
            Jurnal: debet hutang, kredit kas. Faktur ditandai lunas dan tercatat di daftar pelunasan hutang.
          </p>
        </form>
      )}
    </Modal>
  );
}
