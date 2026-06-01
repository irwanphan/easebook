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
import { Blocks, Info, Lock } from "lucide-react";
import { TokoOption } from "@/components/ui/TokoOption";
import {
  MODUL_CATALOG,
  type ModulBisnisId,
  type ModulBisnisMeta,
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

/** Render satu kartu modul — terkunci bila `wajib`, toggleable bila tidak. */
function ModulCard({
  modul,
  checked,
  onToggle,
}: {
  modul: ModulBisnisMeta;
  checked: boolean;
  onToggle: (id: ModulBisnisId) => void;
}) {
  const Icon = modul.icon;
  return (
    <TokoOption
      name="modul-bisnis"
      value={modul.id}
      selectionMode="checkbox"
      checked={checked}
      disabled={modul.wajib}
      onChange={() => onToggle(modul.id)}
      badge={
        modul.wajib ? (
          <span className="inline-flex text-sm h-4 w-4 items-center justify-center gap-1">
            <Lock className="h-3 w-3" strokeWidth={2.5} aria-hidden />
          </span>
        ) : undefined
      }
      badgeVariant={modul.wajib ? "brand" : "neutral"}
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
}

export const StepModulBisnis = forwardRef<OnboardingStepHandle, Props>(
  function StepModulBisnis({ onSaved }, ref) {
    const [aktif, setAktif] = useState<Set<ModulBisnisId>>(() => loadModulAktif());

    // Re-sync state saat step re-mount (mis. user navigasi mundur lalu
    // maju lagi) supaya menampilkan pilihan terbaru dari storage.
    useEffect(() => {
      setAktif(loadModulAktif());
    }, []);

    const { modulInti, modulOpsional } = useMemo(() => {
      const inti: ModulBisnisMeta[] = [];
      const opsional: ModulBisnisMeta[] = [];
      for (const m of MODUL_CATALOG) {
        if (m.wajib) inti.push(m);
        else opsional.push(m);
      }
      return { modulInti: inti, modulOpsional: opsional };
    }, []);

    const toggle = useCallback((id: ModulBisnisId) => {
      setAktif((prev) => {
        // Defensive: jangan pernah toggle modul inti walau dipanggil
        // (UI sudah disabled, tapi tetap kunci di logic).
        const meta = MODUL_CATALOG.find((m) => m.id === id);
        if (meta?.wajib) return prev;
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    const opsionalAktif = modulOpsional.filter((m) => aktif.has(m.id)).length;

    const summary = useMemo(() => {
      if (modulOpsional.length === 0) return null;
      if (opsionalAktif === 0) return "Tidak ada modul opsional yang dipilih.";
      if (opsionalAktif === modulOpsional.length)
        return "Semua modul opsional aktif.";
      return `${opsionalAktif} dari ${modulOpsional.length} modul opsional aktif.`;
    }, [opsionalAktif, modulOpsional.length]);

    useImperativeHandle(
      ref,
      () => ({
        async submit() {
          // Modul inti selalu masuk — storage layer juga menjamin ini.
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
          deskripsi="Penjualan, Pembelian, dan Inventory adalah modul inti — selalu aktif. Modul opsional di bawahnya bisa Anda nyalakan/matikan sesuai kebutuhan. Pilihan ini bisa diubah kapan saja dari Pengaturan."
        />

        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Modul mempengaruhi <span className="font-semibold">tampilan menu</span> saja —
            data Anda tetap aman bila modul dinonaktifkan kemudian diaktifkan lagi.
          </span>
        </div>

        {modulInti.length > 0 ? (
          <fieldset className="flex flex-col gap-3">
            {/* <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Modul inti
            </legend> */}
            {modulInti.map((modul) => (
              <ModulCard
                key={modul.id}
                modul={modul}
                checked
                onToggle={toggle}
              />
            ))}
          </fieldset>
        ) : null}

        {modulOpsional.length > 0 ? (
          <fieldset className="flex flex-col gap-3">
            {/* <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Modul opsional
            </legend> */}
            {modulOpsional.map((modul) => (
              <ModulCard
                key={modul.id}
                modul={modul}
                checked={aktif.has(modul.id)}
                onToggle={toggle}
              />
            ))}
            {summary ? (
              <p className="text-right text-xs font-medium text-zinc-500">{summary}</p>
            ) : null}
          </fieldset>
        ) : null}
      </div>
    );
  },
);
