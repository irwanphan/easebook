/**
 * Step 1 — Informasi perusahaan.
 *
 * Sumber kebenaran: localStorage `easybook-informasi-perusahaan` (existing).
 * Kita pakai store yang sama agar nilai langsung muncul di `PengaturanPage`
 * tanpa migrasi data.
 *
 * Validasi minimal: nama perusahaan wajib (tidak boleh kosong/whitespace).
 */
import { useCallback, useState, type FormEvent } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TokoInput } from "@/components/ui/TokoInput";
import {
  loadInformasiPerusahaan,
  persistInformasiPerusahaan,
  type InformasiPerusahaan,
} from "@/features/pengaturan/informasiPerusahaanStorage";
import { OnboardingStepHeader } from "@/features/onboarding/components/OnboardingStepHeader";

const textareaClass =
  "mt-1 min-h-[88px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (t === "") return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

type Props = {
  onSaved: () => Promise<void>;
};

export function StepInfoPerusahaan({ onSaved }: Props) {
  const [data, setData] = useState<InformasiPerusahaan>(() => loadInformasiPerusahaan());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const update = useCallback((patch: Partial<InformasiPerusahaan>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setError(null);
    setSavedHint(null);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (data.namaPerusahaan.trim().length === 0) {
      setError("Nama perusahaan wajib diisi.");
      return;
    }
    if (!isValidEmail(data.emailPerusahaan)) {
      setError("Format email tidak valid.");
      return;
    }
    setSaving(true);
    try {
      persistInformasiPerusahaan({
        namaPerusahaan: data.namaPerusahaan.trim(),
        alamat: data.alamat.trim(),
        nomorTelepon: data.nomorTelepon.trim(),
        emailPerusahaan: data.emailPerusahaan.trim(),
      });
      setSavedHint("Informasi perusahaan disimpan.");
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <OnboardingStepHeader
        icon={Building2}
        judul="Informasi perusahaan"
        wajib
        deskripsi="Data ini muncul di kop dokumen (faktur, kwitansi, laporan) dan dipakai sebagai identitas utama aplikasi."
      />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5" id="onboarding-step-form">
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

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan informasi"}
          </Button>
        </div>
      </form>
    </div>
  );
}
