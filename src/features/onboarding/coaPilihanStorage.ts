/**
 * Persistensi pilihan user pada step CoA wizard onboarding.
 *
 * Step "Struktur akun" punya tiga opsi (standar / kosong / upload).
 * Untuk evaluasi checklist done/belum, kita perlu membedakan dua kondisi
 * yang dari sudut pandang data DB terlihat identik:
 *
 *  - akun_keuangan kosong **karena user belum mengerjakan apa-apa** (belum done)
 *  - akun_keuangan kosong **karena user eksplisit memilih "Mulai dari nol"** (done)
 *
 * Flag di localStorage ini menjadi tanda eksplisit pilihan user.
 * Disimpan di sisi UI (bukan DB) karena hanya berperan untuk UI wizard;
 * DB tetap menjadi sumber kebenaran untuk akun yang ada.
 */

export type CoAPilihan = "standar" | "kosong" | "upload";

const STORAGE_KEY = "easybook-onboarding-coa-pilihan";

export function loadCoAPilihan(): CoAPilihan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "standar" || raw === "kosong" || raw === "upload") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCoAPilihan(pilihan: CoAPilihan): void {
  try {
    localStorage.setItem(STORAGE_KEY, pilihan);
  } catch {
    // Storage penuh / mode privasi — abaikan; checklist akan tetap
    // mengandalkan status DB sebagai fallback.
  }
}

export function clearCoAPilihan(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
