/**
 * Tipe data fitur Pesanan Penjualan (Sales Order).
 *
 * Pesanan adalah komitmen jual yang TIDAK mempengaruhi stok. Begitu siap
 * dikirim, pesanan dikonversi menjadi faktur penjualan — stok dipotong
 * pada saat konversi.
 *
 * Status:
 *  - `Draft`        — baru dibuat, masih bisa diubah/dihapus.
 *  - `Difakturkan`  — sudah dikonversi ke faktur, `fakturNomor` terisi.
 *  - `Dibatalkan`   — di-cancel sebelum difakturkan.
 */

export type PesananPenjualanStatus = "Draft" | "Difakturkan" | "Dibatalkan";

export type PesananPenjualanListRow = {
  nomor: string;
  tanggalPesanan: string;
  tanggalKirim: string | null;
  pelangganKode: string;
  pelangganNama: string;
  salesman: string;
  total: number;
  status: PesananPenjualanStatus;
  fakturNomor: string | null;
};

export type PesananPenjualanLineInput = {
  barangKode: string;
  qty: number;
  satuanTingkat: number;
  hargaSatuan: number;
  /** Diskon nominal per satuan (Rp). */
  diskon: number;
  catatan: string;
};

export type PesananPenjualanDetailLine = {
  barangKode: string;
  barangNama: string;
  qty: number;
  satuanTingkat: number;
  satuanNama: string;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
  catatan: string;
};

export type PesananPenjualanDetail = {
  nomor: string;
  pelangganKode: string;
  pelangganNama: string;
  gudangKode: string;
  gudangNama: string;
  salesman: string;
  tanggalPesanan: string;
  tanggalKirim: string | null;
  catatan: string;
  subtotalBarang: number;
  diskonFaktur: number;
  pajak: number;
  total: number;
  status: PesananPenjualanStatus;
  fakturNomor: string | null;
  lines: PesananPenjualanDetailLine[];
};

export type PesananPenjualanInsertPayload = {
  pelangganKode: string;
  gudangKode: string;
  salesman: string;
  tanggalPesanan: string;
  tanggalKirim: string | null;
  catatan: string;
  diskonFaktur: number;
  pajak: number;
  lines: PesananPenjualanLineInput[];
};

/** Payload override saat konversi pesanan → faktur. */
export type PesananPenjualanKonversiPayload = {
  tanggalFaktur: string;
  jatuhTempo: string;
  /** Kosong/null = piutang (kredit), terisi = tunai via akun kas tersebut. */
  akunKasKode?: string | null;
  /** Override salesman; kalau tidak diisi pakai salesman pesanan. */
  salesman?: string;
};
