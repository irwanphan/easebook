import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { useGudang } from "@/features/gudang/GudangContext";
import { shiftCarryModal, shiftOpen } from "@/features/pos/posInvoke";
import { usePOS } from "@/features/pos/POSContext";
import { formatRupiah, parseRupiahInput } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

type OpenShiftModalProps = {
  open: boolean;
  onClose?: () => void;
  /** Bila true, modal tidak menyediakan tombol tutup (kasir wajib buka shift). */
  forceOpen?: boolean;
};

export function OpenShiftModal({ open, onClose, forceOpen = false }: OpenShiftModalProps) {
  const { session } = useAuth();
  const { items: gudangItems, loading: gudangLoading } = useGudang();
  const { setShift } = usePOS();

  const [gudangKode, setGudangKode] = useState("");
  const [modalAwalText, setModalAwalText] = useState("");
  const [catatan, setCatatan] = useState("");
  const [carryDefault, setCarryDefault] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = session?.username ?? "";

  useEffect(() => {
    if (!open || !username) return;
    let cancelled = false;
    void (async () => {
      try {
        const carry = await shiftCarryModal(username);
        if (!cancelled) {
          setCarryDefault(carry);
          if (!modalAwalText) setModalAwalText(String(carry || ""));
        }
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, username, modalAwalText]);

  useEffect(() => {
    if (!open) return;
    if (!gudangKode && gudangItems.length > 0) {
      setGudangKode(gudangItems[0].kode);
    }
  }, [open, gudangItems, gudangKode]);

  const modalAwal = useMemo(() => parseRupiahInput(modalAwalText), [modalAwalText]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username) {
      setError("Sesi kasir tidak valid.");
      return;
    }
    if (!gudangKode) {
      setError("Pilih gudang dulu.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await shiftOpen({
        kasirUsername: username,
        gudangKode,
        modalAwal,
        catatan: catatan.trim(),
      });
      setShift(result);
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Buka shift kasir"
      onClose={() => {
        if (!forceOpen && onClose) onClose();
      }}
      panelClassName="max-w-md"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!forceOpen && onClose ? (
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
          ) : null}
          <Button type="submit" form="form-open-shift" disabled={submitting}>
            {submitting ? "Membuka…" : "Buka shift"}
          </Button>
        </div>
      }
    >
      <form id="form-open-shift" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <div>
          <label htmlFor="sh-gudang" className="block text-sm font-medium text-zinc-700">
            Gudang
          </label>
          <select
            id="sh-gudang"
            className={inputClass}
            value={gudangKode}
            onChange={(e) => setGudangKode(e.target.value)}
            disabled={gudangLoading || gudangItems.length === 0}
          >
            <option value="">— pilih gudang —</option>
            {gudangItems.map((g) => (
              <option key={g.kode} value={g.kode}>
                {g.kode} — {g.nama}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sh-modal" className="block text-sm font-medium text-zinc-700">
            Modal awal (kas tunai di laci)
          </label>
          <input
            id="sh-modal"
            inputMode="numeric"
            className={inputClass}
            value={modalAwalText}
            onChange={(e) => setModalAwalText(e.target.value)}
            placeholder="0"
            autoFocus
          />
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-500">
            <span>{formatRupiah(modalAwal)}</span>
            {carryDefault != null && carryDefault > 0 ? (
              <button
                type="button"
                onClick={() => setModalAwalText(String(carryDefault))}
                className="text-brand-600 hover:underline"
              >
                Pakai saldo shift terakhir ({formatRupiah(carryDefault)})
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="sh-catatan" className="block text-sm font-medium text-zinc-700">
            Catatan (opsional)
          </label>
          <input
            id="sh-catatan"
            className={inputClass}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="mis. shift pagi, kasir lapor jam 08.00"
          />
        </div>
      </form>
    </Modal>
  );
}
