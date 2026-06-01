/**
 * Step 1 — Informasi perusahaan.
 *
 * Sumber kebenaran: localStorage `easybook-informasi-perusahaan` (existing).
 * Validasi minimal: nama perusahaan wajib (tidak boleh kosong/whitespace).
 *
 * Tidak punya tombol "Simpan" — penyimpanan dipicu oleh tombol Lanjut
 * di footer global lewat `OnboardingStepHandle.submit()`.
 */
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { Building2 } from "lucide-react";
import { TokoInput } from "@/components/ui/TokoInput";
import {
  loadInformasiPerusahaan,
  persistInformasiPerusahaan,
  type InformasiPerusahaan,
} from "@/features/pengaturan/informasiPerusahaanStorage";
import { OnboardingStepHeader } from "@/features/onboarding/components/OnboardingStepHeader";
import type { OnboardingStepHandle } from "@/features/onboarding/stepHandle";

const textareaClass =
  "mt-1 min-h-[88px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (t === "") return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

type Props = {
  /** Dipanggil setelah submit sukses, agar parent re-fetch checklist. */
  onSaved: () => Promise<void>;
};

export const StepInfoPerusahaan = forwardRef<OnboardingStepHandle, Props>(
  function StepInfoPerusahaan({ onSaved }, ref) {
    const [data, setData] = useState<InformasiPerusahaan>(() => loadInformasiPerusahaan());
    const [error, setError] = useState<string | null>(null);

    const update = useCallback((patch: Partial<InformasiPerusahaan>) => {
      setData((prev) => ({ ...prev, ...patch }));
      setError(null);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        async submit() {
          if (data.namaPerusahaan.trim().length === 0) {
            setError("Nama perusahaan wajib diisi.");
            return false;
          }
          if (!isValidEmail(data.emailPerusahaan)) {
            setError("Format email tidak valid.");
            return false;
          }
          persistInformasiPerusahaan({
            namaPerusahaan: data.namaPerusahaan.trim(),
            alamat: data.alamat.trim(),
            nomorTelepon: data.nomorTelepon.trim(),
            emailPerusahaan: data.emailPerusahaan.trim(),
          });
          await onSaved();
          return true;
        },
      }),
      [data, onSaved],
    );

    return (
      <div className="flex flex-1 flex-col gap-6">
        <OnboardingStepHeader
          icon={Building2}
          judul="Informasi perusahaan"
          wajib
          deskripsi="Data ini muncul di kop dokumen (faktur, kwitansi, laporan) dan dipakai sebagai identitas utama aplikasi."
        />

        <div className="flex flex-1 flex-col gap-5">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            >
              {error}
            </div>
          ) : null}

          <TokoInput
            label={
              <span>
                Nama perusahaan <span className="text-rose-600">*</span>
              </span>
            }
            name="namaPerusahaan"
            value={data.namaPerusahaan}
            onChange={(e) => update({ namaPerusahaan: e.target.value })}
            placeholder="Nama legal atau nama dagang"
            autoComplete="organization"
            autoFocus
          />

          <div>
            <label htmlFor="onb-alamat" className="block text-sm font-medium text-zinc-700">
              Alamat
            </label>
            <textarea
              id="onb-alamat"
              name="alamat"
              value={data.alamat}
              onChange={(e) => update({ alamat: e.target.value })}
              placeholder="Alamat kantor / toko"
              className={textareaClass}
              rows={3}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TokoInput
              label="Nomor telepon"
              name="nomorTelepon"
              type="tel"
              value={data.nomorTelepon}
              onChange={(e) => update({ nomorTelepon: e.target.value })}
              placeholder="021-1234567"
              autoComplete="tel"
            />
            <TokoInput
              label="Email perusahaan"
              name="emailPerusahaan"
              type="email"
              value={data.emailPerusahaan}
              onChange={(e) => update({ emailPerusahaan: e.target.value })}
              placeholder="admin@perusahaan.co.id"
              autoComplete="email"
            />
          </div>
        </div>
      </div>
    );
  },
);
