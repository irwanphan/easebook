/**
 * Pengaturan kas POS — sumber kebenaran untuk:
 *  - Kas Operasional Utama: akun asal modal saat buka shift, dan tujuan
 *    pengembalian saat tutup shift.
 *  - Kas Kasir: laci kasir / till. Pembayaran tunai POS otomatis masuk
 *    ke akun ini (sinkron dari pos_metode_bayar is_tunai).
 *  - Akun Selisih Kas: penampung selisih kas saat tutup shift (bisa muncul
 *    di sisi debit atau kredit tergantung arah selisih).
 */
export type PosKonfigurasi = {
  kasUtamaKode: string | null;
  kasUtamaNama: string | null;
  kasKasirKode: string | null;
  kasKasirNama: string | null;
  akunSelisihKasKode: string | null;
  akunSelisihKasNama: string | null;
};

export type PosKonfigurasiSetPayload = {
  kasUtamaKode: string | null;
  kasKasirKode: string | null;
  akunSelisihKasKode: string | null;
};

export const POS_KONFIGURASI_DEFAULT: PosKonfigurasi = {
  kasUtamaKode: null,
  kasUtamaNama: null,
  kasKasirKode: null,
  kasKasirNama: null,
  akunSelisihKasKode: null,
  akunSelisihKasNama: null,
};

export function isPosKonfigurasiLengkap(cfg: PosKonfigurasi): boolean {
  return Boolean(cfg.kasUtamaKode && cfg.kasKasirKode);
}
