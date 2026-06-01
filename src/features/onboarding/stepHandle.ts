/**
 * Kontrak imperatif yang di-expose setiap komponen step kepada
 * `OnboardingPage` lewat `ref`.
 *
 * Dipakai supaya tombol "Lanjut" / "Selesai" di footer global bisa
 * memicu validasi + penyimpanan step aktif tanpa duplikasi tombol
 * "Simpan" di setiap step. Aturan main:
 *
 *  - Step yang tidak punya perubahan untuk disimpan (mis. step info-only
 *    atau form yang sudah selesai sebelumnya) cukup mengembalikan `true`
 *    tanpa side effect.
 *  - Step opsional yang belum disentuh juga mengembalikan `true` (anggap
 *    user melewati).
 *  - Step opsional yang sebagian terisi tapi tidak valid → return `false`
 *    dan tampilkan pesan error inline (tidak boleh maju).
 *  - Step wajib yang gagal validasi → return `false` dan tampilkan error.
 */
export type OnboardingStepHandle = {
  /**
   * Validasi & simpan state step aktif. Resolve `true` bila wizard
   * boleh maju ke step berikutnya, `false` bila harus tetap di step
   * ini (error sudah ditampilkan oleh step itu sendiri).
   */
  submit: () => Promise<boolean>;
};
