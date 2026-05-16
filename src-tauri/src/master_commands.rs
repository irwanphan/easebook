//! Perintah Tauri untuk master data (SQLite).

use crate::db;
use crate::DbState;
use chrono::{Local, NaiveDate, TimeZone, Utc};
use rusqlite::{params, Connection, Transaction};
use serde::{Deserialize, Serialize};
use tauri::State;

fn now_ts() -> i64 {
    Utc::now().timestamp()
}

/// Unix timestamp (zona lokal) untuk tengah hari tanggal faktur — dipakai agar filter laporan mutasi (berdasarkan `waktu`) selaras dengan rentang tanggal faktur setelah sinkron ulang.
fn waktu_mutasi_dari_tgl_faktur(tanggal_faktur: &str) -> Result<i64, String> {
    let d = NaiveDate::parse_from_str(tanggal_faktur.trim(), "%Y-%m-%d")
        .map_err(|_| "Tanggal faktur tidak valid (YYYY-MM-DD).".to_string())?;
    let na = d
        .and_hms_opt(12, 0, 0)
        .ok_or_else(|| "Tanggal faktur tidak valid.".to_string())?;
    Local
        .from_local_datetime(&na)
        .latest()
        .map(|dt| dt.timestamp())
        .ok_or_else(|| "Konversi zona waktu gagal.".to_string())
}

fn with_conn<R, F>(state: &DbState, f: F) -> Result<R, String>
where
    F: FnOnce(&Connection) -> rusqlite::Result<R>,
{
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    f(&conn).map_err(|e| e.to_string())
}

/// Koneksi singkat dengan error aplikasi string (untuk cek baris terpengaruh, dll.).
fn with_conn_app<R, F>(state: &DbState, f: F) -> Result<R, String>
where
    F: FnOnce(&Connection) -> Result<R, String>,
{
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    f(&conn)
}

// --- Kategori ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KategoriRow {
    pub kode: String,
    pub nama: String,
    pub deskripsi: String,
}

#[tauri::command]
pub fn kategori_list(state: State<DbState>) -> Result<Vec<KategoriRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT kode, nama, deskripsi FROM kategori ORDER BY kode COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(KategoriRow {
                kode: r.get(0)?,
                nama: r.get(1)?,
                deskripsi: r.get(2)?,
            })
        })?;
        rows.collect()
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KategoriInsert {
    pub kode: String,
    pub nama: String,
    pub deskripsi: String,
}

#[tauri::command]
pub fn kategori_insert(state: State<DbState>, row: KategoriInsert) -> Result<(), String> {
    let kode = row.kode.trim().to_uppercase();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    if row.nama.trim().is_empty() {
        return Err("Nama wajib diisi.".into());
    }
    let ts = now_ts();
    with_conn(&state, |conn| {
        conn.execute(
            "INSERT INTO kategori (kode, nama, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            params![
                kode,
                row.nama.trim(),
                row.deskripsi.trim(),
                ts,
                ts
            ],
        )?;
        Ok(())
    })
    .map_err(|e| {
        if e.contains("UNIQUE") {
            "Kode sudah dipakai.".into()
        } else {
            e
        }
    })
}

// --- Merek ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MerekRow {
    pub kode: String,
    pub nama: String,
    pub deskripsi: String,
}

#[tauri::command]
pub fn merek_list(state: State<DbState>) -> Result<Vec<MerekRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt =
            conn.prepare("SELECT kode, nama, deskripsi FROM merek ORDER BY kode COLLATE NOCASE")?;
        let rows = stmt.query_map([], |r| {
            Ok(MerekRow {
                kode: r.get(0)?,
                nama: r.get(1)?,
                deskripsi: r.get(2)?,
            })
        })?;
        rows.collect()
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MerekInsert {
    pub kode: String,
    pub nama: String,
    pub deskripsi: String,
}

#[tauri::command]
pub fn merek_insert(state: State<DbState>, row: MerekInsert) -> Result<(), String> {
    let kode = row.kode.trim().to_uppercase();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    if row.nama.trim().is_empty() {
        return Err("Nama wajib diisi.".into());
    }
    let ts = now_ts();
    with_conn(&state, |conn| {
        conn.execute(
            "INSERT INTO merek (kode, nama, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            params![
                kode,
                row.nama.trim(),
                row.deskripsi.trim(),
                ts,
                ts
            ],
        )?;
        Ok(())
    })
    .map_err(|e| {
        if e.contains("UNIQUE") {
            "Kode sudah dipakai.".into()
        } else {
            e
        }
    })
}

// --- Gudang ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GudangRow {
    pub kode: String,
    pub nama: String,
    pub alamat: String,
    pub lokasi: String,
    pub pic: String,
    pub nomor_kontak: String,
    pub luas_m2: f64,
    pub kapasitas_penyimpanan: String,
}

#[tauri::command]
pub fn gudang_list(state: State<DbState>) -> Result<Vec<GudangRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT kode, nama, alamat, lokasi, pic, nomor_kontak, luas_m2, kapasitas_penyimpanan FROM gudang ORDER BY kode COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(GudangRow {
                kode: r.get(0)?,
                nama: r.get(1)?,
                alamat: r.get(2)?,
                lokasi: r.get(3)?,
                pic: r.get(4)?,
                nomor_kontak: r.get(5)?,
                luas_m2: r.get(6)?,
                kapasitas_penyimpanan: r.get(7)?,
            })
        })?;
        rows.collect()
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GudangInsert {
    pub kode: String,
    pub nama: String,
    pub alamat: String,
    pub lokasi: String,
    pub pic: String,
    pub nomor_kontak: String,
    pub luas_m2: f64,
    pub kapasitas_penyimpanan: String,
}

#[tauri::command]
pub fn gudang_insert(state: State<DbState>, row: GudangInsert) -> Result<(), String> {
    let kode = row.kode.trim().to_uppercase();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    if row.nama.trim().is_empty() || row.alamat.trim().is_empty() {
        return Err("Nama dan alamat wajib diisi.".into());
    }
    if row.pic.trim().is_empty() || row.nomor_kontak.trim().is_empty() {
        return Err("PIC dan nomor kontak wajib diisi.".into());
    }
    if row.luas_m2 <= 0.0 {
        return Err("Luas harus lebih dari 0.".into());
    }
    if row.kapasitas_penyimpanan.trim().is_empty() {
        return Err("Kapasitas penyimpanan wajib diisi.".into());
    }
    let ts = now_ts();
    with_conn(&state, |conn| {
        conn.execute(
            "INSERT INTO gudang (kode, nama, alamat, lokasi, pic, nomor_kontak, luas_m2, kapasitas_penyimpanan, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                kode,
                row.nama.trim(),
                row.alamat.trim(),
                row.lokasi.trim(),
                row.pic.trim(),
                row.nomor_kontak.trim(),
                row.luas_m2,
                row.kapasitas_penyimpanan.trim(),
                ts,
                ts
            ],
        )?;
        Ok(())
    })
    .map_err(|e| {
        if e.contains("UNIQUE") {
            "Kode sudah dipakai.".into()
        } else {
            e
        }
    })
}

// --- Barang & jasa ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BarangJasaRow {
    pub kode: String,
    pub nama: String,
    pub tipe: String,
    pub satuan: String,
    pub harga: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stok: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kategori_kode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub merek_kode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_gudang_kode: Option<String>,
}

#[tauri::command]
pub fn barang_jasa_list(state: State<DbState>) -> Result<Vec<BarangJasaRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT kode, nama, tipe, satuan, harga, stok, kategori_kode, merek_kode, default_gudang_kode
             FROM barang_jasa ORDER BY kode COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(BarangJasaRow {
                kode: r.get(0)?,
                nama: r.get(1)?,
                tipe: r.get(2)?,
                satuan: r.get(3)?,
                harga: r.get(4)?,
                stok: r.get(5)?,
                kategori_kode: r.get(6)?,
                merek_kode: r.get(7)?,
                default_gudang_kode: r.get(8)?,
            })
        })?;
        rows.collect()
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BarangJasaInsert {
    pub kode: String,
    pub nama: String,
    pub tipe: String,
    pub satuan: String,
    pub harga: i64,
    pub stok: Option<i64>,
    pub kategori_kode: Option<String>,
    pub merek_kode: Option<String>,
    pub default_gudang_kode: Option<String>,
}

#[tauri::command]
pub fn barang_jasa_insert(state: State<DbState>, row: BarangJasaInsert) -> Result<(), String> {
    let kode = row.kode.trim().to_uppercase();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    if row.nama.trim().is_empty() {
        return Err("Nama wajib diisi.".into());
    }
    let tipe = row.tipe.trim();
    if tipe != "Barang" && tipe != "Jasa" {
        return Err("Tipe harus Barang atau Jasa.".into());
    }
    if row.satuan.trim().is_empty() {
        return Err("Satuan wajib diisi.".into());
    }
    if row.harga < 0 {
        return Err("Harga tidak valid.".into());
    }
    if tipe == "Barang" && row.stok.is_none() {
        return Err("Stok wajib untuk tipe Barang.".into());
    }
    if tipe == "Jasa" && row.stok.is_some() {
        return Err("Stok harus kosong untuk tipe Jasa.".into());
    }
    let ts = now_ts();
    with_conn(&state, |conn| {
        conn.execute(
            "INSERT INTO barang_jasa (kode, nama, tipe, satuan, harga, stok, kategori_kode, merek_kode, default_gudang_kode, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                kode,
                row.nama.trim(),
                tipe,
                row.satuan.trim(),
                row.harga,
                row.stok,
                row.kategori_kode.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()),
                row.merek_kode.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()),
                row.default_gudang_kode
                    .as_ref()
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty()),
                ts,
                ts
            ],
        )?;
        Ok(())
    })
    .map_err(|e| {
        if e.contains("UNIQUE") {
            "Kode sudah dipakai.".into()
        } else if e.contains("FOREIGN KEY") {
            "Kategori, merek, atau gudang rujukan tidak ditemukan.".into()
        } else {
            e
        }
    })
}

#[tauri::command]
pub fn kategori_kode_exists(state: State<DbState>, kode: String) -> Result<bool, String> {
    with_conn(&state, |conn| {
        let n: i64 = conn.query_row(
            "SELECT COUNT(*) FROM kategori WHERE lower(kode) = lower(?)",
            params![kode.trim()],
            |r| r.get(0),
        )?;
        Ok(n > 0)
    })
}

#[tauri::command]
pub fn merek_kode_exists(state: State<DbState>, kode: String) -> Result<bool, String> {
    with_conn(&state, |conn| {
        let n: i64 = conn.query_row(
            "SELECT COUNT(*) FROM merek WHERE lower(kode) = lower(?)",
            params![kode.trim()],
            |r| r.get(0),
        )?;
        Ok(n > 0)
    })
}

#[tauri::command]
pub fn gudang_kode_exists(state: State<DbState>, kode: String) -> Result<bool, String> {
    with_conn(&state, |conn| {
        let n: i64 = conn.query_row(
            "SELECT COUNT(*) FROM gudang WHERE lower(kode) = lower(?)",
            params![kode.trim()],
            |r| r.get(0),
        )?;
        Ok(n > 0)
    })
}

#[tauri::command]
pub fn barang_jasa_kode_exists(state: State<DbState>, kode: String) -> Result<bool, String> {
    with_conn(&state, |conn| {
        let n: i64 = conn.query_row(
            "SELECT COUNT(*) FROM barang_jasa WHERE lower(kode) = lower(?)",
            params![kode.trim()],
            |r| r.get(0),
        )?;
        Ok(n > 0)
    })
}

// --- Pelanggan & pemasok (kontak master, skema sama) ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KontakMasterRow {
    pub kode: String,
    pub nama: String,
    pub alamat: String,
    pub kota: String,
    pub telepon: String,
    pub email: String,
    pub npwp: String,
    pub catatan: String,
}

fn kontak_list_conn(conn: &Connection, table: &'static str) -> rusqlite::Result<Vec<KontakMasterRow>> {
    let sql = format!(
        "SELECT kode, nama, alamat, kota, telepon, email, npwp, catatan FROM {table} ORDER BY kode COLLATE NOCASE"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |r| {
        Ok(KontakMasterRow {
            kode: r.get(0)?,
            nama: r.get(1)?,
            alamat: r.get(2)?,
            kota: r.get(3)?,
            telepon: r.get(4)?,
            email: r.get(5)?,
            npwp: r.get(6)?,
            catatan: r.get(7)?,
        })
    })?;
    rows.collect()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KontakMasterInsert {
    pub kode: String,
    pub nama: String,
    pub alamat: String,
    pub kota: String,
    pub telepon: String,
    pub email: String,
    pub npwp: String,
    pub catatan: String,
}

fn kontak_insert_conn(
    conn: &Connection,
    table: &'static str,
    row: &KontakMasterInsert,
    ts: i64,
) -> rusqlite::Result<()> {
    let sql = format!(
        "INSERT INTO {table} (kode, nama, alamat, kota, telepon, email, npwp, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    conn.execute(
        &sql,
        params![
            row.kode.trim().to_uppercase(),
            row.nama.trim(),
            row.alamat.trim(),
            row.kota.trim(),
            row.telepon.trim(),
            row.email.trim(),
            row.npwp.trim(),
            row.catatan.trim(),
            ts,
            ts,
        ],
    )?;
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KontakMasterUpdate {
    pub nama: String,
    pub alamat: String,
    pub kota: String,
    pub telepon: String,
    pub email: String,
    pub npwp: String,
    pub catatan: String,
}

fn kontak_update_conn(
    conn: &Connection,
    table: &'static str,
    kode: &str,
    row: &KontakMasterUpdate,
    ts: i64,
) -> rusqlite::Result<usize> {
    let sql = format!(
        "UPDATE {table} SET nama = ?, alamat = ?, kota = ?, telepon = ?, email = ?, npwp = ?, catatan = ?, updated_at = ?
         WHERE lower(kode) = lower(?)"
    );
    let n = conn.execute(
        &sql,
        params![
            row.nama.trim(),
            row.alamat.trim(),
            row.kota.trim(),
            row.telepon.trim(),
            row.email.trim(),
            row.npwp.trim(),
            row.catatan.trim(),
            ts,
            kode.trim(),
        ],
    )?;
    Ok(n)
}

fn kontak_delete_conn(conn: &Connection, table: &'static str, kode: &str) -> rusqlite::Result<usize> {
    let sql = format!("DELETE FROM {table} WHERE lower(kode) = lower(?)");
    conn.execute(&sql, params![kode.trim()])
}

fn kontak_kode_exists_conn(conn: &Connection, table: &'static str, kode: &str) -> rusqlite::Result<bool> {
    let sql = format!("SELECT COUNT(*) FROM {table} WHERE lower(kode) = lower(?)");
    let n: i64 = conn.query_row(&sql, params![kode.trim()], |r| r.get(0))?;
    Ok(n > 0)
}

fn validate_kontak_insert(row: &KontakMasterInsert) -> Result<String, String> {
    let kode = row.kode.trim().to_uppercase();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    if row.nama.trim().is_empty() {
        return Err("Nama wajib diisi.".into());
    }
    Ok(kode)
}

fn validate_kontak_update(row: &KontakMasterUpdate) -> Result<(), String> {
    if row.nama.trim().is_empty() {
        return Err("Nama wajib diisi.".into());
    }
    Ok(())
}

// Pelanggan

#[tauri::command]
pub fn pelanggan_list(state: State<DbState>) -> Result<Vec<KontakMasterRow>, String> {
    with_conn(&state, |conn| kontak_list_conn(conn, "pelanggan"))
}

#[tauri::command]
pub fn pelanggan_insert(state: State<DbState>, row: KontakMasterInsert) -> Result<(), String> {
    let kode = validate_kontak_insert(&row)?;
    let mut row = row;
    row.kode = kode;
    let ts = now_ts();
    with_conn(&state, |conn| kontak_insert_conn(conn, "pelanggan", &row, ts)).map_err(|e| {
        if e.contains("UNIQUE") {
            "Kode sudah dipakai.".into()
        } else {
            e
        }
    })
}

#[tauri::command]
pub fn pelanggan_update(
    state: State<DbState>,
    kode: String,
    row: KontakMasterUpdate,
) -> Result<(), String> {
    validate_kontak_update(&row)?;
    let ts = now_ts();
    with_conn_app(&state, |conn| {
        let n = kontak_update_conn(conn, "pelanggan", &kode, &row, ts).map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("Pelanggan tidak ditemukan.".into());
        }
        Ok(())
    })
}

#[tauri::command]
pub fn pelanggan_delete(state: State<DbState>, kode: String) -> Result<(), String> {
    with_conn_app(&state, |conn| {
        let n = kontak_delete_conn(conn, "pelanggan", &kode).map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("Pelanggan tidak ditemukan.".into());
        }
        Ok(())
    })
}

#[tauri::command]
pub fn pelanggan_kode_exists(state: State<DbState>, kode: String) -> Result<bool, String> {
    with_conn(&state, |conn| kontak_kode_exists_conn(conn, "pelanggan", &kode))
}

// Pemasok

#[tauri::command]
pub fn pemasok_list(state: State<DbState>) -> Result<Vec<KontakMasterRow>, String> {
    with_conn(&state, |conn| kontak_list_conn(conn, "pemasok"))
}

#[tauri::command]
pub fn pemasok_insert(state: State<DbState>, row: KontakMasterInsert) -> Result<(), String> {
    let kode = validate_kontak_insert(&row)?;
    let mut row = row;
    row.kode = kode;
    let ts = now_ts();
    with_conn(&state, |conn| kontak_insert_conn(conn, "pemasok", &row, ts)).map_err(|e| {
        if e.contains("UNIQUE") {
            "Kode sudah dipakai.".into()
        } else {
            e
        }
    })
}

#[tauri::command]
pub fn pemasok_update(
    state: State<DbState>,
    kode: String,
    row: KontakMasterUpdate,
) -> Result<(), String> {
    validate_kontak_update(&row)?;
    let ts = now_ts();
    with_conn_app(&state, |conn| {
        let n = kontak_update_conn(conn, "pemasok", &kode, &row, ts).map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("Pemasok tidak ditemukan.".into());
        }
        Ok(())
    })
}

#[tauri::command]
pub fn pemasok_delete(state: State<DbState>, kode: String) -> Result<(), String> {
    with_conn_app(&state, |conn| {
        let n = kontak_delete_conn(conn, "pemasok", &kode).map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("Pemasok tidak ditemukan.".into());
        }
        Ok(())
    })
}

#[tauri::command]
pub fn pemasok_kode_exists(state: State<DbState>, kode: String) -> Result<bool, String> {
    with_conn(&state, |conn| kontak_kode_exists_conn(conn, "pemasok", &kode))
}

// --- Pembelian (faktur beli) ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PembelianListRow {
    pub nomor: String,
    pub tanggal_faktur: String,
    pub pemasok_nama: String,
    pub total: i64,
    pub status: String,
}

#[tauri::command]
pub fn pembelian_list(state: State<DbState>) -> Result<Vec<PembelianListRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT p.nomor, p.tanggal_faktur, s.nama, p.total, p.status
             FROM pembelian p
             JOIN pemasok s ON lower(s.kode) = lower(p.pemasok_kode)
             ORDER BY p.created_at DESC",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(PembelianListRow {
                nomor: r.get(0)?,
                tanggal_faktur: r.get(1)?,
                pemasok_nama: r.get(2)?,
                total: r.get(3)?,
                status: r.get(4)?,
            })
        })?;
        rows.collect()
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PembelianLineInput {
    pub barang_kode: String,
    pub qty: i64,
    pub harga_satuan: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PembelianInsertPayload {
    pub pemasok_kode: String,
    pub gudang_kode: String,
    pub tanggal_faktur: String,
    pub jatuh_tempo: String,
    pub metode_pembayaran: String,
    pub lines: Vec<PembelianLineInput>,
}

fn pembelian_validate_and_total(payload: &PembelianInsertPayload) -> Result<(NaiveDate, NaiveDate, String, i64), String> {
    let pemasok_kode = payload.pemasok_kode.trim();
    let gudang_kode = payload.gudang_kode.trim();
    if pemasok_kode.is_empty() {
        return Err("Pemasok wajib dipilih.".into());
    }
    if gudang_kode.is_empty() {
        return Err("Gudang wajib dipilih.".into());
    }
    let tgl = NaiveDate::parse_from_str(payload.tanggal_faktur.trim(), "%Y-%m-%d")
        .map_err(|_| "Tanggal faktur tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    let jt = NaiveDate::parse_from_str(payload.jatuh_tempo.trim(), "%Y-%m-%d")
        .map_err(|_| "Jatuh tempo tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if jt < tgl {
        return Err("Jatuh tempo tidak boleh sebelum tanggal faktur.".into());
    }
    let metode = payload.metode_pembayaran.trim();
    if metode.is_empty() {
        return Err("Metode pembayaran wajib dipilih.".into());
    }
    if payload.lines.is_empty() {
        return Err("Tambahkan minimal satu baris item.".into());
    }

    let mut total: i64 = 0;
    for line in &payload.lines {
        let kode_b = line.barang_kode.trim();
        if kode_b.is_empty() {
            return Err("Kode barang pada baris tidak boleh kosong.".into());
        }
        if line.qty <= 0 {
            return Err("Jumlah tiap baris harus lebih dari 0.".into());
        }
        if line.harga_satuan < 0 {
            return Err("Harga satuan tidak valid.".into());
        }
        let sub = line
            .qty
            .checked_mul(line.harga_satuan)
            .ok_or_else(|| "Total baris melimpahi batas.".to_string())?;
        total = total
            .checked_add(sub)
            .ok_or_else(|| "Total faktur melimpahi batas.".to_string())?;
    }

    Ok((tgl, jt, metode.to_string(), total))
}

/// Tambah stok + baris mutasi untuk satu baris pembelian bertipe Barang.
/// `waktu_mutasi` = cap waktu pada baris `stok_mutasi`; `barang_updated_at` = cap pada master `barang_jasa`.
fn pembelian_tx_apply_barang_stok(
    tx: &Transaction<'_>,
    nomor: &str,
    kode_b: &str,
    qty: i64,
    gudang_kode: &str,
    tanggal_transaksi: &str,
    waktu_mutasi: i64,
    barang_updated_at: i64,
) -> Result<(), String> {
    let tipe: String = match tx.query_row(
        "SELECT tipe FROM barang_jasa WHERE lower(kode) = lower(?)",
        params![kode_b],
        |r| r.get(0),
    ) {
        Ok(s) => s,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Err("Barang tidak ditemukan setelah insert baris.".into());
        }
        Err(e) => return Err(e.to_string()),
    };
    if tipe != "Barang" {
        return Ok(());
    }
    let prev: i64 = tx
        .query_row(
            "SELECT COALESCE(stok, 0) FROM barang_jasa WHERE lower(kode) = lower(?)",
            params![kode_b],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let next = prev
        .checked_add(qty)
        .ok_or_else(|| "Stok melimpahi batas.".to_string())?;
    tx.execute(
        "UPDATE barang_jasa SET stok = ?, updated_at = ? WHERE lower(kode) = lower(?)",
        params![next, barang_updated_at, kode_b],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO stok_mutasi (waktu, tanggal_transaksi, barang_kode, gudang_kode, jenis, referensi, qty_masuk, qty_keluar, saldo_setelah, catatan)
         VALUES (?, ?, ?, ?, 'PEMBELIAN', ?, ?, 0, ?, '')",
        params![
            waktu_mutasi,
            tanggal_transaksi,
            kode_b,
            gudang_kode,
            nomor,
            qty,
            next
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Kurangi stok (balikkan dampak pembelian) untuk baris bertipe Barang.
fn pembelian_tx_revert_barang_stok(tx: &Transaction<'_>, kode_b: &str, qty: i64, ts: i64) -> Result<(), String> {
    let tipe: String = match tx.query_row(
        "SELECT tipe FROM barang_jasa WHERE lower(kode) = lower(?)",
        params![kode_b],
        |r| r.get(0),
    ) {
        Ok(s) => s,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };
    if tipe != "Barang" {
        return Ok(());
    }
    let cur: i64 = tx
        .query_row(
            "SELECT COALESCE(stok, 0) FROM barang_jasa WHERE lower(kode) = lower(?)",
            params![kode_b],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if cur < qty {
        return Err(format!(
            "Stok tidak cukup untuk mengoreksi faktur ({}). Stok saat ini {} unit; butuh mengurangi {} dari faktur lama.",
            kode_b, cur, qty
        ));
    }
    let next = cur - qty;
    tx.execute(
        "UPDATE barang_jasa SET stok = ?, updated_at = ? WHERE lower(kode) = lower(?)",
        params![next, ts, kode_b],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pembelian_insert(state: State<DbState>, payload: PembelianInsertPayload) -> Result<String, String> {
    let (tgl, jt, metode, total) = pembelian_validate_and_total(&payload)?;
    let pemasok_kode = payload.pemasok_kode.trim();
    let gudang_kode = payload.gudang_kode.trim();
    let nomor = format!("FB-{}", Utc::now().timestamp_millis());
    let ts = now_ts();
    let tanggal_str = tgl.format("%Y-%m-%d").to_string();
    let jatuh_str = jt.format("%Y-%m-%d").to_string();

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO pembelian (nomor, pemasok_kode, gudang_kode, tanggal_faktur, jatuh_tempo, metode_pembayaran, total, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Dipesan', ?, ?)",
        params![
            &nomor,
            pemasok_kode,
            gudang_kode,
            tanggal_str,
            jatuh_str,
            metode,
            total,
            ts,
            ts
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("FOREIGN KEY") {
            "Pemasok, gudang, atau barang tidak ditemukan.".into()
        } else if e.to_string().contains("UNIQUE") {
            "Nomor faktur bentrok — coba simpan lagi.".into()
        } else {
            e.to_string()
        }
    })?;

    for line in &payload.lines {
        let kode_b = line.barang_kode.trim();
        let sub = line.qty * line.harga_satuan;
        tx.execute(
            "INSERT INTO pembelian_line (nomor, barang_kode, qty, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?)",
            params![&nomor, kode_b, line.qty, line.harga_satuan, sub],
        )
        .map_err(|e| {
            if e.to_string().contains("FOREIGN KEY") {
                "Salah satu kode barang tidak ditemukan.".into()
            } else {
                e.to_string()
            }
        })?;
        pembelian_tx_apply_barang_stok(&tx, &nomor, kode_b, line.qty, gudang_kode, &tanggal_str, ts, ts)?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(nomor)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PembelianDetailLine {
    pub barang_kode: String,
    pub barang_nama: String,
    pub qty: i64,
    pub harga_satuan: i64,
    pub subtotal: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PembelianDetail {
    pub nomor: String,
    pub pemasok_kode: String,
    pub pemasok_nama: String,
    pub gudang_kode: String,
    pub gudang_nama: String,
    pub tanggal_faktur: String,
    pub jatuh_tempo: String,
    pub metode_pembayaran: String,
    pub total: i64,
    pub status: String,
    pub lines: Vec<PembelianDetailLine>,
}

#[tauri::command]
pub fn pembelian_detail(state: State<DbState>, nomor: String) -> Result<PembelianDetail, String> {
    let n = nomor.trim();
    if n.is_empty() {
        return Err("Nomor faktur wajib diisi.".into());
    }
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;

    let mut detail: PembelianDetail = conn
        .query_row(
            "SELECT p.nomor, p.pemasok_kode, s.nama, p.gudang_kode, g.nama, p.tanggal_faktur, p.jatuh_tempo, p.metode_pembayaran, p.total, p.status
             FROM pembelian p
             JOIN pemasok s ON lower(s.kode) = lower(p.pemasok_kode)
             JOIN gudang g ON lower(g.kode) = lower(p.gudang_kode)
             WHERE p.nomor = ?",
            params![n],
            |r| {
                Ok(PembelianDetail {
                    nomor: r.get(0)?,
                    pemasok_kode: r.get(1)?,
                    pemasok_nama: r.get(2)?,
                    gudang_kode: r.get(3)?,
                    gudang_nama: r.get(4)?,
                    tanggal_faktur: r.get(5)?,
                    jatuh_tempo: r.get(6)?,
                    metode_pembayaran: r.get(7)?,
                    total: r.get(8)?,
                    status: r.get(9)?,
                    lines: Vec::new(),
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => "Faktur tidak ditemukan.".into(),
            _ => e.to_string(),
        })?;

    let mut stmt = conn
        .prepare(
            "SELECT l.barang_kode, b.nama, l.qty, l.harga_satuan, l.subtotal
             FROM pembelian_line l
             JOIN barang_jasa b ON lower(b.kode) = lower(l.barang_kode)
             WHERE l.nomor = ?
             ORDER BY l.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let line_rows = stmt
        .query_map(params![n], |r| {
            Ok(PembelianDetailLine {
                barang_kode: r.get(0)?,
                barang_nama: r.get(1)?,
                qty: r.get(2)?,
                harga_satuan: r.get(3)?,
                subtotal: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut lines = Vec::new();
    for lr in line_rows {
        lines.push(lr.map_err(|e| e.to_string())?);
    }
    detail.lines = lines;

    Ok(detail)
}

#[tauri::command]
pub fn pembelian_update(
    state: State<DbState>,
    nomor: String,
    payload: PembelianInsertPayload,
) -> Result<(), String> {
    let nomor_trim = nomor.trim();
    if nomor_trim.is_empty() {
        return Err("Nomor faktur tidak valid.".into());
    }
    let (tgl, jt, metode, total) = pembelian_validate_and_total(&payload)?;
    let pemasok_kode = payload.pemasok_kode.trim();
    let gudang_kode = payload.gudang_kode.trim();
    let tanggal_str = tgl.format("%Y-%m-%d").to_string();
    let jatuh_str = jt.format("%Y-%m-%d").to_string();
    let ts = now_ts();

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let exists: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM pembelian WHERE nomor = ?",
            params![nomor_trim],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err("Faktur pembelian tidak ditemukan.".into());
    }

    let mut old_lines: Vec<(String, i64)> = Vec::new();
    {
        let mut stmt = tx
            .prepare("SELECT barang_kode, qty FROM pembelian_line WHERE nomor = ?")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![nomor_trim], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            old_lines.push(row.map_err(|e| e.to_string())?);
        }
    }

    tx.execute(
        "DELETE FROM stok_mutasi WHERE referensi = ? AND upper(trim(jenis)) = 'PEMBELIAN'",
        params![nomor_trim],
    )
    .map_err(|e| e.to_string())?;

    for (kode_b, qty) in &old_lines {
        pembelian_tx_revert_barang_stok(&tx, kode_b.trim(), *qty, ts)?;
    }

    tx.execute(
        "DELETE FROM pembelian_line WHERE nomor = ?",
        params![nomor_trim],
    )
    .map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE pembelian SET pemasok_kode = ?, gudang_kode = ?, tanggal_faktur = ?, jatuh_tempo = ?, metode_pembayaran = ?, total = ?, updated_at = ? WHERE nomor = ?",
        params![
            pemasok_kode,
            gudang_kode,
            tanggal_str,
            jatuh_str,
            metode,
            total,
            ts,
            nomor_trim
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("FOREIGN KEY") {
            "Pemasok atau gudang tidak ditemukan.".into()
        } else {
            e.to_string()
        }
    })?;

    for line in &payload.lines {
        let kode_b = line.barang_kode.trim();
        let sub = line.qty * line.harga_satuan;
        tx.execute(
            "INSERT INTO pembelian_line (nomor, barang_kode, qty, harga_satuan, subtotal) VALUES (?, ?, ?, ?, ?)",
            params![nomor_trim, kode_b, line.qty, line.harga_satuan, sub],
        )
        .map_err(|e| {
            if e.to_string().contains("FOREIGN KEY") {
                "Salah satu kode barang tidak ditemukan.".into()
            } else {
                e.to_string()
            }
        })?;
        pembelian_tx_apply_barang_stok(&tx, nomor_trim, kode_b, line.qty, gudang_kode, &tanggal_str, ts, ts)?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// --- Penjualan (faktur jual) ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PenjualanListRow {
    pub nomor: String,
    pub tanggal_faktur: String,
    pub pelanggan_nama: String,
    pub salesman: String,
    pub total: i64,
    pub status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PenjualanLineInput {
    pub barang_kode: String,
    pub qty: i64,
    pub harga_satuan: i64,
    pub catatan: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PenjualanInsertPayload {
    pub pelanggan_kode: String,
    pub gudang_kode: String,
    pub salesman: String,
    pub tanggal_faktur: String,
    pub jatuh_tempo: String,
    pub catatan_faktur: String,
    pub lines: Vec<PenjualanLineInput>,
}

fn penjualan_validate_and_total(payload: &PenjualanInsertPayload) -> Result<(NaiveDate, NaiveDate, i64), String> {
    let pelanggan_kode = payload.pelanggan_kode.trim();
    let gudang_kode = payload.gudang_kode.trim();
    if pelanggan_kode.is_empty() {
        return Err("Pelanggan wajib dipilih.".into());
    }
    if gudang_kode.is_empty() {
        return Err("Gudang wajib dipilih.".into());
    }
    let tgl = NaiveDate::parse_from_str(payload.tanggal_faktur.trim(), "%Y-%m-%d")
        .map_err(|_| "Tanggal faktur tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    let jt = NaiveDate::parse_from_str(payload.jatuh_tempo.trim(), "%Y-%m-%d")
        .map_err(|_| "Jatuh tempo tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if jt < tgl {
        return Err("Jatuh tempo tidak boleh sebelum tanggal faktur.".into());
    }
    if payload.lines.is_empty() {
        return Err("Tambahkan minimal satu baris item.".into());
    }

    let mut total: i64 = 0;
    for line in &payload.lines {
        let kode_b = line.barang_kode.trim();
        if kode_b.is_empty() {
            return Err("Kode barang pada baris tidak boleh kosong.".into());
        }
        if line.qty <= 0 {
            return Err("Jumlah tiap baris harus lebih dari 0.".into());
        }
        if line.harga_satuan < 0 {
            return Err("Harga satuan tidak valid.".into());
        }
        let sub = line
            .qty
            .checked_mul(line.harga_satuan)
            .ok_or_else(|| "Total baris melimpahi batas.".to_string())?;
        total = total
            .checked_add(sub)
            .ok_or_else(|| "Total faktur melimpahi batas.".to_string())?;
    }

    Ok((tgl, jt, total))
}

/// Kurangi stok + baris mutasi keluar untuk satu baris penjualan bertipe Barang.
fn penjualan_tx_apply_barang_stok(
    tx: &Transaction<'_>,
    nomor: &str,
    kode_b: &str,
    qty: i64,
    gudang_kode: &str,
    tanggal_transaksi: &str,
    catatan: &str,
    waktu_mutasi: i64,
    barang_updated_at: i64,
) -> Result<(), String> {
    let tipe: String = match tx.query_row(
        "SELECT tipe FROM barang_jasa WHERE lower(kode) = lower(?)",
        params![kode_b],
        |r| r.get(0),
    ) {
        Ok(s) => s,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Err("Barang tidak ditemukan setelah insert baris.".into());
        }
        Err(e) => return Err(e.to_string()),
    };
    if tipe != "Barang" {
        return Ok(());
    }
    let prev: i64 = tx
        .query_row(
            "SELECT COALESCE(stok, 0) FROM barang_jasa WHERE lower(kode) = lower(?)",
            params![kode_b],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if prev < qty {
        return Err(format!(
            "Stok tidak cukup untuk {} ({}). Stok saat ini {} unit; diminta {} unit.",
            kode_b, nomor, prev, qty
        ));
    }
    let next = prev - qty;
    tx.execute(
        "UPDATE barang_jasa SET stok = ?, updated_at = ? WHERE lower(kode) = lower(?)",
        params![next, barang_updated_at, kode_b],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO stok_mutasi (waktu, tanggal_transaksi, barang_kode, gudang_kode, jenis, referensi, qty_masuk, qty_keluar, saldo_setelah, catatan)
         VALUES (?, ?, ?, ?, 'PENJUALAN', ?, 0, ?, ?, ?)",
        params![
            waktu_mutasi,
            tanggal_transaksi,
            kode_b,
            gudang_kode,
            nomor,
            qty,
            next,
            catatan
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn penjualan_list(state: State<DbState>) -> Result<Vec<PenjualanListRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT p.nomor, p.tanggal_faktur, c.nama, p.salesman, p.total, p.status
             FROM penjualan p
             JOIN pelanggan c ON lower(c.kode) = lower(p.pelanggan_kode)
             ORDER BY p.created_at DESC",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(PenjualanListRow {
                nomor: r.get(0)?,
                tanggal_faktur: r.get(1)?,
                pelanggan_nama: r.get(2)?,
                salesman: r.get(3)?,
                total: r.get(4)?,
                status: r.get(5)?,
            })
        })?;
        rows.collect()
    })
}

#[tauri::command]
pub fn penjualan_insert(state: State<DbState>, payload: PenjualanInsertPayload) -> Result<String, String> {
    let (tgl, jt, total) = penjualan_validate_and_total(&payload)?;
    let pelanggan_kode = payload.pelanggan_kode.trim();
    let gudang_kode = payload.gudang_kode.trim();
    let salesman = payload.salesman.trim();
    let catatan_faktur = payload.catatan_faktur.trim();
    let nomor = format!("FJ-{}", Utc::now().timestamp_millis());
    let ts = now_ts();
    let tanggal_str = tgl.format("%Y-%m-%d").to_string();
    let jatuh_str = jt.format("%Y-%m-%d").to_string();

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO penjualan (nomor, pelanggan_kode, gudang_kode, salesman, tanggal_faktur, jatuh_tempo, catatan_faktur, total, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Dipesan', ?, ?)",
        params![
            &nomor,
            pelanggan_kode,
            gudang_kode,
            salesman,
            tanggal_str,
            jatuh_str,
            catatan_faktur,
            total,
            ts,
            ts
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("FOREIGN KEY") {
            "Pelanggan, gudang, atau barang tidak ditemukan.".into()
        } else if e.to_string().contains("UNIQUE") {
            "Nomor faktur bentrok — coba simpan lagi.".into()
        } else {
            e.to_string()
        }
    })?;

    for line in &payload.lines {
        let kode_b = line.barang_kode.trim();
        let sub = line.qty * line.harga_satuan;
        let line_catatan = line.catatan.trim();
        tx.execute(
            "INSERT INTO penjualan_line (nomor, barang_kode, qty, harga_satuan, subtotal, catatan) VALUES (?, ?, ?, ?, ?, ?)",
            params![&nomor, kode_b, line.qty, line.harga_satuan, sub, line_catatan],
        )
        .map_err(|e| {
            if e.to_string().contains("FOREIGN KEY") {
                "Salah satu kode barang tidak ditemukan.".into()
            } else {
                e.to_string()
            }
        })?;
        penjualan_tx_apply_barang_stok(
            &tx,
            &nomor,
            kode_b,
            line.qty,
            gudang_kode,
            &tanggal_str,
            line_catatan,
            ts,
            ts,
        )?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(nomor)
}

/// Bangun ulang mutasi pembelian dari seluruh faktur di basis data dan set ulang kolom `stok`
/// untuk master bertipe Barang sesuai total pembelian (dalam urutan tanggal faktur).
///
/// Dipakai untuk memperbaiki ketika kartu / laporan stok tidak selaras dengan faktur (misalnya data lama).
/// Saat ini hanya ada mutasi `PEMBELIAN`; penyesuaian manual lain tidak diikutkan.
#[tauri::command]
pub fn stok_mutasi_sinkron_dari_pembelian(state: State<DbState>) -> Result<String, String> {
    let repair_touch_ts = now_ts();

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "DELETE FROM stok_mutasi WHERE upper(trim(jenis)) = 'PEMBELIAN'",
        [],
    )
    .map_err(|e| e.to_string())?;

    tx.execute("UPDATE barang_jasa SET stok = 0 WHERE tipe = 'Barang'", [])
        .map_err(|e| e.to_string())?;

    let mut inv_stmt = tx
        .prepare(
            "SELECT nomor, gudang_kode, tanggal_faktur FROM pembelian ORDER BY tanggal_faktur ASC, nomor ASC",
        )
        .map_err(|e| e.to_string())?;

    let invoice_heads = inv_stmt
        .query_map([], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?))
        })
        .map_err(|e| e.to_string())?;

    let mut invoices = Vec::new();
    for row in invoice_heads {
        invoices.push(row.map_err(|e| e.to_string())?);
    }
    drop(inv_stmt);

    let invoice_count = invoices.len();

    for (nomor, gudang_kode, tanggal_faktur) in invoices {
        let base_waktu = waktu_mutasi_dari_tgl_faktur(tanggal_faktur.trim())?;
        let mut line_stmt = tx
            .prepare("SELECT barang_kode, qty FROM pembelian_line WHERE nomor = ? ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let lines = line_stmt
            .query_map(params![nomor.as_str()], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
            })
            .map_err(|e| e.to_string())?;

        let mut line_idx = 0_i64;
        for ln in lines {
            let (kode_b, qty) = ln.map_err(|e| e.to_string())?;
            line_idx += 1;
            pembelian_tx_apply_barang_stok(
                &tx,
                nomor.as_str(),
                kode_b.trim(),
                qty,
                gudang_kode.trim(),
                tanggal_faktur.trim(),
                base_waktu.saturating_add(line_idx),
                repair_touch_ts,
            )?;
        }
        drop(line_stmt);
    }

    tx.commit().map_err(|e| e.to_string())?;

    let mutasi_pembelian: i64 = with_conn_app(&state, |c| {
        c.query_row(
            "SELECT COUNT(*) FROM stok_mutasi WHERE upper(trim(jenis)) = 'PEMBELIAN'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())
    })?;

    Ok(format!(
        "Sinkron selesai. {} faktur diproses; {} baris mutasi pembelian; stok barang fisik disetel ulang dari faktur (urutan tanggal faktur).",
        invoice_count, mutasi_pembelian
    ))
}

// --- Mutasi stok (kartu stok / laporan) ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StokMutasiRow {
    pub id: i64,
    pub waktu: i64,
    pub tanggal_transaksi: String,
    pub barang_kode: String,
    pub barang_nama: String,
    pub gudang_kode: String,
    pub gudang_nama: String,
    pub jenis: String,
    pub referensi: String,
    pub qty_masuk: i64,
    pub qty_keluar: i64,
    pub saldo_setelah: i64,
    pub catatan: String,
}

#[tauri::command]
pub fn stok_mutasi_for_barang(state: State<DbState>, kode: String) -> Result<Vec<StokMutasiRow>, String> {
    let k = kode.trim();
    if k.is_empty() {
        return Err("Kode barang wajib diisi.".into());
    }
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT m.id, m.waktu, m.tanggal_transaksi, m.barang_kode, b.nama, m.gudang_kode, g.nama,
                    m.jenis, m.referensi, m.qty_masuk, m.qty_keluar, m.saldo_setelah, m.catatan
             FROM stok_mutasi m
             JOIN barang_jasa b ON lower(b.kode) = lower(m.barang_kode)
             JOIN gudang g ON lower(g.kode) = lower(m.gudang_kode)
             WHERE lower(m.barang_kode) = lower(?)
             ORDER BY m.waktu ASC, m.id ASC",
        )?;
        let rows = stmt.query_map(params![k], |r| {
            Ok(StokMutasiRow {
                id: r.get(0)?,
                waktu: r.get(1)?,
                tanggal_transaksi: r.get(2)?,
                barang_kode: r.get(3)?,
                barang_nama: r.get(4)?,
                gudang_kode: r.get(5)?,
                gudang_nama: r.get(6)?,
                jenis: r.get(7)?,
                referensi: r.get(8)?,
                qty_masuk: r.get(9)?,
                qty_keluar: r.get(10)?,
                saldo_setelah: r.get(11)?,
                catatan: r.get(12)?,
            })
        })?;
        rows.collect()
    })
}

#[tauri::command]
pub fn stok_mutasi_laporan(
    state: State<DbState>,
    tanggal_dari: String,
    tanggal_sampai: String,
    barang_kode: Option<String>,
) -> Result<Vec<StokMutasiRow>, String> {
    let dari = tanggal_dari.trim();
    let sampai = tanggal_sampai.trim();
    let d1 = NaiveDate::parse_from_str(dari, "%Y-%m-%d")
        .map_err(|_| "Tanggal mulai tidak valid (YYYY-MM-DD).".to_string())?;
    let d2 = NaiveDate::parse_from_str(sampai, "%Y-%m-%d")
        .map_err(|_| "Tanggal akhir tidak valid (YYYY-MM-DD).".to_string())?;
    if d2 < d1 {
        return Err("Tanggal akhir tidak boleh sebelum tanggal mulai.".into());
    }
    let filter_kode = barang_kode
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    with_conn(&state, |conn| {
        let map_row = |r: &rusqlite::Row| -> rusqlite::Result<StokMutasiRow> {
            Ok(StokMutasiRow {
                id: r.get(0)?,
                waktu: r.get(1)?,
                tanggal_transaksi: r.get(2)?,
                barang_kode: r.get(3)?,
                barang_nama: r.get(4)?,
                gudang_kode: r.get(5)?,
                gudang_nama: r.get(6)?,
                jenis: r.get(7)?,
                referensi: r.get(8)?,
                qty_masuk: r.get(9)?,
                qty_keluar: r.get(10)?,
                saldo_setelah: r.get(11)?,
                catatan: r.get(12)?,
            })
        };

        // Filter by waktu pencatatan (bukan tanggal_transaksi / tanggal faktur), supaya mutasi dari
        // pembelian dengan tanggal faktur lama tetap muncul bila baru diedit/disimpan dalam rentang ini.
        if let Some(ref bk) = filter_kode {
            let mut stmt = conn.prepare(
                "SELECT m.id, m.waktu, m.tanggal_transaksi, m.barang_kode, b.nama, m.gudang_kode, g.nama,
                        m.jenis, m.referensi, m.qty_masuk, m.qty_keluar, m.saldo_setelah, m.catatan
                 FROM stok_mutasi m
                 JOIN barang_jasa b ON lower(b.kode) = lower(m.barang_kode)
                 JOIN gudang g ON lower(g.kode) = lower(m.gudang_kode)
                 WHERE date(m.waktu, 'unixepoch', 'localtime') BETWEEN ?1 AND ?2 AND lower(m.barang_kode) = lower(?3)
                 ORDER BY m.waktu DESC, m.id DESC",
            )?;
            let rows = stmt.query_map(params![dari, sampai, bk.as_str()], map_row)?;
            rows.collect()
        } else {
            let mut stmt = conn.prepare(
                "SELECT m.id, m.waktu, m.tanggal_transaksi, m.barang_kode, b.nama, m.gudang_kode, g.nama,
                        m.jenis, m.referensi, m.qty_masuk, m.qty_keluar, m.saldo_setelah, m.catatan
                 FROM stok_mutasi m
                 JOIN barang_jasa b ON lower(b.kode) = lower(m.barang_kode)
                 JOIN gudang g ON lower(g.kode) = lower(m.gudang_kode)
                 WHERE date(m.waktu, 'unixepoch', 'localtime') BETWEEN ?1 AND ?2
                 ORDER BY m.waktu DESC, m.id DESC",
            )?;
            let rows = stmt.query_map(params![dari, sampai], map_row)?;
            rows.collect()
        }
    })
}

// --- Keuangan: akun kas & jurnal umum ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AkunKeuanganRow {
    pub kode: String,
    pub nama: String,
    pub induk_kode: Option<String>,
    pub induk_nama: Option<String>,
    pub kelompok_lr: String,
    pub is_akun_kas: bool,
    pub saldo: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AkunKeuanganInsertPayload {
    pub kode: String,
    pub nama: String,
    pub induk_kode: Option<String>,
    pub kelompok_lr: Option<String>,
    pub is_akun_kas: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AkunKeuanganUpdatePayload {
    pub kode: String,
    pub nama: String,
    pub induk_kode: Option<String>,
    pub kelompok_lr: Option<String>,
    pub is_akun_kas: bool,
}

fn normalize_kelompok_lr(raw: Option<&str>) -> String {
    match raw.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()) {
        Some(k) if k == "PENDAPATAN" || k == "BEBAN" || k == "HPP" => k,
        Some(_) => String::new(),
        None => String::new(),
    }
}

fn validate_akun_insert(
    tx: &Transaction<'_>,
    kode: &str,
    induk_kode: Option<&str>,
) -> Result<(), String> {
    if let Some(induk) = induk_kode {
        if induk.eq_ignore_ascii_case(kode) {
            return Err("Akun induk tidak boleh sama dengan kode akun.".into());
        }
        let ada: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM akun_keuangan WHERE lower(kode) = lower(?)",
                params![induk],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if ada == 0 {
            return Err("Akun induk tidak ditemukan.".into());
        }
    }
    Ok(())
}

fn akun_induk_kode_optional(tx: &Transaction<'_>, kode: &str) -> Result<Option<String>, String> {
    match tx.query_row(
        "SELECT induk_kode FROM akun_keuangan WHERE lower(kode) = lower(?)",
        params![kode],
        |r| r.get::<_, Option<String>>(0),
    ) {
        Ok(v) => Ok(v),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Pastikan induk ada, bukan diri sendiri, dan tidak membentuk siklus (induk tidak boleh berada di subtree akun ini).
fn validate_akun_induk_chain(
    tx: &Transaction<'_>,
    akun_kode: &str,
    induk_kode: Option<&str>,
) -> Result<(), String> {
    validate_akun_insert(tx, akun_kode, induk_kode)?;
    let mut cur = induk_kode.map(|s| s.to_string());
    let mut depth = 0u32;
    while let Some(ref node) = cur {
        if depth > 512 {
            return Err("Rantai induk akun terlalu dalam.".into());
        }
        if node.eq_ignore_ascii_case(akun_kode) {
            return Err("Induk akun tidak boleh berada di bawah akun ini (siklus).".into());
        }
        cur = akun_induk_kode_optional(tx, node)?;
        depth += 1;
    }
    Ok(())
}

/// Perbarui saldo untuk akun yang ditandai sebagai akun kas: debit menambah, kredit mengurangi.
fn akun_kas_apply_saldo_delta(
    tx: &Transaction<'_>,
    akun_kode: &str,
    debit: i64,
    kredit: i64,
    ts: i64,
) -> Result<(), String> {
    let is_kas: i64 = match tx.query_row(
        "SELECT COALESCE(is_akun_kas, 0) FROM akun_keuangan WHERE lower(kode) = lower(?)",
        params![akun_kode],
        |r| r.get(0),
    ) {
        Ok(v) => v,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };
    if is_kas == 0 {
        return Ok(());
    }
    let delta = debit - kredit;
    if delta == 0 {
        return Ok(());
    }
    let cur: i64 = tx
        .query_row(
            "SELECT COALESCE(saldo, 0) FROM akun_keuangan WHERE lower(kode) = lower(?)",
            params![akun_kode],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let next = cur
        .checked_add(delta)
        .ok_or_else(|| format!("Saldo akun {akun_kode} melimpahi batas."))?;
    tx.execute(
        "UPDATE akun_keuangan SET saldo = ?, updated_at = ? WHERE lower(kode) = lower(?)",
        params![next, ts, akun_kode],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JurnalKonfigurasiRow {
    pub akun_piutang: Option<String>,
    pub akun_hutang: Option<String>,
    pub akun_pendapatan: Option<String>,
    pub akun_pembelian: Option<String>,
    pub akun_penerimaan_lainnya: Option<String>,
    pub akun_pengeluaran_lainnya: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JurnalKonfigurasiSetPayload {
    pub akun_piutang: Option<String>,
    pub akun_hutang: Option<String>,
    pub akun_pendapatan: Option<String>,
    pub akun_pembelian: Option<String>,
    pub akun_penerimaan_lainnya: Option<String>,
    pub akun_pengeluaran_lainnya: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JurnalUmumListRow {
    pub id: i64,
    pub tanggal: String,
    pub jenis: String,
    pub referensi: String,
    pub catatan: String,
    pub total_debit: i64,
    pub total_kredit: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JurnalTransaksiInsertPayload {
    pub tanggal: String,
    pub jenis: String,
    pub referensi: String,
    pub catatan: String,
    pub jumlah: i64,
    pub kas_kode: Option<String>,
    pub kas_sumber_kode: Option<String>,
    pub kas_target_kode: Option<String>,
}

fn konfigurasi_ensure_row(tx: &Transaction<'_>, ts: i64) -> Result<(), String> {
    tx.execute(
        "INSERT OR IGNORE INTO jurnal_konfigurasi (id, created_at, updated_at) VALUES (1, ?, ?)",
        params![ts, ts],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn konfigurasi_get_row(tx: &Transaction<'_>) -> Result<JurnalKonfigurasiRow, String> {
    tx.query_row(
        "SELECT akun_piutang, akun_hutang, akun_pendapatan, akun_pembelian, akun_penerimaan_lainnya, akun_pengeluaran_lainnya
         FROM jurnal_konfigurasi
         WHERE id = 1",
        [],
        |r| {
            Ok(JurnalKonfigurasiRow {
                akun_piutang: r.get(0)?,
                akun_hutang: r.get(1)?,
                akun_pendapatan: r.get(2)?,
                akun_pembelian: r.get(3)?,
                akun_penerimaan_lainnya: r.get(4)?,
                akun_pengeluaran_lainnya: r.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn akun_keuangan_list(state: State<DbState>) -> Result<Vec<AkunKeuanganRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT a.kode, a.nama, a.induk_kode, p.nama, COALESCE(a.kelompok_lr, ''),
                    COALESCE(a.is_akun_kas, 0), COALESCE(a.saldo, 0)
             FROM akun_keuangan a
             LEFT JOIN akun_keuangan p ON lower(p.kode) = lower(a.induk_kode)
             ORDER BY a.kode COLLATE NOCASE ASC",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(AkunKeuanganRow {
                kode: r.get(0)?,
                nama: r.get(1)?,
                induk_kode: r.get(2)?,
                induk_nama: r.get(3)?,
                kelompok_lr: r.get(4)?,
                is_akun_kas: r.get::<_, i64>(5)? != 0,
                saldo: r.get(6)?,
            })
        })?;
        rows.collect()
    })
}

#[tauri::command]
pub fn akun_keuangan_insert(
    state: State<DbState>,
    payload: AkunKeuanganInsertPayload,
) -> Result<(), String> {
    let kode = payload.kode.trim().to_uppercase();
    let nama = payload.nama.trim();
    let induk = payload
        .induk_kode
        .as_ref()
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());
    let kelompok = normalize_kelompok_lr(payload.kelompok_lr.as_deref());
    let is_kas = if payload.is_akun_kas { 1 } else { 0 };

    if kode.is_empty() {
        return Err("Kode akun wajib diisi.".into());
    }
    if nama.is_empty() {
        return Err("Nama akun wajib diisi.".into());
    }

    let ts = now_ts();
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    validate_akun_induk_chain(
        &tx,
        &kode,
        induk.as_deref(),
    )?;
    tx.execute(
        "INSERT INTO akun_keuangan (kode, nama, induk_kode, kelompok_lr, is_akun_kas, saldo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
        params![kode, nama, induk, kelompok, is_kas, ts, ts],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Kode akun bentrok.".to_string()
        } else if e.to_string().contains("FOREIGN KEY") {
            "Akun induk tidak valid.".to_string()
        } else {
            e.to_string()
        }
    })?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn akun_keuangan_update(
    state: State<DbState>,
    payload: AkunKeuanganUpdatePayload,
) -> Result<(), String> {
    let kode = payload.kode.trim().to_uppercase();
    let nama = payload.nama.trim();
    let induk = payload
        .induk_kode
        .as_ref()
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());
    let kelompok = normalize_kelompok_lr(payload.kelompok_lr.as_deref());
    let is_kas = if payload.is_akun_kas { 1 } else { 0 };

    if kode.is_empty() {
        return Err("Kode akun wajib diisi.".into());
    }
    if nama.is_empty() {
        return Err("Nama akun wajib diisi.".into());
    }

    let ts = now_ts();
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let exists: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM akun_keuangan WHERE lower(kode) = lower(?)",
            params![kode],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err("Akun tidak ditemukan.".into());
    }

    validate_akun_induk_chain(&tx, &kode, induk.as_deref())?;

    let n = tx
        .execute(
            "UPDATE akun_keuangan SET nama = ?, induk_kode = ?, kelompok_lr = ?, is_akun_kas = ?, updated_at = ?
             WHERE lower(kode) = lower(?)",
            params![nama, induk, kelompok, is_kas, ts, kode],
        )
        .map_err(|e| {
            if e.to_string().contains("FOREIGN KEY") {
                "Akun induk tidak valid.".to_string()
            } else {
                e.to_string()
            }
        })?;
    if n == 0 {
        return Err("Akun tidak ditemukan.".into());
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn akun_keuangan_delete(state: State<DbState>, kode: String) -> Result<(), String> {
    let kode = kode.trim().to_uppercase();
    if kode.is_empty() {
        return Err("Kode akun wajib diisi.".into());
    }
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let child: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM akun_keuangan WHERE lower(induk_kode) = lower(?)",
            params![kode],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if child > 0 {
        return Err("Akun masih dipakai sebagai induk akun lain.".into());
    }
    let n = conn
        .execute("DELETE FROM akun_keuangan WHERE kode = ?", params![kode])
        .map_err(|e| {
            if e.to_string().contains("FOREIGN KEY") {
                "Akun masih direferensikan (jurnal atau konfigurasi).".to_string()
            } else {
                e.to_string()
            }
        })?;
    if n == 0 {
        return Err("Akun tidak ditemukan.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn jurnal_konfigurasi_get(state: State<DbState>) -> Result<JurnalKonfigurasiRow, String> {
    let ts = now_ts();
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    konfigurasi_ensure_row(&tx, ts)?;
    let row = konfigurasi_get_row(&tx)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub fn jurnal_konfigurasi_set(
    state: State<DbState>,
    payload: JurnalKonfigurasiSetPayload,
) -> Result<(), String> {
    let ts = now_ts();
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    konfigurasi_ensure_row(&tx, ts)?;

    tx.execute(
        "UPDATE jurnal_konfigurasi
         SET akun_piutang = ?, akun_hutang = ?, akun_pendapatan = ?, akun_pembelian = ?,
             akun_penerimaan_lainnya = ?, akun_pengeluaran_lainnya = ?, updated_at = ?
         WHERE id = 1",
        params![
            payload.akun_piutang.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()),
            payload.akun_hutang.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()),
            payload.akun_pendapatan.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()),
            payload.akun_pembelian.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()),
            payload.akun_penerimaan_lainnya.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()),
            payload.akun_pengeluaran_lainnya.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()),
            ts
        ],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn jurnal_umum_list(state: State<DbState>) -> Result<Vec<JurnalUmumListRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT j.id, j.tanggal, j.jenis, j.referensi, j.catatan,
                    COALESCE(SUM(l.debit), 0) AS total_debit,
                    COALESCE(SUM(l.kredit), 0) AS total_kredit
             FROM jurnal_umum j
             LEFT JOIN jurnal_umum_line l ON l.jurnal_id = j.id
             GROUP BY j.id
             ORDER BY j.id DESC
             LIMIT 200",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(JurnalUmumListRow {
                id: r.get(0)?,
                tanggal: r.get(1)?,
                jenis: r.get(2)?,
                referensi: r.get(3)?,
                catatan: r.get(4)?,
                total_debit: r.get(5)?,
                total_kredit: r.get(6)?,
            })
        })?;
        rows.collect()
    })
}

#[tauri::command]
pub fn jurnal_umum_insert_transaksi(
    state: State<DbState>,
    payload: JurnalTransaksiInsertPayload,
) -> Result<String, String> {
    let tanggal = payload.tanggal.trim();
    let referensi = payload.referensi.trim();
    let catatan = payload.catatan.trim();
    let jenis = payload.jenis.trim();
    let jumlah = payload.jumlah;

    if tanggal.is_empty() {
        return Err("Tanggal wajib diisi.".into());
    }
    NaiveDate::parse_from_str(tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if referensi.is_empty() {
        return Err("Referensi wajib diisi.".into());
    }
    if jenis.is_empty() {
        return Err("Jenis transaksi wajib diisi.".into());
    }
    if jumlah <= 0 {
        return Err("Jumlah harus lebih dari 0.".into());
    }

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let ts = now_ts();
    konfigurasi_ensure_row(&tx, ts)?;
    let cfg = konfigurasi_get_row(&tx)?;

    let mut lines: Vec<(String, i64, i64)> = Vec::new(); // (akun, debit, kredit)

    let kas_kode = payload
        .kas_kode
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());
    let kas_sumber_kode = payload
        .kas_sumber_kode
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());
    let kas_target_kode = payload
        .kas_target_kode
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());

    let mutasi_ok = |total: i64| -> Result<(), String> {
        if total <= 0 {
            return Err("Jumlah transaksi tidak valid.".into());
        }
        Ok(())
    };
    mutasi_ok(jumlah)?;

    match jenis {
        "PEMBELIAN" => {
            let akun_pembelian = cfg
                .akun_pembelian
                .ok_or_else(|| "Konfigurasi akun pembelian belum diatur.".to_string())?;
            let akun_hutang = cfg
                .akun_hutang
                .ok_or_else(|| "Konfigurasi akun hutang belum diatur.".to_string())?;
            lines.push((akun_pembelian, jumlah, 0));
            lines.push((akun_hutang, 0, jumlah));
        }
        "PENJUALAN" => {
            let akun_piutang = cfg
                .akun_piutang
                .ok_or_else(|| "Konfigurasi akun piutang belum diatur.".to_string())?;
            let akun_pendapatan = cfg
                .akun_pendapatan
                .ok_or_else(|| "Konfigurasi akun pendapatan belum diatur.".to_string())?;
            lines.push((akun_piutang, jumlah, 0));
            lines.push((akun_pendapatan, 0, jumlah));
        }
        "PELUNASAN_PIUTANG" => {
            let akun_piutang = cfg
                .akun_piutang
                .ok_or_else(|| "Konfigurasi akun piutang belum diatur.".to_string())?;
            let kas = kas_kode.ok_or_else(|| "Pilih akun kas untuk pelunasan piutang.".to_string())?;
            lines.push((kas, jumlah, 0));
            lines.push((akun_piutang, 0, jumlah));
        }
        "PELUNASAN_HUTANG" => {
            let akun_hutang = cfg
                .akun_hutang
                .ok_or_else(|| "Konfigurasi akun hutang belum diatur.".to_string())?;
            let kas = kas_kode.ok_or_else(|| "Pilih akun kas untuk pelunasan hutang.".to_string())?;
            lines.push((akun_hutang, jumlah, 0));
            lines.push((kas, 0, jumlah));
        }
        "PENERIMAAN_LAINNYA" => {
            let akun_penerimaan = cfg
                .akun_penerimaan_lainnya
                .ok_or_else(|| "Konfigurasi akun penerimaan lainnya belum diatur.".to_string())?;
            let kas = kas_kode.ok_or_else(|| "Pilih akun kas untuk penerimaan lain.".to_string())?;
            lines.push((kas, jumlah, 0));
            lines.push((akun_penerimaan, 0, jumlah));
        }
        "PENGELUARAN_LAINNYA" => {
            let akun_pengeluaran = cfg
                .akun_pengeluaran_lainnya
                .ok_or_else(|| "Konfigurasi akun pengeluaran lainnya belum diatur.".to_string())?;
            let kas = kas_kode.ok_or_else(|| "Pilih akun kas untuk pengeluaran lain.".to_string())?;
            lines.push((akun_pengeluaran, jumlah, 0));
            lines.push((kas, 0, jumlah));
        }
        "TRANSFER" => {
            let sumber = kas_sumber_kode
                .ok_or_else(|| "Pilih akun kas sumber untuk transfer.".to_string())?;
            let target = kas_target_kode
                .ok_or_else(|| "Pilih akun kas target untuk transfer.".to_string())?;
            if sumber == target {
                return Err("Akun kas sumber dan target tidak boleh sama.".into());
            }
            lines.push((target, jumlah, 0));
            lines.push((sumber, 0, jumlah));
        }
        _ => return Err(format!("Jenis transaksi tidak dikenal: {jenis}")),
    }

    let total_debit: i64 = lines.iter().map(|(_, d, _)| *d).sum();
    let total_kredit: i64 = lines.iter().map(|(_, _, k)| *k).sum();
    if total_debit != total_kredit {
        return Err("Jurnal tidak balance (debit != kredit).".into());
    }

    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)",
        params![tanggal, jenis, referensi, catatan, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let jurnal_id = tx.last_insert_rowid();

    for (akun_kode, debit, kredit) in &lines {
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, ?, ?, '')",
            params![jurnal_id, akun_kode, debit, kredit],
        )
        .map_err(|e| e.to_string())?;
        akun_kas_apply_saldo_delta(&tx, akun_kode, *debit, *kredit, ts)?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(format!("Jurnal tersimpan (ID: {}).", jurnal_id))
}
