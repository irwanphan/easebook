// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod activation;
mod db;
mod master_commands;
mod print_commands;
mod seed_akun_keuangan;

use std::path::PathBuf;
use tauri::Manager;

#[derive(Clone)]
pub struct DbState {
    pub path: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir().expect("app_data_dir");
            std::fs::create_dir_all(&dir).expect("create app data dir");
            let db_path = dir.join("easybook.db");
            let mut conn = db::open_connection(&db_path).expect("open sqlite");
            db::migrate(&conn).expect("db migrate");
            db::seed_if_empty(&mut conn).expect("db seed");
            let ts = chrono::Utc::now().timestamp();
            seed_akun_keuangan::seed_akun_keuangan_if_empty(&mut conn, ts)
                .expect("seed akun keuangan");
            drop(conn);
            app.manage(DbState { path: db_path });

            #[cfg(not(mobile))]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.maximize();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            master_commands::kategori_list,
            master_commands::kategori_insert,
            master_commands::kategori_update,
            master_commands::kategori_delete,
            master_commands::kategori_kode_exists,
            master_commands::merek_list,
            master_commands::merek_insert,
            master_commands::merek_update,
            master_commands::merek_delete,
            master_commands::merek_kode_exists,
            master_commands::gudang_list,
            master_commands::gudang_insert,
            master_commands::gudang_update,
            master_commands::gudang_delete,
            master_commands::gudang_kode_exists,
            master_commands::barang_jasa_list,
            master_commands::barang_jasa_insert,
            master_commands::barang_jasa_update,
            master_commands::barang_jasa_punya_transaksi,
            master_commands::barang_jasa_kode_exists,
            master_commands::barang_foto_path,
            master_commands::barang_foto_save,
            master_commands::barang_foto_remove,
            master_commands::barang_stok_per_gudang_matrix,
            master_commands::stok_barang_di_gudang,
            master_commands::barang_hpp_list,
            master_commands::barang_hpp_detail,
            master_commands::koreksi_stok_insert,
            master_commands::pesanan_penjualan_list,
            master_commands::pesanan_penjualan_detail,
            master_commands::pesanan_penjualan_insert,
            master_commands::pesanan_penjualan_update,
            master_commands::pesanan_penjualan_delete,
            master_commands::pesanan_penjualan_batalkan,
            master_commands::pesanan_penjualan_konversi_ke_faktur,
            master_commands::pesanan_pembelian_list,
            master_commands::pesanan_pembelian_detail,
            master_commands::pesanan_pembelian_insert,
            master_commands::pesanan_pembelian_update,
            master_commands::pesanan_pembelian_delete,
            master_commands::pesanan_pembelian_batalkan,
            master_commands::pesanan_pembelian_konversi_ke_faktur,
            master_commands::mutasi_antar_gudang_apply,
            master_commands::mutasi_antar_gudang_riwayat_list,
            master_commands::mutasi_antar_gudang_riwayat_detail,
            master_commands::pelanggan_list,
            master_commands::pelanggan_insert,
            master_commands::pelanggan_update,
            master_commands::pelanggan_delete,
            master_commands::pelanggan_kode_exists,
            master_commands::pemasok_list,
            master_commands::pemasok_insert,
            master_commands::pemasok_update,
            master_commands::pemasok_delete,
            master_commands::pemasok_kode_exists,
            master_commands::pengguna_list,
            master_commands::pengguna_insert,
            master_commands::pengguna_update,
            master_commands::pengguna_delete,
            master_commands::pengguna_username_exists,
            master_commands::pengguna_halaman_akses_get,
            master_commands::pengguna_foto_path,
            master_commands::pengguna_foto_save,
            master_commands::pengguna_foto_remove,
            master_commands::pengguna_login,
            master_commands::pengguna_verifikasi_kata_sandi,
            master_commands::pengguna_session_get,
            master_commands::pembelian_list,
            master_commands::pembelian_insert,
            master_commands::pembelian_detail,
            master_commands::pembelian_update,
            master_commands::penjualan_list,
            master_commands::penjualan_detail,
            master_commands::penjualan_insert,
            master_commands::penjualan_update,
            master_commands::dashboard_penjualan_bulanan,
            master_commands::dashboard_penjualan_ringkasan,
            master_commands::piutang_belum_lunas_list,
            master_commands::pelunasan_piutang_apply,
            master_commands::pelunasan_piutang_apply_batch,
            master_commands::pelunasan_piutang_riwayat_list,
            master_commands::pelunasan_piutang_riwayat_detail,
            master_commands::pelunasan_piutang_delete,
            master_commands::hutang_belum_lunas_list,
            master_commands::pelunasan_hutang_apply,
            master_commands::pelunasan_hutang_apply_batch,
            master_commands::pelunasan_hutang_riwayat_list,
            master_commands::pelunasan_hutang_riwayat_detail,
            master_commands::pelunasan_hutang_delete,
            master_commands::pengeluaran_list,
            master_commands::pengeluaran_detail,
            master_commands::pengeluaran_insert,
            master_commands::penerimaan_list,
            master_commands::penerimaan_detail,
            master_commands::penerimaan_insert,
            master_commands::stok_mutasi_for_barang,
            master_commands::stok_mutasi_laporan,
            master_commands::stok_mutasi_sinkron_dari_pembelian,
            master_commands::akun_keuangan_list,
            master_commands::akun_keuangan_insert,
            master_commands::akun_keuangan_update,
            master_commands::akun_keuangan_delete,
            master_commands::jurnal_konfigurasi_get,
            master_commands::jurnal_konfigurasi_set,
            master_commands::jurnal_umum_list,
            master_commands::buku_besar_get,
            master_commands::jurnal_umum_insert_transaksi,
            master_commands::jurnal_umum_insert_manual,
            master_commands::transfer_kas_list,
            master_commands::transfer_kas_detail,
            master_commands::transfer_kas_insert,
            master_commands::transfer_kas_update,
            master_commands::pos_metode_bayar_list,
            master_commands::pos_metode_bayar_insert,
            master_commands::pos_metode_bayar_update,
            master_commands::pos_metode_bayar_delete,
            master_commands::pos_konfigurasi_get,
            master_commands::pos_konfigurasi_set,
            master_commands::operasional_konfigurasi_get,
            master_commands::operasional_konfigurasi_set,
            master_commands::kas_awal_get,
            master_commands::kas_awal_set,
            master_commands::stok_awal_get,
            master_commands::stok_awal_set,
            master_commands::pos_shift_active_for,
            master_commands::pos_shift_carry_modal,
            master_commands::pos_shift_open,
            master_commands::pos_shift_change_gudang,
            master_commands::pos_shift_close,
            master_commands::pos_shift_rekap,
            master_commands::pos_shift_list,
            master_commands::pos_shift_event_log_list,
            master_commands::pos_catalog_list,
            master_commands::pos_transaksi_create,
            master_commands::produksi_list,
            master_commands::produksi_detail,
            master_commands::produksi_hpp_snapshot,
            master_commands::produksi_insert,
            master_commands::produksi_update,
            master_commands::produksi_delete,
            master_commands::produksi_tandai_selesai,
            master_commands::produksi_batalkan,
            activation::activation_get_license_info,
            activation::activation_get_device_code,
            activation::activation_get_status,
            activation::activation_save,
            activation::activation_apply_offline_code,
            print_commands::print_open_html,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
