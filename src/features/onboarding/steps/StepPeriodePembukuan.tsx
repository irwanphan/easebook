/**
 * Step 2 — Periode pembukuan + PPN default.
 *
 * Tiga nilai di-handle bareng:
 *  - `awalPeriode` (wajib) → command Rust `operasional_konfigurasi_set`.
 *  - `terkenaPajak` → localStorage `easybook-pengaturan-transaksi`.
 *  - `ppnPersen` → localStorage `easybook-pengaturan-transaksi`. Tetap
 *    tersimpan walau `terkenaPajak=false`, supaya kalau user
 *    mengaktifkannya kembali tarif lama tidak hilang.
 *
 * Auto-save dipicu oleh tombol Lanjut di footer global.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { CalendarDays, Info, Percent } from "lucide-react";
import { TokoInput } from "@/components/ui/TokoInput";
import {
  loadPengaturanTransaksi,
  persistPengaturanTransaksi,
} from "@/features/pengaturan/pengaturanTransaksiStorage";
import {
  operasionalKonfigurasiGet,
  operasionalKonfigurasiSet,
} from "@/features/pengaturan/operasionalKonfigurasiInvoke";
import { formatTanggalLokal } from "@/data/operasionalKonfigurasi";
import { tauriErrorMessage } from "@/lib/tauriError";
import { OnboardingStepHeader } from "@/features/onboarding/components/OnboardingStepHeader";
import type { OnboardingStepHandle } from "@/features/onboarding/stepHandle";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

type Props = {
  onSaved: () => Promise<void>;
};

export const StepPeriodePembukuan = forwardRef<OnboardingStepHandle, Props>(
  function StepPeriodePembukuan({ onSaved }, ref) {
    const initialTransaksi = loadPengaturanTransaksi();
    const [awalPeriode, setAwalPeriode] = useState<string>("");
    const [terkenaPajak, setTerkenaPajak] = useState<boolean>(initialTransaksi.terkenaPajak);
    const [ppnPersen, setPpnPersen] = useState<number>(initialTransaksi.ppnPersen);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [periodeSudahDiset, setPeriodeSudahDiset] = useState<boolean>(false);

    useEffect(() => {
      let cancelled = false;
      async function bootstrap() {
        try {
          const cfg = await operasionalKonfigurasiGet();
          if (cancelled) return;
          if (cfg.awalPeriode) {
            setAwalPeriode(cfg.awalPeriode);
            setPeriodeSudahDiset(true);
          }
        } catch (e) {
          if (!cancelled) setError(tauriErrorMessage(e));
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      void bootstrap();
      return () => {
        cancelled = true;
      };
    }, []);

    const updatePpn = useCallback((raw: string) => {
      const n = raw === "" ? 0 : Number.parseFloat(raw);
      setPpnPersen(Number.isFinite(n) ? n : 0);
      setError(null);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        async submit() {
          if (!awalPeriode) {
            setError("Tanggal awal periode wajib diisi.");
            return false;
          }
          if (terkenaPajak) {
            if (!Number.isFinite(ppnPersen) || ppnPersen < 0 || ppnPersen > 100) {
              setError("Nilai PPN harus antara 0 dan 100 (persen).");
              return false;
            }
          }
          try {
            await operasionalKonfigurasiSet({ awalPeriode });
            persistPengaturanTransaksi({
              terkenaPajak,
              ppnPersen: Number.isFinite(ppnPersen)
                ? Math.round(ppnPersen * 100) / 100
                : ppnPersen,
            });
            await onSaved();
            return true;
          } catch (err) {
            setError(tauriErrorMessage(err));
            return false;
          }
        },
      }),
      [awalPeriode, terkenaPajak, ppnPersen, onSaved],
    );

    return (
      <div className="flex flex-1 flex-col gap-6">
        <OnboardingStepHeader
          icon={CalendarDays}
          judul="Periode pembukuan & PPN"
          wajib
          deskripsi="Tanggal pertama pembukuan resmi. Saldo awal dan laporan akan memakai tanggal ini sebagai acuan."
        />

        {loading ? (
          <p className="text-sm text-zinc-500">Memuat pengaturan…</p>
        ) : (
          <div className="flex flex-1 flex-col gap-5">
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                {error}
              </div>
            ) : null}

            <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Apa fungsinya?</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  <li>Saldo awal stok & kas dianggap berlaku per tanggal ini.</li>
                  <li>Laporan keuangan dimulai dari tanggal ini.</li>
                  <li>Tanggal di-kunci setelah ditetapkan. Disarankan tidak diubah lagi.</li>
                </ul>
              </div>
            </div>

            <div>
              <label htmlFor="onb-awal-periode" className="block text-sm font-medium text-zinc-700">
                Tanggal awal periode <span className="text-rose-600">*</span>
              </label>
              <div className="relative mt-1 max-w-xs">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
                  aria-hidden
                />
                <input
                  id="onb-awal-periode"
                  type="date"
                  value={awalPeriode}
                  onChange={(e) => {
                    setAwalPeriode(e.target.value);
                    setError(null);
                  }}
                  className={`${inputClass} pl-9`}
                />
              </div>
              {awalPeriode ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Setara:{" "}
                  <strong className="text-zinc-700">{formatTanggalLokal(awalPeriode)}</strong>
                  {periodeSudahDiset ? " (sudah tersimpan)" : null}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 transition hover:border-zinc-300">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500/30"
                  checked={terkenaPajak}
                  onChange={(e) => {
                    setTerkenaPajak(e.target.checked);
                    setError(null);
                  }}
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-800">
                    Transaksi dikenakan PPN
                  </span>
                  <span className="text-xs text-zinc-500">
                    Hilangkan centang bila usaha Anda tidak memungut PPN. Tarif di bawah
                    tetap tersimpan dan akan dipakai lagi jika diaktifkan kembali.
                  </span>
                </span>
              </label>

              <div>
                <label
                  htmlFor="onb-ppn"
                  className={
                    terkenaPajak
                      ? "block text-sm font-medium text-zinc-700"
                      : "block text-sm font-medium text-zinc-400"
                  }
                >
                  Tarif PPN default
                </label>
                <p
                  className={
                    terkenaPajak
                      ? "mt-0.5 text-xs text-zinc-500"
                      : "mt-0.5 text-xs text-zinc-400"
                  }
                >
                  Dipakai sebagai nilai awal pada faktur penjualan dan pembelian. Bisa diubah per faktur.
                </p>
                <div className="relative mt-1 max-w-xs">
                  <TokoInput
                    id="onb-ppn"
                    name="ppnPersen"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={ppnPersen}
                    onChange={(e) => updatePpn(e.target.value)}
                    className="pr-10"
                    withLabelOffset={false}
                    disabled={!terkenaPajak}
                  />
                  <Percent
                    className={
                      terkenaPajak
                        ? "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
                        : "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300"
                    }
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
