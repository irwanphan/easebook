import { useEffect, useMemo, useState } from "react";
import { Banknote, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { PosMetodeBayar, PosTransaksiResult } from "@/data/pos";
import { metodeBayarList, transaksiCreate } from "@/features/pos/posInvoke";
import { usePOS } from "@/features/pos/POSContext";
import { useAuth } from "@/features/auth/AuthContext";
import { formatRupiah, parseRupiahInput } from "@/lib/format";
import { tauriErrorMessage } from "@/lib/tauriError";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

type Line = {
  uid: string;
  metodeKode: string;
  jumlahText: string;
  refNo: string;
};

function makeUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const QUICK_CASH_DENOMS = [10000, 20000, 50000, 100000];

type POSPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: PosTransaksiResult) => void;
};

export function POSPaymentModal({ open, onClose, onSuccess }: POSPaymentModalProps) {
  const {
    cart,
    total,
    diskonFaktur,
    pajak,
    pelanggan,
    shift,
    clearCart,
  } = usePOS();
  const { session } = useAuth();

  const [metodeList, setMetodeList] = useState<PosMetodeBayar[]>([]);
  const [loadingMetode, setLoadingMetode] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load metode bayar saat modal dibuka
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingMetode(true);
    setError(null);
    void (async () => {
      try {
        const data = await metodeBayarList(true);
        if (cancelled) return;
        setMetodeList(data);
        // Inisialisasi 1 baris: Tunai (atau metode pertama) dengan jumlah = total
        const def = data.find((m) => m.isTunai) ?? data[0];
        if (def) {
          setLines([
            {
              uid: makeUid(),
              metodeKode: def.kode,
              jumlahText: String(total),
              refNo: "",
            },
          ]);
        } else {
          setLines([]);
        }
      } catch (e) {
        if (!cancelled) {
          setError(tauriErrorMessage(e));
          setMetodeList([]);
        }
      } finally {
        if (!cancelled) setLoadingMetode(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, total]);

  const totalBayar = useMemo(
    () => lines.reduce((acc, l) => acc + parseRupiahInput(l.jumlahText), 0),
    [lines],
  );
  const kembalian = Math.max(0, totalBayar - total);
  const kurang = Math.max(0, total - totalBayar);

  function updateLine(uid: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }
  function removeLine(uid: string) {
    setLines((prev) => prev.filter((l) => l.uid !== uid));
  }
  function addLine() {
    const usedKodes = new Set(lines.map((l) => l.metodeKode));
    const next = metodeList.find((m) => !usedKodes.has(m.kode)) ?? metodeList[0];
    if (!next) return;
    setLines((prev) => [
      ...prev,
      { uid: makeUid(), metodeKode: next.kode, jumlahText: String(kurang), refNo: "" },
    ]);
  }

  function applyQuickCash(uid: string, n: number) {
    updateLine(uid, { jumlahText: String(n) });
  }

  async function handleSubmit() {
    setError(null);
    if (!shift) {
      setError("Shift tidak aktif. Buka shift dulu.");
      return;
    }
    if (!session) {
      setError("Sesi kasir tidak valid.");
      return;
    }
    if (cart.length === 0) {
      setError("Keranjang kosong.");
      return;
    }
    if (totalBayar < total) {
      setError(`Pembayaran kurang ${formatRupiah(total - totalBayar)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const pembayaran = lines
        .map((l) => ({
          metodeKode: l.metodeKode,
          jumlah: parseRupiahInput(l.jumlahText),
          refNo: l.refNo.trim(),
        }))
        .filter((p) => p.jumlah > 0 && p.metodeKode);

      const result = await transaksiCreate({
        shiftId: shift.id,
        pelangganKode: pelanggan.kode,
        gudangKode: shift.gudangKode,
        kasirUsername: session.username,
        tanggal: todayIso(),
        diskonFaktur,
        pajak,
        lines: cart.map((line) => ({
          barangKode: line.barangKode,
          qty: line.qty,
          satuanTingkat: line.satuanTingkat,
          hargaSatuan: line.hargaSatuan,
          diskon: line.diskon,
          catatan: line.catatan,
        })),
        pembayaran,
      });
      clearCart();
      onSuccess(result);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Pembayaran"
      onClose={() => {
        if (!submitting) onClose();
      }}
      panelClassName="max-w-xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            {kurang > 0 ? (
              <span className="font-semibold text-rose-700">
                Kurang {formatRupiah(kurang)}
              </span>
            ) : (
              <span className="font-semibold text-emerald-700">
                Kembalian: {formatRupiah(kembalian)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || kurang > 0 || lines.length === 0}
            >
              {submitting ? "Memproses…" : "Selesaikan"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Total tagihan</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-brand-700">
            {formatRupiah(total)}
          </p>
        </div>

        {loadingMetode ? (
          <p className="text-sm text-zinc-500">Memuat metode bayar…</p>
        ) : metodeList.length === 0 ? (
          <p className="text-sm text-rose-700">
            Belum ada metode bayar aktif. Aktifkan di pengaturan metode bayar POS.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {lines.map((l, idx) => {
                const metode = metodeList.find((m) => m.kode === l.metodeKode);
                return (
                  <li key={l.uid} className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className={inputClass + " max-w-[180px]"}
                        value={l.metodeKode}
                        onChange={(e) => updateLine(l.uid, { metodeKode: e.target.value })}
                      >
                        {metodeList.map((m) => (
                          <option key={m.kode} value={m.kode}>
                            {m.nama}
                          </option>
                        ))}
                      </select>
                      <input
                        inputMode="numeric"
                        placeholder="Nominal"
                        className={inputClass + " max-w-[180px] text-right font-semibold"}
                        value={l.jumlahText}
                        onChange={(e) => updateLine(l.uid, { jumlahText: e.target.value })}
                      />
                      {!metode?.isTunai ? (
                        <input
                          placeholder="Ref. transfer/EDC"
                          className={inputClass + " flex-1 min-w-[140px]"}
                          value={l.refNo}
                          onChange={(e) => updateLine(l.uid, { refNo: e.target.value })}
                        />
                      ) : null}
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeLine(l.uid)}
                          className="rounded-md p-1 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    {metode?.isTunai ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applyQuickCash(l.uid, total)}
                          className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Pas ({formatRupiah(total)})
                        </button>
                        {QUICK_CASH_DENOMS.filter((n) => n >= total).slice(0, 4).map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => applyQuickCash(l.uid, n)}
                            className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            {formatRupiah(n)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {idx === lines.length - 1 ? null : <div className="mt-2" />}
                  </li>
                );
              })}
            </ul>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addLine}
              disabled={metodeList.length <= lines.length}
            >
              <Plus className="h-4 w-4" />
              Tambah metode (split tender)
            </Button>

            <div className="rounded-xl bg-zinc-50/60 p-3 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span className="inline-flex items-center gap-1">
                  <Banknote className="h-4 w-4" /> Total bayar
                </span>
                <span className="font-semibold text-zinc-900">{formatRupiah(totalBayar)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
