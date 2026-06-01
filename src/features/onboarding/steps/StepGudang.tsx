/**
 * Step 3 — Buat gudang default.
 *
 * Opsional. Aturan submit (lewat tombol Lanjut):
 *  - Jika sudah ada minimal 1 gudang → no-op, lanjut.
 *  - Jika belum ada gudang DAN user tidak mengisi field esensial
 *    (alamat / PIC / kontak semuanya kosong) → anggap user melewati,
 *    lanjut tanpa insert.
 *  - Jika belum ada gudang DAN user mulai mengisi tapi tidak lengkap →
 *    error, tetap di step.
 *  - Jika belum ada gudang DAN form lengkap → insert.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { CheckCircle2, ExternalLink, Info, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";
import { TokoInput } from "@/components/ui/TokoInput";
import type { GudangRow } from "@/data/gudang";
import { tauriErrorMessage } from "@/lib/tauriError";
import { OnboardingStepHeader } from "@/features/onboarding/components/OnboardingStepHeader";
import type { OnboardingStepHandle } from "@/features/onboarding/stepHandle";

type Props = {
  onSaved: () => Promise<void>;
};

type FormState = {
  kode: string;
  nama: string;
  alamat: string;
  pic: string;
  nomorKontak: string;
  luasM2: number;
  kapasitasPenyimpanan: string;
};

const DEFAULT_FORM: FormState = {
  kode: "GD-001",
  nama: "Gudang Utama",
  alamat: "",
  pic: "",
  nomorKontak: "",
  luasM2: 50,
  kapasitasPenyimpanan: "Standar",
};

/** True bila user belum mengisi field esensial sama sekali. */
function isFormBelumDisentuh(form: FormState): boolean {
  return (
    form.alamat.trim().length === 0 &&
    form.pic.trim().length === 0 &&
    form.nomorKontak.trim().length === 0
  );
}

export const StepGudang = forwardRef<OnboardingStepHandle, Props>(function StepGudang(
  { onSaved },
  ref,
) {
  const [list, setList] = useState<GudangRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadingList(true);
    try {
      const rows = await invoke<GudangRow[]>("gudang_list");
      setList(rows);
    } catch (e) {
      setError(tauriErrorMessage(e));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const sudahAda = list.length > 0;

  const summary = useMemo(() => {
    if (!sudahAda) return null;
    return list.slice(0, 3);
  }, [list, sudahAda]);

  useImperativeHandle(
    ref,
    () => ({
      async submit() {
        if (sudahAda) {
          return true;
        }
        if (isFormBelumDisentuh(form)) {
          // User memilih tidak membuat gudang sekarang — step opsional,
          // boleh lanjut tanpa insert.
          return true;
        }

        const kode = form.kode.trim().toUpperCase();
        if (!kode) {
          setError("Kode gudang wajib diisi.");
          return false;
        }
        if (!form.nama.trim()) {
          setError("Nama gudang wajib diisi.");
          return false;
        }
        if (!form.alamat.trim()) {
          setError("Alamat wajib diisi.");
          return false;
        }
        if (!form.pic.trim()) {
          setError("Nama PIC wajib diisi.");
          return false;
        }
        if (!form.nomorKontak.trim()) {
          setError("Nomor kontak wajib diisi.");
          return false;
        }
        if (!Number.isFinite(form.luasM2) || form.luasM2 <= 0) {
          setError("Luas harus lebih dari 0.");
          return false;
        }

        try {
          await invoke("gudang_insert", {
            row: {
              kode,
              nama: form.nama.trim(),
              alamat: form.alamat.trim(),
              lokasi: "",
              pic: form.pic.trim(),
              nomorKontak: form.nomorKontak.trim(),
              luasM2: form.luasM2,
              kapasitasPenyimpanan: form.kapasitasPenyimpanan.trim() || "Standar",
            },
          });
          await refresh();
          await onSaved();
          return true;
        } catch (err) {
          setError(tauriErrorMessage(err));
          return false;
        }
      },
    }),
    [sudahAda, form, refresh, onSaved],
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <OnboardingStepHeader
        icon={Warehouse}
        judul="Gudang default"
        wajib={false}
        deskripsi="Lokasi penyimpanan stok pertama. Anda dapat menambahkan lokasi lain kapan saja di menu Manajemen > Gudang."
      />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      {loadingList ? (
        <p className="text-sm text-zinc-500">Memuat daftar gudang…</p>
      ) : sudahAda ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Anda sudah memiliki {list.length} gudang.</p>
              <p className="mt-0.5 text-xs">Klik Lanjut untuk melewati langkah ini.</p>
            </div>
          </div>

          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white">
            {summary?.map((g) => (
              <li key={g.kode} className="flex items-start gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600"
                >
                  <Warehouse className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-900">
                    {g.nama}
                    <span className="ml-2 text-xs font-medium text-zinc-400">{g.kode}</span>
                  </p>
                  <p className="text-xs text-zinc-500">{g.alamat || "—"}</p>
                </div>
              </li>
            ))}
            {list.length > (summary?.length ?? 0) ? (
              <li className="px-4 py-2 text-xs text-zinc-500">
                +{list.length - (summary?.length ?? 0)} gudang lain.
              </li>
            ) : null}
          </ul>

          <Link
            to="/manajemen/gudang"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Buka manajemen gudang
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Lengkapi form untuk membuat gudang pertama, atau biarkan kosong dan klik Lanjut
              untuk melewati. Anda bisa menambahkannya kapan saja dari menu Manajemen.
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TokoInput
              label="Kode"
              value={form.kode}
              onChange={(e) => update("kode", e.target.value.toUpperCase())}
              autoCapitalize="characters"
            />
            <TokoInput
              label="Nama"
              value={form.nama}
              onChange={(e) => update("nama", e.target.value)}
            />
          </div>

          <TokoInput
            label="Alamat"
            value={form.alamat}
            onChange={(e) => update("alamat", e.target.value)}
            placeholder="Jl. Contoh No. 1"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TokoInput
              label="Penanggung jawab (PIC)"
              value={form.pic}
              onChange={(e) => update("pic", e.target.value)}
            />
            <TokoInput
              label="Nomor kontak"
              type="tel"
              value={form.nomorKontak}
              onChange={(e) => update("nomorKontak", e.target.value)}
              placeholder="+62 812-0000-0000"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TokoInput
              label="Luas (m²)"
              type="number"
              min={0.1}
              step={0.1}
              value={form.luasM2}
              onChange={(e) => update("luasM2", Number.parseFloat(e.target.value) || 0)}
            />
            <TokoInput
              label="Kapasitas penyimpanan"
              value={form.kapasitasPenyimpanan}
              onChange={(e) => update("kapasitasPenyimpanan", e.target.value)}
              placeholder="Standar / 50 palet / 100 m³"
            />
          </div>
        </div>
      )}
    </div>
  );
});
