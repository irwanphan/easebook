/**
 * Step 2 — Periode pembukuan + PPN default.
 *
 * Dua nilai berbeda dengan storage berbeda:
 *  - `awalPeriode` → command Rust `operasional_konfigurasi_set` (SQLite).
 *  - `ppnPersen`   → localStorage `easybook-pengaturan-transaksi`.
 *
 * Dijadikan satu step karena keduanya adalah keputusan akuntansi awal
 * yang biasanya diisi bareng saat setup.
 */
import { useCallback, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, Info, Percent } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
import { useEffect } from "react";

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

type Props = {
  onSaved: () => Promise<void>;
};

export function StepPeriodePembukuan({ onSaved }: Props) {
  const [awalPeriode, setAwalPeriode] = useState<string>("");
  const [ppnPersen, setPpnPersen] = useState<number>(() => loadPengaturanTransaksi().ppnPersen);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);
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
    setSavedHint(null);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedHint(null);

    if (!awalPeriode) {
      setError("Tanggal awal periode wajib diisi.");
      return;
    }
    if (!Number.isFinite(ppnPersen) || ppnPersen < 0 || ppnPersen > 100) {
      setError("Nilai PPN harus antara 0 dan 100 (persen).");
      return;
    }

    setSaving(true);
    try {
      await operasionalKonfigurasiSet({ awalPeriode });
      persistPengaturanTransaksi({ ppnPersen: Math.round(ppnPersen * 100) / 100 });
      setPeriodeSudahDiset(true);
      setSavedHint("Periode pembukuan dan PPN disimpan.");
      await onSaved();
    } catch (err) {
      setError(tauriErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

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
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            >
              {error}
            </div>
          ) : null}
          {savedHint ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{savedHint}</span>
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
                  setSavedHint(null);
                }}
                className={`${inputClass} pl-9`}
                disabled={saving}
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

          <div>
            <label htmlFor="onb-ppn" className="block text-sm font-medium text-zinc-700">
              Tarif PPN default
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">
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
                disabled={saving}
              />
              <Percent
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
                aria-hidden
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan periode & PPN"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
