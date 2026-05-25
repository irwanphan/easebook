/**
 * Tipe data fitur Pesanan Pembelian (Purchase Order).
 *
 * Pesanan adalah komitmen beli yang TIDAK mempengaruhi stok. Begitu barang
 * diterima dari pemasok, pesanan dikonversi menjadi faktur pembelian — stok
 * & jurnal baru terposting pada saat konversi.
 *
 * Status:
 *  - `Draft`        — baru dibuat, masih bisa diubah/dihapus.
 *  - `Difakturkan`  — sudah dikonversi ke faktur, `fakturNomor` terisi.
 *  - `Dibatalkan`   — di-cancel sebelum difakturkan.
 */

export type PesananPembelianStatus = "Draft" | "Difakturkan" | "Dibatalkan";

export type PesananPembelianListRow = {
  nomor: string;
  tanggalPesanan: string;
  tanggalKirim: string | null;
  pemasokKode: string;
  pemasokNama: string;
  total: number;
  status: PesananPembelianStatus;
  fakturNomor: string | null;
};

export type PesananPembelianLineInput = {
  barangKode: string;
  qty: number;
  satuanTingkat: number;
  hargaSatuan: number;
  /** Diskon nominal per satuan (Rp). */
  diskon: number;
  catatan: string;
};

export type PesananPembelianDetailLine = {
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

export type PesananPembelianDetail = {
  nomor: string;
  pemasokKode: string;
  pemasokNama: string;
  gudangKode: string;
  gudangNama: string;
  tanggalPesanan: string;
  tanggalKirim: string | null;
  catatan: string;
  subtotalBarang: number;
  diskonFaktur: number;
  pajak: number;
  total: number;
  status: PesananPembelianStatus;
  fakturNomor: string | null;
  lines: PesananPembelianDetailLine[];
};

export type PesananPembelianInsertPayload = {
  pemasokKode: string;
  gudangKode: string;
  tanggalPesanan: string;
  tanggalKirim: string | null;
  catatan: string;
  diskonFaktur: number;
  pajak: number;
  lines: PesananPembelianLineInput[];
};

/** Payload override saat konversi pesanan → faktur pembelian. */
export type PesananPembelianKonversiPayload = {
  tanggalFaktur: string;
  jatuhTempo: string;
  metodePembayaran: string;
  /** Kosong/null = hutang dagang, terisi = tunai via akun kas tersebut. */
  akunKasKode?: string | null;
};
