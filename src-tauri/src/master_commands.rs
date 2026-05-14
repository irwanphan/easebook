//! Perintah Tauri untuk master data (SQLite).

use crate::db;
use crate::DbState;
use chrono::Utc;
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
