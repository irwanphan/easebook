/**
 * Step — Pilih modul bisnis yang akan dipakai.
 *
 * Tujuan UX: sederhanakan UI sidebar di awal dengan menyembunyikan
 * modul yang tidak relevan. User awam yang baru memulai usaha jasa
 * murni, misalnya, tidak perlu melihat menu "Pembelian" atau
 * "Inventory" dari hari pertama — itu hanya menambah noise & decision
 * fatigue.
 *
 * Pilihan disimpan via {@link saveModulAktif} (localStorage). Sidebar
 * akan otomatis re-filter berkat {@link useModulAktif} yang men-listen
 * custom event yang di-dispatch oleh storage.
 *
 * Aturan submit:
 *  - Minimal **1 modul** harus dipilih. Tanpa modul apapun, aplikasi
 *    hampir tidak ada gunanya.
 *  - Tidak ada side-effect lain di backend — semua mapping ke
 *    konfigurasi DB sudah jalan terpisah lewat step CoA & lainnya.
 *
 * Setelah onboarding selesai, user tetap dapat mengubah pilihan ini
 * dari menu Pengaturan (TODO: tautan ke halaman pengaturan modul).
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { AlertTriangle, Blocks, Info } from "lucide-react";
import { TokoOption } from "@/components/ui/TokoOption";
import {
  MODUL_CATALOG,
  type ModulBisnisId,
} from "@/features/modul-bisnis/modulBisnisCatalog";
import {
  loadModulAktif,
  saveModulAktif,
} from "@/features/modul-bisnis/modulBisnisStorage";
import { OnboardingStepHeader } from "@/features/onboarding/components/OnboardingStepHeader";
import type { OnboardingStepHandle } from "@/features/onboarding/stepHandle";

type Props = {
  onSaved: () => Promise<void>;
};

export const StepModulBisnis = forwardRef<OnboardingStepHandle, Props>(
  function StepModulBisnis({ onSaved }, ref) {
    const [aktif, setAktif] = useState<Set<ModulBisnisId>>(() => loadModulAktif());
    const [error, setError] = useState<string | null>(null);

    // Re-sync state saat step re-mount (mis. user navigasi mundur lalu
    // maju lagi) supaya menampilkan pilihan terbaru dari storage.
    useEffect(() => {
      setAktif(loadModulAktif());
    }, []);

    const toggle = useCallback((id: ModulBisnisId) => {
      setError(null);
      setAktif((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    const jumlahAktif = aktif.size;
    const totalModul = MODUL_CATALOG.length;

    const summary = useMemo(() => {
      if (jumlahAktif === 0) return "Belum ada modul dipilih.";
      if (jumlahAktif === totalModul) return "Semua modul aktif.";
      return `${jumlahAktif} dari ${totalModul} modul aktif.`;
    }, [jumlahAktif, totalModul]);

    useImperativeHandle(
      ref,
      () => ({
        async submit() {
          setError(null);
          if (aktif.size === 0) {
            setError(
              "Pilih minimal satu modul. Anda tidak bisa memakai aplikasi tanpa modul aktif.",
            );
            return false;
          }
          saveModulAktif(aktif);
          await onSaved();
          return true;
        },
      }),
      [aktif, onSaved],
    );

    return (
      <div className="flex flex-1 flex-col gap-6">
        <OnboardingStepHeader
          icon={Blocks}
          judul="Modul bisnis"
          wajib
          deskripsi="Pilih modul yang ingin Anda pakai. Modul yang tidak dicentang akan disembunyikan dari menu untuk menjaga tampilan tetap ringkas. Anda bisa mengubahnya kembali kapan saja dari Pengaturan."
        />

        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Modul mempengaruhi <span className="font-semibold">tampilan menu</span> saja —
            data Anda tetap aman bila modul dinonaktifkan kemudian diaktifkan lagi.
          </span>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Modul bisnis aktif</legend>
          {MODUL_CATALOG.map((modul) => {
            const Icon = modul.icon;
            const checked = aktif.has(modul.id);
            return (
              <TokoOption
                key={modul.id}
                name="modul-bisnis"
                value={modul.id}
                selectionMode="checkbox"
                checked={checked}
                onChange={() => toggle(modul.id)}
                title={
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className={[
                        "inline-flex h-6 w-6 items-center justify-center rounded-lg",
                        checked
                          ? "bg-brand-100 text-brand-700"
                          : "bg-zinc-100 text-zinc-500",
                      ].join(" ")}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {modul.label}
                  </span>
                }
                description={modul.deskripsi}
              />
            );
          })}
        </fieldset>

        <p className="text-right text-xs font-medium text-zinc-500">{summary}</p>
      </div>
    );
  },
);
