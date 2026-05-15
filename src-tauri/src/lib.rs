// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod db;
mod master_commands;

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
            drop(conn);
            app.manage(DbState { path: db_path });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            master_commands::kategori_list,
            master_commands::kategori_insert,
            master_commands::kategori_kode_exists,
            master_commands::merek_list,
            master_commands::merek_insert,
            master_commands::merek_kode_exists,
            master_commands::gudang_list,
            master_commands::gudang_insert,
            master_commands::gudang_kode_exists,
            master_commands::barang_jasa_list,
            master_commands::barang_jasa_insert,
            master_commands::barang_jasa_kode_exists,
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
            master_commands::pembelian_list,
            master_commands::pembelian_insert,
            master_commands::stok_mutasi_for_barang,
            master_commands::stok_mutasi_laporan,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
