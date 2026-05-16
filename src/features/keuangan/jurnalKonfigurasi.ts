import type { JurnalKonfigurasi } from "@/data/keuangan";

export const JURNAL_KONFIGURASI_FIELDS: {
  key: keyof JurnalKonfigurasi;
  label: string;
  hint?: string;
}[] = [
  { key: "akunPiutang", label: "Piutang", hint: "Debit saat penjualan kredit" },
  { key: "akunHutang", label: "Hutang", hint: "Kredit saat pembelian kredit" },
  { key: "akunPendapatan", label: "Pendapatan", hint: "Kredit saat penjualan" },
  { key: "akunPembelian", label: "Pembelian / inventori", hint: "Debit saat pembelian" },
  { key: "akunPenerimaanLainnya", label: "Penerimaan lain", hint: "Kredit penerimaan non-penjualan" },
  { key: "akunPengeluaranLainnya", label: "Pengeluaran lain", hint: "Debit pengeluaran non-pembelian" },
];

export function isJurnalKonfigurasiComplete(config: JurnalKonfigurasi | null): boolean {
  if (!config) return false;
  return JURNAL_KONFIGURASI_FIELDS.every(({ key }) => Boolean(config[key]));
}
