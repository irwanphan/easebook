/**
 * Tipe data untuk fitur koreksi stok manual.
 *
 * Koreksi stok mendokumentasikan penyesuaian persediaan yang tidak terjadi
 * lewat transaksi normal (pembelian / penjualan / mutasi gudang) — mis.
 * hasil stok opname, barang rusak, hilang, ditemukan, atau reklasifikasi.
 *
 * Setiap dokumen melibatkan SATU gudang & SATU alasan, dengan banyak
 * baris campuran masuk/keluar.
 */

/** Arah perubahan stok per baris koreksi. */
export type KoreksiArah = "MASUK" | "KELUAR";

/** Alasan koreksi (enum closed — backend hanya menerima nilai di set ini). */
export type KoreksiAlasan =
  | "STOK_OPNAME"
  | "RUSAK"
  | "HILANG"
  | "DITEMUKAN"
  | "REKLASIFIKASI"
  | "LAINNYA";

/** Daftar alasan beserta label friendly untuk UI dropdown. */
export const KOREKSI_ALASAN_OPTIONS: { value: KoreksiAlasan; label: string; hint: string }[] = [
  {
    value: "STOK_OPNAME",
    label: "Stok opname",
    hint: "Selisih dari hasil hitung fisik dibanding catatan sistem.",
  },
  {
    value: "RUSAK",
    label: "Barang rusak",
    hint: "Barang yang harus dikeluarkan karena rusak/expired.",
  },
  {
    value: "HILANG",
    label: "Barang hilang",
    hint: "Stok berkurang karena hilang/dicuri/tidak teridentifikasi.",
  },
  {
    value: "DITEMUKAN",
    label: "Barang ditemukan",
    hint: "Stok bertambah karena ditemukan kembali / lebih dari opname.",
  },
  {
    value: "REKLASIFIKASI",
    label: "Reklasifikasi / repack",
    hint: "Pemindahan antar barang (mis. ganti kode SKU).",
  },
  {
    value: "LAINNYA",
    label: "Lainnya",
    hint: "Alasan lain — jelaskan di catatan.",
  },
];

/** Label friendly singkat alasan. */
export function labelAlasanKoreksi(alasan: string): string {
  return (
    KOREKSI_ALASAN_OPTIONS.find((o) => o.value === alasan)?.label ?? alasan
  );
}

export type KoreksiStokLinePayload = {
  barangKode: string;
  arah: KoreksiArah;
  qty: number;
  satuanTingkat: number;
  /** Nilai per satuan terpilih (mis. per Dus / per Pcs), bukan per satuan terkecil. */
  nilaiPerUnit: number;
  catatan: string;
};

export type KoreksiStokInsertPayload = {
  tanggal: string;
  gudangKode: string;
  alasan: KoreksiAlasan;
  catatan: string;
  actorUsername: string;
  actorNama: string;
  lines: KoreksiStokLinePayload[];
};
