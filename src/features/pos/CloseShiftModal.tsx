import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, PiggyBank } from "lucide-react";
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
  const [kembaliText, setKembaliText] = useState("");
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
          setKembaliText("0");
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
  const kembalikan = useMemo(() => parseRupiahInput(kembaliText), [kembaliText]);
  const selisih = useMemo(
    () => uangAkhir - (rekap?.uangAkhirEkspektasi ?? 0),
    [uangAkhir, rekap?.uangAkhirEkspektasi],
  );
  const sisaDiLaci = Math.max(0, uangAkhir - kembalikan);
  const kembalikanInvalid = kembalikan < 0 || kembalikan > uangAkhir;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!shift) return;
    if (kembalikanInvalid) {
      setError("Jumlah yang dikembalikan harus 0 sampai uang fisik di laci.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await shiftClose({
        id: shift.id,
        uangAkhirAktual: uangAkhir,
        kembalikanKeUtama: kembalikan,
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

            {/* Pengembalian ke Kas Utama */}
            <div>
              <label htmlFor="cs-kembali" className="block text-sm font-medium text-zinc-700">
                Kembalikan ke {shift?.kasUtamaNama ? <span className="text-zinc-900">{shift.kasUtamaNama}</span> : "Kas Operasional Utama"}
              </label>
              <p className="mt-0.5 text-xs text-zinc-500">
                Berapa rupiah yang ingin dipindahkan dari laci kasir balik ke kas operasional. Sisanya stay di laci sebagai modal awal shift berikutnya.
              </p>
              <input
                id="cs-kembali"
                inputMode="numeric"
                className={inputClass}
                value={kembaliText}
                onChange={(e) => setKembaliText(e.target.value)}
              />
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    onClick={() => setKembaliText("0")}
                  >
                    Biarkan di laci
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    onClick={() => setKembaliText(String(uangAkhir))}
                  >
                    Kembalikan semua
                  </button>
                  {rekap?.shift?.modalAwal ? (
                    <button
                      type="button"
                      className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                      onClick={() =>
                        setKembaliText(String(Math.max(0, uangAkhir - rekap.shift.modalAwal)))
                      }
                      title="Sisakan jumlah = modal awal shift, kembalikan selebihnya"
                    >
                      Sisakan = modal awal
                    </button>
                  ) : null}
                </div>
                <span
                  className={`font-semibold ${
                    kembalikanInvalid ? "text-rose-700" : "text-zinc-700"
                  }`}
                >
                  Sisa di laci: {formatRupiah(sisaDiLaci)}
                </span>
              </div>
            </div>

            {/* Ringkasan jurnal yang akan terbentuk */}
            {(selisih !== 0 || kembalikan > 0) && shift?.kasKasirKode ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-900">
                  <PiggyBank className="h-3.5 w-3.5" aria-hidden />
                  Jurnal yang akan dibentuk
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-sky-900">
                  {selisih > 0 ? (
                    <li className="flex items-center gap-1.5">
                      <span className="rounded-md bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-sky-200">
                        D {shift.kasKasirNama || shift.kasKasirKode}
                      </span>
                      <ArrowRight className="h-3 w-3" aria-hidden />
                      <span className="rounded-md bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-sky-200">
                        K {shift.akunSelisihKasNama || shift.akunSelisihKasKode || "Akun Selisih Kas"}
                      </span>
                      <span className="ml-auto font-semibold">{formatRupiah(selisih)}</span>
                    </li>
                  ) : null}
                  {selisih < 0 ? (
                    <li className="flex items-center gap-1.5">
                      <span className="rounded-md bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-sky-200">
                        D {shift.akunSelisihKasNama || shift.akunSelisihKasKode || "Akun Selisih Kas"}
                      </span>
                      <ArrowRight className="h-3 w-3" aria-hidden />
                      <span className="rounded-md bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-sky-200">
                        K {shift.kasKasirNama || shift.kasKasirKode}
                      </span>
                      <span className="ml-auto font-semibold">{formatRupiah(-selisih)}</span>
                    </li>
                  ) : null}
                  {kembalikan > 0 ? (
                    <li className="flex items-center gap-1.5">
                      <span className="rounded-md bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-sky-200">
                        D {shift.kasUtamaNama || shift.kasUtamaKode || "Kas Utama"}
                      </span>
                      <ArrowRight className="h-3 w-3" aria-hidden />
                      <span className="rounded-md bg-white px-1.5 py-0.5 font-medium ring-1 ring-inset ring-sky-200">
                        K {shift.kasKasirNama || shift.kasKasirKode}
                      </span>
                      <span className="ml-auto font-semibold">{formatRupiah(kembalikan)}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

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
