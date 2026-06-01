/**
 * Daftar canonical step pada wizard onboarding.
 *
 * Sengaja dipisah dari komponen agar urutan, label, dan id step menjadi
 * single source of truth untuk:
 *  - stepper visual di {@link OnboardingProgressStepper},
 *  - hook flow state ({@link useOnboardingFlow}),
 *  - dan checklist evaluator.
 *
 * Untuk menambah/menghapus step, cukup ubah array {@link ONBOARDING_STEPS}
 * dan tambahkan komponen step yang sesuai di `OnboardingPage`.
 */

export type OnboardingStepId =
  | "info-perusahaan"
  | "periode-pembukuan"
  | "gudang"
  | "saldo-awal"
  | "password-admin";

export type OnboardingStepMeta = {
  id: OnboardingStepId;
  /** Nomor urut yang ditampilkan ke user (1-based). */
  nomor: number;
  judul: string;
  /** Subjudul ringkas di stepper. */
  subjudul: string;
  /** Apakah langkah ini wajib (tidak bisa di-skip) untuk menyelesaikan wizard. */
  wajib: boolean;
};

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  {
    id: "info-perusahaan",
    nomor: 1,
    judul: "Informasi perusahaan",
    subjudul: "Nama, alamat, kontak",
    wajib: true,
  },
  {
    id: "periode-pembukuan",
    nomor: 2,
    judul: "Periode pembukuan & PPN",
    subjudul: "Tanggal awal & tarif default",
    wajib: true,
  },
  {
    id: "gudang",
    nomor: 3,
    judul: "Gudang default",
    subjudul: "Lokasi penyimpanan utama",
    wajib: false,
  },
  {
    id: "saldo-awal",
    nomor: 4,
    judul: "Saldo awal kas & stok",
    subjudul: "Opsional, dapat diisi nanti",
    wajib: false,
  },
  {
    id: "password-admin",
    nomor: 5,
    judul: "Ganti password admin",
    subjudul: "Amankan akun bawaan",
    wajib: true,
  },
];

export function findStepIndex(id: OnboardingStepId): number {
  const i = ONBOARDING_STEPS.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}
