/** URL middleware aktivasi (easybook-activebook). Override lewat .env: VITE_ACTIVATION_API_URL */
export const ACTIVATION_API_URL =
  import.meta.env.VITE_ACTIVATION_API_URL ?? "http://localhost:3000";

/** Batas transaksi pembelian + penjualan sebelum aktivasi wajib (sinkron dengan Rust). */
export const TRIAL_TRANSACTION_LIMIT = 100;

/** ID produk di middleware activebook — satu constant per aplikasi klien. */
export const EASYBOOK_APP_ID = "easybook-erp";
