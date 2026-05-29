import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, LogOut } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { useGudang } from "@/features/gudang/GudangContext";
import {
  posKonfigurasiGet,
  shiftCarryModal,
  shiftOpen,
} from "@/features/pos/posInvoke";
import { usePOS } from "@/features/pos/POSContext";
import {
  isPosKonfigurasiLengkap,
  POS_KONFIGURASI_DEFAULT,
  type PosKonfigurasi,
} from "@/data/posKonfigurasi";
import { formatRupiah, parseRupiahInput } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";
import { TokoInput, TokoSelect } from "@/components/ui/TokoInput";

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
  const [posConfig, setPosConfig] = useState<PosKonfigurasi>(POS_KONFIGURASI_DEFAULT);
  const [configLoading, setConfigLoading] = useState(true);

  const username = session?.username ?? "";
  const konfigurasiLengkap = isPosKonfigurasiLengkap(posConfig);

  useEffect(() => {
    if (!open || !username) return;
    let cancelled = false;
    void (async () => {
      try {
        const carry = await shiftCarryModal(username);
        if (!cancelled) setCarryDefault(carry);
      } catch (e) {
        if (!cancelled) setError(tauriErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, username]);

  // Pre-check konfigurasi POS supaya bisa kasih pesan jelas + escape hatch
  // sebelum user mencoba membuka shift.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setConfigLoading(true);
    void (async () => {
      try {
        const cfg = await posKonfigurasiGet();
        if (!cancelled) setPosConfig(cfg);
      } catch {
        // diam — backend tetap akan menolak saat submit
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

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
          {forceOpen ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void getCurrentWindow().close().catch(() => {});
              }}
              disabled={submitting}
              title="Tutup window POS"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Tutup window
            </Button>
          ) : null}
          {!forceOpen && onClose ? (
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
          ) : null}
          <Button
            type="submit"
            form="form-open-shift"
            disabled={submitting || configLoading || !konfigurasiLengkap}
          >
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

        {!configLoading && !konfigurasiLengkap ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold">Pengaturan POS belum lengkap</p>
              <p className="text-xs leading-relaxed">
                Akun <strong>Kas Operasional Utama</strong> dan <strong>Kas Kasir</strong> wajib dipilih sebelum
                membuka shift. Buka <strong>Pengaturan → Transaksi → POS</strong> di window utama,
                lengkapi pengaturan, lalu buka POS lagi.
              </p>
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="sh-gudang" className="block text-sm font-medium text-zinc-700">
            Gudang
          </label>
          <TokoSelect
            id="sh-gudang"
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
          </TokoSelect>
        </div>

        {/* {konfigurasiLengkap && posConfig.kasUtamaNama && posConfig.kasKasirNama ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs leading-relaxed text-zinc-700">
            Saat shift dibuka, jurnal otomatis: <strong>D</strong> {posConfig.kasKasirNama},{" "}
            <strong>K</strong> {posConfig.kasUtamaNama}, sebesar modal awal.
          </div>
        ) : null} */}

        <div>
          <label htmlFor="sh-modal" className="block text-sm font-medium text-zinc-700">
            Modal awal (kas tunai di laci)
          </label>
          <TokoInput
            id="sh-modal"
            inputMode="numeric"
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
                className="text-brand-600 hover:underline cursor-pointer mt-1"
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
          <TokoInput
            id="sh-catatan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="mis. shift pagi, kasir lapor jam 08.00"
          />
        </div>
      </form>
    </Modal>
  );
}
