//! Perintah Tauri untuk master data (SQLite).

use crate::db;
use crate::DbState;
use chrono::{NaiveDate, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;

fn now_ts() -> i64 {
    Utc::now().timestamp()
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

#[tauri::command]
pub fn pembelian_insert(state: State<DbState>, payload: PembelianInsertPayload) -> Result<String, String> {
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
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(nomor)
}
