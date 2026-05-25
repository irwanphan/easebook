import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { shiftClose, shiftRekap } from "@/features/pos/posInvoke";
import { usePOS } from "@/features/pos/POSContext";
import type { PosShiftRekap } from "@/data/pos";
import { formatRupiah, parseRupiahInput } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

type CloseShiftModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CloseShiftModal({ open, onClose }: CloseShiftModalProps) {
  const { shift, refreshShift, clearCart } = usePOS();

  const [rekap, setRekap] = useState<PosShiftRekap | null>(null);
  const [loading, setLoading] = useState(false);
  const [uangText, setUangText] = useState("");
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !shift) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const r = await shiftRekap(shift.id);
        if (!cancelled) {
          setRekap(r);
          setUangText(String(r.uangAkhirEkspektasi || 0));
        }
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, shift]);

  const uangAkhir = useMemo(() => parseRupiahInput(uangText), [uangText]);
  const selisih = useMemo(
    () => uangAkhir - (rekap?.uangAkhirEkspektasi ?? 0),
    [uangAkhir, rekap?.uangAkhirEkspektasi],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!shift) return;
    setSubmitting(true);
    setError(null);
    try {
      await shiftClose({
        id: shift.id,
        uangAkhirAktual: uangAkhir,
        catatan: catatan.trim(),
      });
      await refreshShift();
      clearCart();
      onClose();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Tutup shift kasir"
      onClose={onClose}
      panelClassName="max-w-xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            type="submit"
            form="form-close-shift"
            variant="danger"
            disabled={submitting || loading || !rekap}
          >
            {submitting ? "Menutup…" : "Tutup shift"}
          </Button>
        </div>
      }
    >
      <form id="form-close-shift" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-500">Menghitung rekap…</p>
        ) : !rekap ? (
          <p className="text-sm text-zinc-500">Rekap belum tersedia.</p>
        ) : (
          <>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Modal awal</span>
                <span className="font-medium text-zinc-900">{formatRupiah(rekap.shift.modalAwal)}</span>
              </div>
              <div className="mt-1 flex justify-between text-zinc-600">
                <span>Transaksi shift</span>
                <span className="font-medium text-zinc-900">
                  {rekap.jumlahTransaksi} faktur • {formatRupiah(rekap.totalPenjualan)}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-zinc-600">
                <span>Tunai masuk</span>
                <span className="font-medium text-emerald-700">{formatRupiah(rekap.totalTunaiMasuk)}</span>
              </div>
              <div className="mt-1 flex justify-between text-zinc-600">
                <span>Non-tunai</span>
                <span className="font-medium text-zinc-900">{formatRupiah(rekap.totalNonTunai)}</span>
              </div>
              <div className="mt-2 border-t border-zinc-200 pt-2 text-sm">
                <div className="flex justify-between font-semibold text-zinc-900">
                  <span>Ekspektasi kas di laci</span>
                  <span>{formatRupiah(rekap.uangAkhirEkspektasi)}</span>
                </div>
              </div>
            </div>

            {rekap.perMetode.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Per metode bayar
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {rekap.perMetode.map((m) => (
                    <li key={m.metodeKode} className="flex justify-between text-zinc-700">
                      <span>
                        {m.metodeNama}
                        <span className="ml-2 text-xs text-zinc-400">({m.jumlahTransaksi}×)</span>
                      </span>
                      <span className={m.isTunai ? "font-medium text-emerald-700" : "font-medium text-zinc-900"}>
                        {formatRupiah(m.totalJumlah)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <label htmlFor="cs-aktual" className="block text-sm font-medium text-zinc-700">
                Uang fisik di laci saat tutup
              </label>
              <input
                id="cs-aktual"
                inputMode="numeric"
                className={inputClass}
                value={uangText}
                onChange={(e) => setUangText(e.target.value)}
                autoFocus
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-zinc-500">{formatRupiah(uangAkhir)}</span>
                <span
                  className={`font-semibold ${
                    selisih === 0
                      ? "text-emerald-700"
                      : selisih > 0
                        ? "text-amber-700"
                        : "text-rose-700"
                  }`}
                >
                  Selisih: {selisih > 0 ? "+" : ""}
                  {formatRupiah(selisih)}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="cs-catatan" className="block text-sm font-medium text-zinc-700">
                Catatan
              </label>
              <input
                id="cs-catatan"
                className={inputClass}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Opsional — alasan selisih, dsb."
              />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
