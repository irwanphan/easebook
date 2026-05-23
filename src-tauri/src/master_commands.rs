//! Perintah Tauri untuk master data (SQLite).

use crate::db;
use crate::DbState;
use chrono::{Datelike, Local, NaiveDate, TimeZone, Utc};
use rusqlite::{params, Connection, Transaction};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri::State;

const PENGGUNA_FOTO_MAX_BYTES: usize = 512_000;
const BARANG_FOTO_MAX_BYTES: usize = 512_000;

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

#[tauri::command]
pub fn kategori_delete(state: State<DbState>, kode: String) -> Result<(), String> {
    let kode = kode.trim().to_string();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    with_conn_app(&state, |conn| {
        let dipakai: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM barang_jasa WHERE kategori_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if dipakai > 0 {
            return Err(format!(
                "Kategori tidak dapat dihapus karena masih dipakai oleh {dipakai} barang/jasa. Ubah dulu kategori pada item terkait sebelum menghapus."
            ));
        }
        let n = conn
            .execute(
                "DELETE FROM kategori WHERE kode = ? COLLATE NOCASE",
                params![kode],
            )
            .map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("Kategori tidak ditemukan.".into());
        }
        Ok(())
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

#[tauri::command]
pub fn merek_delete(state: State<DbState>, kode: String) -> Result<(), String> {
    let kode = kode.trim().to_string();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    with_conn_app(&state, |conn| {
        let dipakai: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM barang_jasa WHERE merek_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if dipakai > 0 {
            return Err(format!(
                "Merek tidak dapat dihapus karena masih dipakai oleh {dipakai} barang/jasa. Ubah dulu merek pada item terkait sebelum menghapus."
            ));
        }
        let n = conn
            .execute(
                "DELETE FROM merek WHERE kode = ? COLLATE NOCASE",
                params![kode],
            )
            .map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("Merek tidak ditemukan.".into());
        }
        Ok(())
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

#[tauri::command]
pub fn gudang_delete(state: State<DbState>, kode: String) -> Result<(), String> {
    let kode = kode.trim().to_string();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    with_conn_app(&state, |conn| {
        // Hitung stok per barang di gudang ini (positif = ada fisik).
        // Pakai stok_mutasi sebagai single source of truth untuk pergerakan
        // stok (semua transaksi: pembelian/penjualan/mutasi antar gudang
        // menulis ke sini).
        let barang_dengan_stok: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM (
                    SELECT barang_kode
                    FROM stok_mutasi
                    WHERE gudang_kode = ? COLLATE NOCASE
                    GROUP BY barang_kode
                    HAVING COALESCE(SUM(qty_masuk - qty_keluar), 0) > 0
                )",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if barang_dengan_stok > 0 {
            return Err(format!(
                "Gudang tidak dapat dihapus karena masih ada {barang_dengan_stok} barang di dalamnya. Kosongkan dulu stok lewat mutasi antar gudang sebelum menghapus."
            ));
        }

        // Cek default_gudang_kode pada barang_jasa — meskipun FK-nya SET NULL,
        // user-experience-wise lebih baik kasih tahu agar mereka cabut dulu.
        let default_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM barang_jasa WHERE default_gudang_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if default_count > 0 {
            return Err(format!(
                "Gudang ini dipakai sebagai gudang default oleh {default_count} barang/jasa. Ubah dulu gudang default pada item terkait sebelum menghapus."
            ));
        }

        // Cek histori transaksi (pembelian/penjualan/mutasi) — meskipun stok
        // 0, kalau pernah dipakai akan menyebabkan FK constraint error.
        let mutasi_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM stok_mutasi WHERE gudang_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        let pembelian_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pembelian WHERE gudang_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        let penjualan_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM penjualan WHERE gudang_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if mutasi_count > 0 || pembelian_count > 0 || penjualan_count > 0 {
            return Err(format!(
                "Gudang ini memiliki histori transaksi ({pembelian_count} pembelian, {penjualan_count} penjualan, {mutasi_count} mutasi stok). Histori tidak boleh dihapus, sehingga gudang juga tidak dapat dihapus."
            ));
        }

        let n = conn
            .execute(
                "DELETE FROM gudang WHERE kode = ? COLLATE NOCASE",
                params![kode],
            )
            .map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("Gudang tidak ditemukan.".into());
        }
        Ok(())
    })
}

// --- Barang & jasa ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BarangSatuanTingkatRow {
    pub tingkat: u8,
    pub nama: String,
    pub qty_isi: Option<i64>,
    pub harga_jual: i64,
    pub harga_beli: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kode_barcode: Option<String>,
}

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub satuan_tingkat: Option<Vec<BarangSatuanTingkatRow>>,
}

fn barang_jasa_load_satuan_map(
    conn: &Connection,
) -> rusqlite::Result<HashMap<String, Vec<BarangSatuanTingkatRow>>> {
    let mut stmt = conn.prepare(
        "SELECT barang_kode, tingkat, nama, qty_isi, harga_jual, harga_beli, kode_barcode
         FROM barang_jasa_satuan
         ORDER BY barang_kode COLLATE NOCASE, tingkat ASC",
    )?;
    let mut map: HashMap<String, Vec<BarangSatuanTingkatRow>> = HashMap::new();
    let rows = stmt.query_map([], |r| {
        let barcode: String = r.get(6)?;
        Ok((
            r.get::<_, String>(0)?,
            BarangSatuanTingkatRow {
                tingkat: r.get::<_, i32>(1)? as u8,
                nama: r.get(2)?,
                qty_isi: r.get(3)?,
                harga_jual: r.get(4)?,
                harga_beli: r.get(5)?,
                kode_barcode: if barcode.trim().is_empty() {
                    None
                } else {
                    Some(barcode.trim().to_string())
                },
            },
        ))
    })?;
    for row in rows {
        let (kode, tier) = row?;
        map.entry(kode).or_default().push(tier);
    }
    Ok(map)
}

#[tauri::command]
pub fn barang_jasa_list(state: State<DbState>) -> Result<Vec<BarangJasaRow>, String> {
    with_conn(&state, |conn| {
        let satuan_map = barang_jasa_load_satuan_map(conn)?;
        let mut stmt = conn.prepare(
            "SELECT kode, nama, tipe, satuan, harga, stok, kategori_kode, merek_kode, default_gudang_kode
             FROM barang_jasa ORDER BY kode COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], |r| {
            let kode: String = r.get(0)?;
            let tiers = satuan_map.get(&kode).cloned();
            Ok(BarangJasaRow {
                kode: kode.clone(),
                nama: r.get(1)?,
                tipe: r.get(2)?,
                satuan: r.get(3)?,
                harga: r.get(4)?,
                stok: r.get(5)?,
                kategori_kode: r.get(6)?,
                merek_kode: r.get(7)?,
                default_gudang_kode: r.get(8)?,
                satuan_tingkat: tiers.filter(|t| !t.is_empty()),
            })
        })?;
        rows.collect()
    })
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BarangSatuanTingkatInput {
    pub tingkat: u8,
    pub nama: String,
    pub qty_isi: Option<i64>,
    pub harga_jual: i64,
    pub harga_beli: i64,
    #[serde(default)]
    pub kode_barcode: Option<String>,
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
    pub satuan_tingkat: Vec<BarangSatuanTingkatInput>,
}

fn barang_jasa_satuan_terkecil<'a>(
    tiers: &'a [BarangSatuanTingkatInput],
) -> Result<&'a BarangSatuanTingkatInput, String> {
    tiers
        .iter()
        .max_by_key(|t| t.tingkat)
        .ok_or_else(|| "Satuan utama tidak ditemukan.".to_string())
}

#[derive(Debug, Clone)]
struct BarangSatuanTierQty {
    tingkat: u8,
    qty_isi: Option<i64>,
}

fn barang_load_satuan_tiers(conn: &Connection, kode_b: &str) -> Result<Vec<BarangSatuanTierQty>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT tingkat, qty_isi FROM barang_jasa_satuan
             WHERE lower(barang_kode) = lower(?)
             ORDER BY tingkat ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![kode_b], |r| {
            Ok(BarangSatuanTierQty {
                tingkat: r.get(0)?,
                qty_isi: r.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut tiers: Vec<BarangSatuanTierQty> = Vec::new();
    for row in rows {
        tiers.push(row.map_err(|e| e.to_string())?);
    }
    if tiers.is_empty() {
        let _: String = conn
            .query_row(
                "SELECT satuan FROM barang_jasa WHERE lower(kode) = lower(?)",
                params![kode_b],
                |r| r.get(0),
            )
            .map_err(|_| format!("Barang '{kode_b}' tidak ditemukan."))?;
        tiers.push(BarangSatuanTierQty {
            tingkat: 1,
            qty_isi: None,
        });
    }
    Ok(tiers)
}

fn barang_qty_to_smallest(
    tiers: &[BarangSatuanTierQty],
    from_tingkat: u8,
    qty: i64,
) -> Result<i64, String> {
    if qty <= 0 {
        return Err("Jumlah harus lebih dari 0.".into());
    }
    if tiers.is_empty() {
        return Err("Satuan barang tidak ditemukan.".into());
    }
    let max_tingkat = tiers
        .iter()
        .map(|t| t.tingkat)
        .max()
        .ok_or_else(|| "Satuan barang tidak valid.".to_string())?;
    if from_tingkat < 1 || from_tingkat > max_tingkat {
        return Err(format!(
            "Tingkat satuan {from_tingkat} tidak tersedia untuk barang ini (1–{max_tingkat})."
        ));
    }
    if !tiers.iter().any(|t| t.tingkat == from_tingkat) {
        return Err(format!("Satuan tingkat {from_tingkat} tidak terdaftar untuk barang ini."));
    }
    let mut result = qty;
    for t in tiers {
        if t.tingkat >= from_tingkat && t.tingkat < max_tingkat {
            let mul = t.qty_isi.ok_or_else(|| {
                format!(
                    "Isi konversi tingkat {} belum diatur; tidak bisa menghitung stok.",
                    t.tingkat
                )
            })?;
            if mul <= 0 {
                return Err(format!("Isi konversi tingkat {} tidak valid.", t.tingkat));
            }
            result = result
                .checked_mul(mul)
                .ok_or_else(|| "Jumlah stok melimpahi batas.".to_string())?;
        }
    }
    Ok(result)
}

fn barang_line_qty_to_smallest_conn(
    conn: &Connection,
    kode_b: &str,
    qty: i64,
    satuan_tingkat: u8,
) -> Result<i64, String> {
    let tiers = barang_load_satuan_tiers(conn, kode_b)?;
    barang_qty_to_smallest(&tiers, satuan_tingkat, qty)
}

fn barang_satuan_nama(conn: &Connection, kode_b: &str, tingkat: u8) -> Result<String, String> {
    if let Ok(nama) = conn.query_row(
        "SELECT nama FROM barang_jasa_satuan WHERE lower(barang_kode) = lower(?) AND tingkat = ?",
        params![kode_b, tingkat],
        |r| r.get::<_, String>(0),
    ) {
        let n = nama.trim().to_string();
        if !n.is_empty() {
            return Ok(n);
        }
    }
    conn.query_row(
        "SELECT satuan FROM barang_jasa WHERE lower(kode) = lower(?)",
        params![kode_b],
        |r| r.get(0),
    )
    .map_err(|_| format!("Satuan barang '{kode_b}' tidak ditemukan."))
}

fn barang_jasa_has_transaksi(conn: &rusqlite::Connection, kode: &str) -> Result<bool, String> {
    let count: i64 = conn
        .query_row(
            "SELECT
               (SELECT COUNT(*) FROM pembelian_line WHERE lower(barang_kode) = lower(?))
             + (SELECT COUNT(*) FROM penjualan_line WHERE lower(barang_kode) = lower(?))
             + (SELECT COUNT(*) FROM stok_mutasi WHERE lower(barang_kode) = lower(?))",
            rusqlite::params![kode, kode, kode],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}

fn barang_jasa_validate_satuan_tingkat(
    tipe: &str,
    tiers: &[BarangSatuanTingkatInput],
) -> Result<Vec<BarangSatuanTingkatInput>, String> {
    if tipe == "Barang" {
        if tiers.is_empty() {
            return Err("Minimal satu tingkat satuan (tingkat 1) wajib diisi.".into());
        }
        let mut sorted = tiers.to_vec();
        sorted.sort_by_key(|t| t.tingkat);
        let max_tingkat = sorted
            .last()
            .map(|t| t.tingkat)
            .ok_or_else(|| "Satuan tidak valid.".to_string())?;
        if max_tingkat > 3 {
            return Err("Maksimal 3 tingkat satuan.".into());
        }
        for (i, t) in sorted.iter().enumerate() {
            let expected = (i + 1) as u8;
            if t.tingkat != expected {
                return Err(
                    "Tingkat satuan harus berurutan (1, 2, …) tanpa melompati tingkat.".into(),
                );
            }
            if t.nama.trim().is_empty() {
                return Err(format!("Nama satuan tingkat {} wajib diisi.", t.tingkat));
            }
            if t.harga_jual < 0 || t.harga_beli < 0 {
                return Err("Harga jual/beli tidak valid.".into());
            }
            if t.tingkat < max_tingkat {
                let q = t.qty_isi.ok_or_else(|| {
                    format!(
                        "Isi konversi tingkat {} wajib diisi (bilangan bulat > 0).",
                        t.tingkat
                    )
                })?;
                if q <= 0 {
                    return Err(format!(
                        "Isi satuan tingkat {} harus lebih dari 0.",
                        t.tingkat
                    ));
                }
            } else if t.qty_isi.is_some() {
                return Err("Satuan terkecil tidak memiliki isi konversi.".into());
            }
        }
        return Ok(sorted);
    }

    if tiers.len() != 1 || tiers[0].tingkat != 1 {
        return Err("Jasa cukup satu satuan (tingkat 1).".into());
    }
    let t = &tiers[0];
    if t.nama.trim().is_empty() {
        return Err("Nama satuan wajib diisi.".into());
    }
    if t.harga_jual < 0 || t.harga_beli < 0 {
        return Err("Harga jual/beli tidak valid.".into());
    }
    if t.qty_isi.is_some() {
        return Err("Jasa tidak memiliki konversi satuan.".into());
    }
    Ok(tiers.to_vec())
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
    if row
        .kategori_kode
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .is_none()
    {
        return Err("Kategori / grup wajib dipilih.".into());
    }
    let tipe = row.tipe.trim();
    if tipe != "Barang" && tipe != "Jasa" {
        return Err("Tipe harus Barang atau Jasa.".into());
    }
    let tiers = barang_jasa_validate_satuan_tingkat(tipe, &row.satuan_tingkat)?;
    let satuan_terkecil = barang_jasa_satuan_terkecil(&tiers)?;
    let satuan = satuan_terkecil.nama.trim().to_string();
    let harga = satuan_terkecil.harga_jual;

    if tipe == "Barang" && row.stok.is_none() {
        return Err("Stok wajib untuk tipe Barang (dalam satuan terkecil).".into());
    }
    if tipe == "Jasa" && row.stok.is_some() {
        return Err("Stok harus kosong untuk tipe Jasa.".into());
    }

    let ts = now_ts();
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let insert_main = tx.execute(
        "INSERT INTO barang_jasa (kode, nama, tipe, satuan, harga, stok, kategori_kode, merek_kode, default_gudang_kode, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            kode,
            row.nama.trim(),
            tipe,
            satuan,
            harga,
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
    );

    if let Err(e) = insert_main {
        return Err(map_barang_jasa_insert_error(&e.to_string()));
    }

    for t in &tiers {
        if let Err(e) = tx.execute(
            "INSERT INTO barang_jasa_satuan (barang_kode, tingkat, nama, qty_isi, harga_jual, harga_beli, kode_barcode)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                kode,
                t.tingkat,
                t.nama.trim(),
                t.qty_isi,
                t.harga_jual,
                t.harga_beli,
                t.kode_barcode
                    .as_ref()
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
                    .unwrap_or("")
            ],
        ) {
            return Err(e.to_string());
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

fn map_barang_jasa_insert_error(e: &str) -> String {
    if e.contains("UNIQUE") {
        "Kode sudah dipakai.".into()
    } else if e.contains("FOREIGN KEY") {
        "Kategori, merek, atau gudang rujukan tidak ditemukan.".into()
    } else {
        e.to_string()
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BarangJasaUpdate {
    pub nama: String,
    pub stok: Option<i64>,
    pub kategori_kode: Option<String>,
    pub merek_kode: Option<String>,
    pub default_gudang_kode: Option<String>,
    pub satuan_tingkat: Option<Vec<BarangSatuanTingkatInput>>,
}

#[tauri::command]
pub fn barang_jasa_punya_transaksi(state: State<DbState>, kode: String) -> Result<bool, String> {
    let key = kode.trim();
    if key.is_empty() {
        return Err("Kode tidak valid.".into());
    }
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    barang_jasa_has_transaksi(&conn, key)
}

#[tauri::command]
pub fn barang_jasa_update(
    state: State<DbState>,
    kode: String,
    row: BarangJasaUpdate,
) -> Result<(), String> {
    let key = kode.trim().to_uppercase();
    if key.is_empty() {
        return Err("Kode tidak valid.".into());
    }
    if row.nama.trim().is_empty() {
        return Err("Nama wajib diisi.".into());
    }
    if row
        .kategori_kode
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .is_none()
    {
        return Err("Kategori / grup wajib dipilih.".into());
    }

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tipe: String = conn
        .query_row(
            "SELECT tipe FROM barang_jasa WHERE lower(kode) = lower(?)",
            params![&key],
            |r| r.get(0),
        )
        .map_err(|_| format!("Barang/jasa '{key}' tidak ditemukan."))?;

    if tipe == "Barang" && row.stok.is_none() {
        return Err("Stok wajib untuk barang (satuan terkecil).".into());
    }
    if tipe == "Jasa" && row.stok.is_some() {
        return Err("Stok harus kosong untuk jasa.".into());
    }

    let punya_trx = barang_jasa_has_transaksi(&conn, &key)?;
    if punya_trx && row.satuan_tingkat.is_some() {
        return Err(
            "Satuan tidak dapat diubah karena barang/jasa ini sudah memiliki transaksi.".into(),
        );
    }

    let ts = now_ts();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (satuan, harga) = if let Some(ref new_tiers) = row.satuan_tingkat {
        let tiers = barang_jasa_validate_satuan_tingkat(&tipe, new_tiers)?;
        let utama = barang_jasa_satuan_terkecil(&tiers)?;
        (utama.nama.trim().to_string(), utama.harga_jual)
    } else {
        let (s, h): (String, i64) = tx
            .query_row(
                "SELECT satuan, harga FROM barang_jasa WHERE lower(kode) = lower(?)",
                params![&key],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .map_err(|_| format!("Barang/jasa '{key}' tidak ditemukan."))?;
        (s, h)
    };

    let updated = tx
        .execute(
            "UPDATE barang_jasa SET nama = ?, satuan = ?, harga = ?, stok = ?, kategori_kode = ?, merek_kode = ?, default_gudang_kode = ?, updated_at = ?
             WHERE lower(kode) = lower(?)",
            params![
                row.nama.trim(),
                satuan,
                harga,
                row.stok,
                row.kategori_kode
                    .as_ref()
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty()),
                row.merek_kode
                    .as_ref()
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty()),
                row.default_gudang_kode
                    .as_ref()
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty()),
                ts,
                key
            ],
        )
        .map_err(|e| e.to_string())?;

    if updated == 0 {
        return Err(format!("Barang/jasa '{key}' tidak ditemukan."));
    }

    if let Some(ref new_tiers) = row.satuan_tingkat {
        let tiers = barang_jasa_validate_satuan_tingkat(&tipe, new_tiers)?;
        tx.execute(
            "DELETE FROM barang_jasa_satuan WHERE lower(barang_kode) = lower(?)",
            params![&key],
        )
        .map_err(|e| e.to_string())?;

        for t in &tiers {
            tx.execute(
                "INSERT INTO barang_jasa_satuan (barang_kode, tingkat, nama, qty_isi, harga_jual, harga_beli, kode_barcode)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                params![
                    &key,
                    t.tingkat,
                    t.nama.trim(),
                    t.qty_isi,
                    t.harga_jual,
                    t.harga_beli,
                    t.kode_barcode
                        .as_ref()
                        .map(|s| s.trim())
                        .filter(|s| !s.is_empty())
                        .unwrap_or("")
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string()).map_err(|e| {
        if e.contains("FOREIGN KEY") {
            "Kategori, merek, atau gudang rujukan tidak ditemukan.".into()
        } else {
            e
        }
    })
}

fn barang_images_dir(db_path: &Path) -> PathBuf {
    db_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("barang-images")
}

fn barang_foto_file(db_path: &Path, kode: &str) -> PathBuf {
    barang_images_dir(db_path).join(format!("{}.webp", kode.trim().to_uppercase()))
}

fn barang_foto_path_option(db_path: &Path, kode: &str) -> Option<String> {
    let path = barang_foto_file(db_path, kode);
    if path.is_file() {
        Some(path.to_string_lossy().into_owned())
    } else {
        None
    }
}

fn barang_foto_remove_file(db_path: &Path, kode: &str) -> Result<(), String> {
    let path = barang_foto_file(db_path, kode);
    if path.is_file() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn normalize_barang_kode(kode: &str) -> Result<String, String> {
    let key = kode.trim().to_uppercase();
    if key.is_empty() {
        return Err("Kode barang tidak valid.".into());
    }
    Ok(key)
}

#[tauri::command]
pub fn barang_foto_path(state: State<DbState>, kode: String) -> Result<Option<String>, String> {
    let key = normalize_barang_kode(&kode)?;
    Ok(barang_foto_path_option(&state.path, &key))
}

#[tauri::command]
pub fn barang_foto_save(state: State<DbState>, kode: String, data: Vec<u8>) -> Result<(), String> {
    let key = normalize_barang_kode(&kode)?;
    if data.is_empty() {
        return Err("Data foto kosong.".into());
    }
    if data.len() > BARANG_FOTO_MAX_BYTES {
        return Err("Ukuran foto terlalu besar (maks. 512 KB).".into());
    }
    with_conn_app(&state, |conn| {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM barang_jasa WHERE lower(kode) = lower(?)",
                params![key],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if exists == 0 {
            return Err("Barang/jasa tidak ditemukan.".into());
        }
        Ok(())
    })?;
    let dir = barang_images_dir(&state.path);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = barang_foto_file(&state.path, &key);
    std::fs::write(&path, &data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn barang_foto_remove(state: State<DbState>, kode: String) -> Result<(), String> {
    let key = normalize_barang_kode(&kode)?;
    barang_foto_remove_file(&state.path, &key)
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
    let kode = kode.trim().to_string();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    with_conn_app(&state, |conn| {
        // Cek faktur penjualan (FK RESTRICT — kalau ada, FK akan gagal juga).
        let penjualan_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM penjualan WHERE pelanggan_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        // Cek pelunasan piutang (tanpa FK — harus dicek manual).
        let pelunasan_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pelunasan_piutang WHERE pelanggan_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if penjualan_count > 0 || pelunasan_count > 0 {
            return Err(format!(
                "Pelanggan tidak dapat dihapus karena sudah memiliki transaksi ({penjualan_count} faktur penjualan, {pelunasan_count} pelunasan piutang). Histori transaksi tidak boleh dihapus."
            ));
        }
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
    let kode = kode.trim().to_string();
    if kode.is_empty() {
        return Err("Kode wajib diisi.".into());
    }
    with_conn_app(&state, |conn| {
        // Cek faktur pembelian (FK RESTRICT — kalau ada, FK akan gagal juga).
        let pembelian_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pembelian WHERE pemasok_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        // Cek pelunasan hutang (tanpa FK — harus dicek manual).
        let pelunasan_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pelunasan_hutang WHERE pemasok_kode = ? COLLATE NOCASE",
                params![kode],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if pembelian_count > 0 || pelunasan_count > 0 {
            return Err(format!(
                "Pemasok tidak dapat dihapus karena sudah memiliki transaksi ({pembelian_count} faktur pembelian, {pelunasan_count} pelunasan hutang). Histori transaksi tidak boleh dihapus."
            ));
        }
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

// --- Pengguna aplikasi ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PenggunaRow {
    pub username: String,
    pub nama_lengkap: String,
    pub email: String,
    pub departemen: String,
    pub nomor_hp: String,
    pub aktif: bool,
    pub is_admin: bool,
    pub catatan: String,
}

fn normalize_username(raw: &str) -> Result<String, String> {
    let u = raw.trim().to_lowercase();
    if u.is_empty() {
        return Err("Username wajib diisi.".into());
    }
    if u.len() < 3 {
        return Err("Username minimal 3 karakter.".into());
    }
    if !u
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.' || c == '-')
    {
        return Err(
            "Username hanya boleh huruf, angka, titik, strip, dan garis bawah.".into(),
        );
    }
    Ok(u)
}

fn validate_password(password: &str, required: bool) -> Result<(), String> {
    if password.is_empty() {
        if required {
            return Err("Password wajib diisi.".into());
        }
        return Ok(());
    }
    if password.len() < 6 {
        return Err("Password minimal 6 karakter.".into());
    }
    Ok(())
}

fn hash_password(password: &str) -> Result<String, String> {
    bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())
}

fn map_pengguna_row(r: &rusqlite::Row) -> rusqlite::Result<PenggunaRow> {
    Ok(PenggunaRow {
        username: r.get(0)?,
        nama_lengkap: r.get(1)?,
        email: r.get(2)?,
        departemen: r.get(3)?,
        nomor_hp: r.get(4)?,
        aktif: r.get::<_, i64>(5)? != 0,
        is_admin: r.get::<_, i64>(6)? != 0,
        catatan: r.get(7)?,
    })
}

#[tauri::command]
pub fn pengguna_list(state: State<DbState>) -> Result<Vec<PenggunaRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT username, nama_lengkap, email, departemen, nomor_hp, aktif, is_admin, catatan
             FROM pengguna
             ORDER BY username COLLATE NOCASE",
        )?;
        let rows = stmt.query_map([], map_pengguna_row)?;
        rows.collect()
    })
}

fn pengguna_save_halaman_akses(
    conn: &Connection,
    username: &str,
    keys: &[String],
    is_admin: bool,
) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM pengguna_halaman_akses WHERE lower(username) = lower(?)",
        params![username],
    )?;
    if is_admin {
        return Ok(());
    }
    for key in keys {
        let k = key.trim();
        if k.is_empty() {
            continue;
        }
        conn.execute(
            "INSERT OR IGNORE INTO pengguna_halaman_akses (username, halaman_key) VALUES (?, ?)",
            params![username, k],
        )?;
    }
    Ok(())
}

fn pengguna_load_halaman_akses(conn: &Connection, username: &str) -> rusqlite::Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT halaman_key FROM pengguna_halaman_akses
         WHERE lower(username) = lower(?)
         ORDER BY halaman_key COLLATE NOCASE",
    )?;
    let rows = stmt.query_map(params![username], |r| r.get(0))?;
    rows.collect()
}

fn validate_halaman_akses_for_user(is_admin: bool, keys: &[String]) -> Result<(), String> {
    if is_admin {
        return Ok(());
    }
    let has_any = keys.iter().any(|k| !k.trim().is_empty());
    if !has_any {
        return Err("Pilih minimal satu halaman yang boleh diakses.".into());
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PenggunaInsert {
    pub username: String,
    pub nama_lengkap: String,
    pub email: String,
    pub password: String,
    pub departemen: String,
    pub nomor_hp: String,
    pub aktif: bool,
    pub is_admin: bool,
    pub catatan: String,
    pub halaman_akses: Vec<String>,
}

#[tauri::command]
pub fn pengguna_insert(state: State<DbState>, row: PenggunaInsert) -> Result<(), String> {
    let username = normalize_username(&row.username)?;
    if row.nama_lengkap.trim().is_empty() {
        return Err("Nama lengkap wajib diisi.".into());
    }
    validate_password(&row.password, true)?;
    validate_halaman_akses_for_user(row.is_admin, &row.halaman_akses)?;
    let password_hash = hash_password(&row.password)?;
    let ts = now_ts();
    with_conn(&state, |conn| {
        let tx = conn.unchecked_transaction()?;
        tx.execute(
            "INSERT INTO pengguna (username, nama_lengkap, email, password_hash, departemen, nomor_hp, aktif, is_admin, catatan, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                username,
                row.nama_lengkap.trim(),
                row.email.trim(),
                password_hash,
                row.departemen.trim(),
                row.nomor_hp.trim(),
                if row.aktif { 1 } else { 0 },
                if row.is_admin { 1 } else { 0 },
                row.catatan.trim(),
                ts,
                ts
            ],
        )?;
        pengguna_save_halaman_akses(&tx, &username, &row.halaman_akses, row.is_admin)?;
        tx.commit()?;
        Ok(())
    })
    .map_err(|e| {
        if e.contains("UNIQUE") {
            "Username sudah dipakai.".into()
        } else {
            e
        }
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PenggunaUpdate {
    pub nama_lengkap: String,
    pub email: String,
    /// Kosong = tidak mengubah password.
    pub password: String,
    pub departemen: String,
    pub nomor_hp: String,
    pub aktif: bool,
    pub is_admin: bool,
    pub catatan: String,
    pub halaman_akses: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PenggunaSession {
    pub username: String,
    pub nama_lengkap: String,
    pub is_admin: bool,
    pub halaman_akses: Vec<String>,
    /// Path absolut file foto (.webp) bila ada.
    pub foto_profil_path: Option<String>,
}

fn pengguna_avatars_dir(db_path: &Path) -> PathBuf {
    db_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("avatars")
}

fn pengguna_foto_file(db_path: &Path, username: &str) -> PathBuf {
    pengguna_avatars_dir(db_path).join(format!("{}.webp", username.trim().to_lowercase()))
}

fn pengguna_foto_path_option(db_path: &Path, username: &str) -> Option<String> {
    let path = pengguna_foto_file(db_path, username);
    if path.is_file() {
        Some(path.to_string_lossy().into_owned())
    } else {
        None
    }
}

fn pengguna_foto_remove_file(db_path: &Path, username: &str) -> Result<(), String> {
    let path = pengguna_foto_file(db_path, username);
    if path.is_file() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn pengguna_foto_path(state: State<DbState>, username: String) -> Result<Option<String>, String> {
    let key = username.trim();
    if key.is_empty() {
        return Ok(None);
    }
    Ok(pengguna_foto_path_option(&state.path, key))
}

#[tauri::command]
pub fn pengguna_foto_save(
    state: State<DbState>,
    username: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let key = normalize_username(&username)?;
    if data.is_empty() {
        return Err("Data foto kosong.".into());
    }
    if data.len() > PENGGUNA_FOTO_MAX_BYTES {
        return Err("Ukuran foto terlalu besar (maks. 512 KB).".into());
    }
    with_conn_app(&state, |conn| {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pengguna WHERE lower(username) = lower(?)",
                params![key],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if exists == 0 {
            return Err("Pengguna tidak ditemukan.".into());
        }
        Ok(())
    })?;
    let dir = pengguna_avatars_dir(&state.path);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = pengguna_foto_file(&state.path, &key);
    std::fs::write(&path, &data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pengguna_foto_remove(state: State<DbState>, username: String) -> Result<(), String> {
    let key = normalize_username(&username)?;
    pengguna_foto_remove_file(&state.path, &key)
}

fn pengguna_build_session(
    conn: &Connection,
    db_path: &Path,
    username: &str,
) -> Result<PenggunaSession, String> {
    let row: (String, String, i64, i64) = conn
        .query_row(
            "SELECT username, nama_lengkap, is_admin, aktif FROM pengguna WHERE lower(username) = lower(?)",
            params![username],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .map_err(|_| "Pengguna tidak ditemukan.".to_string())?;
    if row.3 == 0 {
        return Err("Akun pengguna tidak aktif.".into());
    }
    let is_admin = row.2 != 0;
    let halaman_akses = if is_admin {
        Vec::new()
    } else {
        pengguna_load_halaman_akses(conn, &row.0).map_err(|e| e.to_string())?
    };
    Ok(PenggunaSession {
        username: row.0.clone(),
        nama_lengkap: row.1,
        is_admin,
        halaman_akses,
        foto_profil_path: pengguna_foto_path_option(db_path, &row.0),
    })
}

#[tauri::command]
pub fn pengguna_login(
    state: State<DbState>,
    username: String,
    password: String,
) -> Result<PenggunaSession, String> {
    let key = username.trim();
    if key.is_empty() {
        return Err("Username wajib diisi.".into());
    }
    if password.is_empty() {
        return Err("Password wajib diisi.".into());
    }

    with_conn_app(&state, |conn| {
        let row: (String, String, i64, i64, String) = conn
            .query_row(
                "SELECT username, nama_lengkap, is_admin, aktif, password_hash FROM pengguna WHERE lower(username) = lower(?)",
                params![key],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .map_err(|_| "Username atau password salah.".to_string())?;

        if row.3 == 0 {
            return Err("Akun pengguna tidak aktif. Hubungi administrator.".into());
        }

        let ok = bcrypt::verify(password.as_str(), &row.4)
            .map_err(|e| e.to_string())?;
        if !ok {
            return Err("Username atau password salah.".into());
        }

        pengguna_build_session(conn, &state.path, &row.0)
    })
}

#[tauri::command]
pub fn pengguna_halaman_akses_get(state: State<DbState>, username: String) -> Result<Vec<String>, String> {
    let key = username.trim();
    if key.is_empty() {
        return Err("Username wajib diisi.".into());
    }
    with_conn(&state, |conn| {
        let exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM pengguna WHERE lower(username) = lower(?)",
            params![key],
            |r| r.get(0),
        )?;
        if exists == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        pengguna_load_halaman_akses(conn, key)
    })
    .map_err(|e| {
        if e.contains("QueryReturnedNoRows") {
            "Pengguna tidak ditemukan.".into()
        } else {
            e
        }
    })
}

#[tauri::command]
pub fn pengguna_session_get(state: State<DbState>, username: String) -> Result<PenggunaSession, String> {
    let key = username.trim();
    if key.is_empty() {
        return Err("Username wajib diisi.".into());
    }
    with_conn_app(&state, |conn| pengguna_build_session(conn, &state.path, key))
}

#[tauri::command]
pub fn pengguna_update(
    state: State<DbState>,
    username: String,
    row: PenggunaUpdate,
) -> Result<(), String> {
    let key = normalize_username(&username)?;
    if row.nama_lengkap.trim().is_empty() {
        return Err("Nama lengkap wajib diisi.".into());
    }
    validate_password(&row.password, false)?;
    validate_halaman_akses_for_user(row.is_admin, &row.halaman_akses)?;
    let ts = now_ts();

    with_conn_app(&state, |conn| {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pengguna WHERE lower(username) = lower(?)",
                params![key],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if exists == 0 {
            return Err("Pengguna tidak ditemukan.".into());
        }

        if !row.aktif {
            let admin_aktif: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM pengguna WHERE is_admin = 1 AND aktif = 1 AND lower(username) != lower(?)",
                    params![key],
                    |r| r.get(0),
                )
                .map_err(|e| e.to_string())?;
            if admin_aktif == 0 {
                return Err(
                    "Tidak dapat menonaktifkan pengguna terakhir yang aktif dan berperan admin."
                        .into(),
                );
            }
        }

        if row.password.trim().is_empty() {
            let n = conn
                .execute(
                    "UPDATE pengguna SET nama_lengkap = ?, email = ?, departemen = ?, nomor_hp = ?,
                        aktif = ?, is_admin = ?, catatan = ?, updated_at = ?
                 WHERE lower(username) = lower(?)",
                    params![
                        row.nama_lengkap.trim(),
                        row.email.trim(),
                        row.departemen.trim(),
                        row.nomor_hp.trim(),
                        if row.aktif { 1 } else { 0 },
                        if row.is_admin { 1 } else { 0 },
                        row.catatan.trim(),
                        ts,
                        key
                    ],
                )
                .map_err(|e| e.to_string())?;
            if n == 0 {
                return Err("Pengguna tidak ditemukan.".into());
            }
        } else {
            let password_hash = hash_password(row.password.trim())?;
            let n = conn
                .execute(
                    "UPDATE pengguna SET nama_lengkap = ?, email = ?, password_hash = ?, departemen = ?, nomor_hp = ?,
                        aktif = ?, is_admin = ?, catatan = ?, updated_at = ?
                 WHERE lower(username) = lower(?)",
                    params![
                        row.nama_lengkap.trim(),
                        row.email.trim(),
                        password_hash,
                        row.departemen.trim(),
                        row.nomor_hp.trim(),
                        if row.aktif { 1 } else { 0 },
                        if row.is_admin { 1 } else { 0 },
                        row.catatan.trim(),
                        ts,
                        key
                    ],
                )
                .map_err(|e| e.to_string())?;
            if n == 0 {
                return Err("Pengguna tidak ditemukan.".into());
            }
        }

        pengguna_save_halaman_akses(conn, &key, &row.halaman_akses, row.is_admin)
            .map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn pengguna_delete(state: State<DbState>, username: String) -> Result<(), String> {
    let key = normalize_username(&username)?;
    with_conn_app(&state, |conn| {
        let is_admin: i64 = conn.query_row(
            "SELECT is_admin FROM pengguna WHERE lower(username) = lower(?)",
            params![key],
            |r| r.get(0),
        )
        .map_err(|_| "Pengguna tidak ditemukan.".to_string())?;

        let total: i64 = conn
            .query_row("SELECT COUNT(*) FROM pengguna", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if total <= 1 {
            return Err("Tidak dapat menghapus satu-satunya pengguna.".into());
        }

        if is_admin != 0 {
            let admin_count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM pengguna WHERE is_admin = 1 AND lower(username) != lower(?)",
                    params![key],
                    |r| r.get(0),
                )
                .map_err(|e| e.to_string())?;
            if admin_count == 0 {
                return Err("Tidak dapat menghapus admin terakhir.".into());
            }
        }

        // Block hard-delete kalau user pernah punya aktivitas tercatat
        // (transaksi, perubahan master data, dst.). `activity_log` adalah
        // single source of truth untuk jejak aktor — semua transaksi
        // melewati `activity_log_record_tx` saat dibuat / diubah / dihapus.
        // Histori audit tidak boleh "menggantung" ke username yang tidak ada,
        // jadi user dengan riwayat hanya boleh dinonaktifkan via menu Ubah
        // (toggle aktif), bukan dihapus permanen.
        let aktivitas_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM activity_log WHERE lower(aktor_username) = lower(?)",
                params![key],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if aktivitas_count > 0 {
            return Err(format!(
                "Pengguna tidak dapat dihapus karena sudah memiliki {aktivitas_count} aktivitas tercatat (transaksi / perubahan data). Untuk membatasi akses, buka menu Ubah lalu set status menjadi Nonaktif."
            ));
        }

        let n = conn
            .execute(
                "DELETE FROM pengguna WHERE lower(username) = lower(?)",
                params![key],
            )
            .map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("Pengguna tidak ditemukan.".into());
        }
        pengguna_foto_remove_file(&state.path, &key)?;
        Ok(())
    })
}

#[tauri::command]
pub fn pengguna_username_exists(state: State<DbState>, username: String) -> Result<bool, String> {
    let key = username.trim();
    if key.is_empty() {
        return Ok(false);
    }
    with_conn(&state, |conn| {
        let n: i64 = conn.query_row(
            "SELECT COUNT(*) FROM pengguna WHERE lower(username) = lower(?)",
            params![key],
            |r| r.get(0),
        )?;
        Ok(n > 0)
    })
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

fn default_satuan_tingkat_line() -> u8 {
    1
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PembelianLineInput {
    pub barang_kode: String,
    pub qty: i64,
    pub harga_satuan: i64,
    #[serde(default)]
    pub diskon: i64,
    #[serde(default = "default_satuan_tingkat_line")]
    pub satuan_tingkat: u8,
}

fn pembelian_line_subtotal(qty: i64, harga_satuan: i64, diskon: i64) -> Result<i64, String> {
    if diskon < 0 {
        return Err("Diskon tidak valid.".into());
    }
    if diskon > harga_satuan {
        return Err("Diskon per satuan tidak boleh melebihi harga satuan.".into());
    }
    let net_unit = harga_satuan - diskon;
    qty.checked_mul(net_unit)
        .ok_or_else(|| "Total baris melimpahi batas.".to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PembelianInsertPayload {
    pub pemasok_kode: String,
    pub gudang_kode: String,
    pub tanggal_faktur: String,
    pub jatuh_tempo: String,
    pub metode_pembayaran: String,
    #[serde(default)]
    pub diskon_faktur: i64,
    #[serde(default)]
    pub pajak: i64,
    #[serde(default)]
    pub akun_kas_kode: Option<String>,
    pub lines: Vec<PembelianLineInput>,
}

fn pembelian_normalize_akun_kas(raw: &Option<String>) -> Option<String> {
    raw.as_ref()
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty())
}

fn validate_akun_kas(tx: &Transaction<'_>, kode: &str) -> Result<(), String> {
    let is_kas: i64 = tx
        .query_row(
            "SELECT COALESCE(is_akun_kas, 0) FROM akun_keuangan WHERE lower(kode) = lower(?)",
            params![kode],
            |r| r.get(0),
        )
        .map_err(|_| format!("Akun kas '{kode}' tidak ditemukan."))?;
    if is_kas == 0 {
        return Err(format!("Akun '{kode}' bukan akun kas."));
    }
    Ok(())
}

/// Balikkan dampak saldo kas dari baris jurnal sebelum hapus jurnal.
fn jurnal_tx_reverse_kas_lines(tx: &Transaction<'_>, jurnal_id: i64, ts: i64) -> Result<(), String> {
    let mut stmt = tx
        .prepare("SELECT akun_kode, debit, kredit FROM jurnal_umum_line WHERE jurnal_id = ?")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![jurnal_id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?))
        })
        .map_err(|e| e.to_string())?;
    for row in rows {
        let (akun, debit, kredit) = row.map_err(|e| e.to_string())?;
        akun_kas_apply_saldo_delta(&tx, &akun, kredit, debit, ts)?;
    }
    Ok(())
}

fn jurnal_tx_delete_pembelian_by_referensi(tx: &Transaction<'_>, referensi: &str, ts: i64) -> Result<(), String> {
    let mut ids: Vec<i64> = Vec::new();
    {
        let mut stmt = tx
            .prepare(
                "SELECT id FROM jurnal_umum
                 WHERE referensi = ? AND jenis IN ('PEMBELIAN', 'PEMBELIAN_TUNAI')",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![referensi], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        for row in rows {
            ids.push(row.map_err(|e| e.to_string())?);
        }
    }
    for id in ids {
        jurnal_tx_reverse_kas_lines(tx, id, ts)?;
        tx.execute("DELETE FROM jurnal_umum WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn jurnal_tx_delete_penjualan_by_referensi(tx: &Transaction<'_>, referensi: &str, ts: i64) -> Result<(), String> {
    let mut ids: Vec<i64> = Vec::new();
    {
        let mut stmt = tx
            .prepare(
                "SELECT id FROM jurnal_umum
                 WHERE referensi = ? AND jenis IN ('PENJUALAN', 'PENJUALAN_TUNAI')",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![referensi], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        for row in rows {
            ids.push(row.map_err(|e| e.to_string())?);
        }
    }
    for id in ids {
        jurnal_tx_reverse_kas_lines(tx, id, ts)?;
        tx.execute("DELETE FROM jurnal_umum WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Posting jurnal pembelian: D inventori (akun pembelian), K hutang atau K kas.
fn pembelian_tx_post_jurnal(
    tx: &Transaction<'_>,
    tanggal: &str,
    referensi: &str,
    pemasok_kode: &str,
    total: i64,
    akun_kas_kode: Option<&str>,
    ts: i64,
) -> Result<(), String> {
    if total <= 0 {
        return Ok(());
    }
    konfigurasi_ensure_row(tx, ts)?;
    let cfg = konfigurasi_get_row(tx)?;
    let akun_pembelian = cfg
        .akun_pembelian
        .ok_or_else(|| "Konfigurasi akun pembelian/inventori belum diatur (Jurnal umum).".to_string())?;

    let (jenis, kredit_akun) = if let Some(kas) = akun_kas_kode {
        validate_akun_kas(tx, kas)?;
        (String::from("PEMBELIAN_TUNAI"), kas.to_string())
    } else {
        let akun_hutang = cfg
            .akun_hutang
            .ok_or_else(|| "Konfigurasi akun hutang belum diatur (Jurnal umum).".to_string())?;
        (String::from("PEMBELIAN"), akun_hutang)
    };

    let catatan = format!("Faktur pembelian {referensi} — pemasok {pemasok_kode}");
    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)",
        params![tanggal, jenis, referensi, catatan, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let jurnal_id = tx.last_insert_rowid();

    let lines = [
        (akun_pembelian.as_str(), total, 0_i64),
        (kredit_akun.as_str(), 0_i64, total),
    ];
    for (akun_kode, debit, kredit) in lines {
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, ?, ?, '')",
            params![jurnal_id, akun_kode, debit, kredit],
        )
        .map_err(|e| e.to_string())?;
        akun_jurnal_apply_saldo_delta(tx, akun_kode, debit, kredit, ts)?;
    }
    Ok(())
}

fn pembelian_faktur_total(sub_barang: i64, diskon_faktur: i64, pajak: i64) -> Result<i64, String> {
    if diskon_faktur < 0 {
        return Err("Diskon faktur tidak valid.".into());
    }
    if pajak < 0 {
        return Err("Pajak tidak valid.".into());
    }
    if diskon_faktur > sub_barang {
        return Err("Diskon faktur tidak boleh melebihi subtotal barang.".into());
    }
    let after_diskon = sub_barang - diskon_faktur;
    after_diskon
        .checked_add(pajak)
        .ok_or_else(|| "Total faktur melimpahi batas.".to_string())
}

fn pembelian_validate_and_total(
    payload: &PembelianInsertPayload,
) -> Result<(NaiveDate, NaiveDate, String, i64, i64, i64), String> {
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

    let mut sub_barang: i64 = 0;
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
        let sub = pembelian_line_subtotal(line.qty, line.harga_satuan, line.diskon)?;
        sub_barang = sub_barang
            .checked_add(sub)
            .ok_or_else(|| "Subtotal barang melimpahi batas.".to_string())?;
    }

    let total = pembelian_faktur_total(sub_barang, payload.diskon_faktur, payload.pajak)?;
    Ok((
        tgl,
        jt,
        metode.to_string(),
        payload.diskon_faktur,
        payload.pajak,
        total,
    ))
}

/// Tambah stok + baris mutasi untuk satu baris pembelian bertipe Barang.
/// `waktu_mutasi` = cap waktu pada baris `stok_mutasi`; `barang_updated_at` = cap pada master `barang_jasa`.
fn pembelian_tx_apply_barang_stok(
    tx: &Transaction<'_>,
    nomor: &str,
    kode_b: &str,
    qty: i64,
    satuan_tingkat: u8,
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
    let qty_stok = barang_line_qty_to_smallest_conn(&*tx, kode_b, qty, satuan_tingkat)?;
    let prev: i64 = tx
        .query_row(
            "SELECT COALESCE(stok, 0) FROM barang_jasa WHERE lower(kode) = lower(?)",
            params![kode_b],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let next = prev
        .checked_add(qty_stok)
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
            qty_stok,
            next
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Kurangi stok (balikkan dampak pembelian) untuk baris bertipe Barang.
fn pembelian_tx_revert_barang_stok(
    tx: &Transaction<'_>,
    kode_b: &str,
    qty: i64,
    satuan_tingkat: u8,
    ts: i64,
) -> Result<(), String> {
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
    let qty_stok = barang_line_qty_to_smallest_conn(&*tx, kode_b, qty, satuan_tingkat)?;
    let cur: i64 = tx
        .query_row(
            "SELECT COALESCE(stok, 0) FROM barang_jasa WHERE lower(kode) = lower(?)",
            params![kode_b],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if cur < qty_stok {
        return Err(format!(
            "Stok tidak cukup untuk mengoreksi faktur ({}). Stok saat ini {} unit; butuh mengurangi {} dari faktur lama.",
            kode_b, cur, qty_stok
        ));
    }
    let next = cur - qty_stok;
    tx.execute(
        "UPDATE barang_jasa SET stok = ?, updated_at = ? WHERE lower(kode) = lower(?)",
        params![next, ts, kode_b],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pembelian_insert(
    app: tauri::AppHandle,
    state: State<DbState>,
    payload: PembelianInsertPayload,
) -> Result<String, String> {
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    crate::activation::assert_can_create_transaction(&app, &conn)?;

    let (tgl, jt, metode, diskon_faktur, pajak, total) = pembelian_validate_and_total(&payload)?;
    let pemasok_kode = payload.pemasok_kode.trim();
    let gudang_kode = payload.gudang_kode.trim();
    let akun_kas_kode = pembelian_normalize_akun_kas(&payload.akun_kas_kode);
    let nomor = format!("FB-{}", Utc::now().timestamp_millis());
    let ts = now_ts();
    let tanggal_str = tgl.format("%Y-%m-%d").to_string();
    let jatuh_str = jt.format("%Y-%m-%d").to_string();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO pembelian (nomor, pemasok_kode, gudang_kode, tanggal_faktur, jatuh_tempo, metode_pembayaran, diskon_faktur, pajak, akun_kas_kode, total, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Dipesan', ?, ?)",
        params![
            &nomor,
            pemasok_kode,
            gudang_kode,
            tanggal_str,
            jatuh_str,
            metode,
            diskon_faktur,
            pajak,
            akun_kas_kode.as_deref(),
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
        let sub = pembelian_line_subtotal(line.qty, line.harga_satuan, line.diskon)?;
        tx.execute(
            "INSERT INTO pembelian_line (nomor, barang_kode, qty, satuan_tingkat, harga_satuan, diskon, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                &nomor,
                kode_b,
                line.qty,
                line.satuan_tingkat,
                line.harga_satuan,
                line.diskon,
                sub
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("FOREIGN KEY") {
                "Salah satu kode barang tidak ditemukan.".into()
            } else {
                e.to_string()
            }
        })?;
        pembelian_tx_apply_barang_stok(
            &tx,
            &nomor,
            kode_b,
            line.qty,
            line.satuan_tingkat,
            gudang_kode,
            &tanggal_str,
            ts,
            ts,
        )?;
    }

    pembelian_tx_post_jurnal(
        &tx,
        &tanggal_str,
        &nomor,
        pemasok_kode,
        total,
        akun_kas_kode.as_deref(),
        ts,
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(nomor)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PembelianDetailLine {
    pub barang_kode: String,
    pub barang_nama: String,
    pub qty: i64,
    pub satuan_tingkat: u8,
    pub satuan_nama: String,
    pub harga_satuan: i64,
    pub diskon: i64,
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
    pub subtotal_barang: i64,
    pub diskon_faktur: i64,
    pub pajak: i64,
    pub akun_kas_kode: Option<String>,
    pub akun_kas_nama: Option<String>,
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
            "SELECT p.nomor, p.pemasok_kode, s.nama, p.gudang_kode, g.nama, p.tanggal_faktur, p.jatuh_tempo, p.metode_pembayaran,
                    COALESCE(p.diskon_faktur, 0), COALESCE(p.pajak, 0), p.akun_kas_kode, k.nama, p.total, p.status
             FROM pembelian p
             JOIN pemasok s ON lower(s.kode) = lower(p.pemasok_kode)
             JOIN gudang g ON lower(g.kode) = lower(p.gudang_kode)
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(p.akun_kas_kode)
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
                    subtotal_barang: 0,
                    diskon_faktur: r.get(8)?,
                    pajak: r.get(9)?,
                    akun_kas_kode: r.get(10)?,
                    akun_kas_nama: r.get(11)?,
                    total: r.get(12)?,
                    status: r.get(13)?,
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
            "SELECT l.barang_kode, b.nama, l.qty, l.satuan_tingkat, l.harga_satuan, COALESCE(l.diskon, 0), l.subtotal
             FROM pembelian_line l
             JOIN barang_jasa b ON lower(b.kode) = lower(l.barang_kode)
             WHERE l.nomor = ?
             ORDER BY l.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let line_rows = stmt
        .query_map(params![n], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, i64>(2)?,
                r.get::<_, u8>(3)?,
                r.get::<_, i64>(4)?,
                r.get::<_, i64>(5)?,
                r.get::<_, i64>(6)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut lines = Vec::new();
    for lr in line_rows {
        let (barang_kode, barang_nama, qty, satuan_tingkat, harga_satuan, diskon, subtotal) =
            lr.map_err(|e| e.to_string())?;
        let satuan_nama = barang_satuan_nama(&conn, &barang_kode, satuan_tingkat)?;
        lines.push(PembelianDetailLine {
            barang_kode,
            barang_nama,
            qty,
            satuan_tingkat,
            satuan_nama,
            harga_satuan,
            diskon,
            subtotal,
        });
    }
    detail.subtotal_barang = lines.iter().map(|l| l.subtotal).sum();
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
    let (tgl, jt, metode, diskon_faktur, pajak, total) = pembelian_validate_and_total(&payload)?;
    let pemasok_kode = payload.pemasok_kode.trim();
    let gudang_kode = payload.gudang_kode.trim();
    let akun_kas_kode = pembelian_normalize_akun_kas(&payload.akun_kas_kode);
    let tanggal_str = tgl.format("%Y-%m-%d").to_string();
    let jatuh_str = jt.format("%Y-%m-%d").to_string();
    let ts = now_ts();

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    jurnal_tx_delete_pembelian_by_referensi(&tx, nomor_trim, ts)?;

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

    let mut old_lines: Vec<(String, i64, u8)> = Vec::new();
    {
        let mut stmt = tx
            .prepare("SELECT barang_kode, qty, satuan_tingkat FROM pembelian_line WHERE nomor = ?")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![nomor_trim], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?, r.get::<_, u8>(2)?))
            })
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

    for (kode_b, qty, satuan_tingkat) in &old_lines {
        pembelian_tx_revert_barang_stok(&tx, kode_b.trim(), *qty, *satuan_tingkat, ts)?;
    }

    tx.execute(
        "DELETE FROM pembelian_line WHERE nomor = ?",
        params![nomor_trim],
    )
    .map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE pembelian SET pemasok_kode = ?, gudang_kode = ?, tanggal_faktur = ?, jatuh_tempo = ?, metode_pembayaran = ?, diskon_faktur = ?, pajak = ?, akun_kas_kode = ?, total = ?, updated_at = ? WHERE nomor = ?",
        params![
            pemasok_kode,
            gudang_kode,
            tanggal_str,
            jatuh_str,
            metode,
            diskon_faktur,
            pajak,
            akun_kas_kode.as_deref(),
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
        let sub = pembelian_line_subtotal(line.qty, line.harga_satuan, line.diskon)?;
        tx.execute(
            "INSERT INTO pembelian_line (nomor, barang_kode, qty, satuan_tingkat, harga_satuan, diskon, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                nomor_trim,
                kode_b,
                line.qty,
                line.satuan_tingkat,
                line.harga_satuan,
                line.diskon,
                sub
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("FOREIGN KEY") {
                "Salah satu kode barang tidak ditemukan.".into()
            } else {
                e.to_string()
            }
        })?;
        pembelian_tx_apply_barang_stok(
            &tx,
            nomor_trim,
            kode_b,
            line.qty,
            line.satuan_tingkat,
            gudang_kode,
            &tanggal_str,
            ts,
            ts,
        )?;
    }

    pembelian_tx_post_jurnal(
        &tx,
        &tanggal_str,
        nomor_trim,
        pemasok_kode,
        total,
        akun_kas_kode.as_deref(),
        ts,
    )?;

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
    #[serde(default)]
    pub diskon: i64,
    #[serde(default = "default_satuan_tingkat_line")]
    pub satuan_tingkat: u8,
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
    #[serde(default)]
    pub diskon_faktur: i64,
    #[serde(default)]
    pub pajak: i64,
    #[serde(default)]
    pub akun_kas_kode: Option<String>,
    pub lines: Vec<PenjualanLineInput>,
}

fn penjualan_line_subtotal(qty: i64, harga_satuan: i64, diskon: i64) -> Result<i64, String> {
    pembelian_line_subtotal(qty, harga_satuan, diskon)
}

fn penjualan_faktur_total(sub_barang: i64, diskon_faktur: i64, pajak: i64) -> Result<i64, String> {
    pembelian_faktur_total(sub_barang, diskon_faktur, pajak)
}

/// Posting jurnal penjualan: D piutang/kas, K inventori (akun pembelian/persediaan di konfigurasi).
fn penjualan_tx_post_jurnal(
    tx: &Transaction<'_>,
    tanggal: &str,
    referensi: &str,
    pelanggan_kode: &str,
    total: i64,
    akun_kas_kode: Option<&str>,
    ts: i64,
) -> Result<(), String> {
    if total <= 0 {
        return Ok(());
    }
    konfigurasi_ensure_row(tx, ts)?;
    let cfg = konfigurasi_get_row(tx)?;
    let akun_inventori = cfg.akun_pembelian.ok_or_else(|| {
        "Konfigurasi akun pembelian/inventori belum diatur (Konfigurasi akun jurnal).".to_string()
    })?;

    let (jenis, debit_akun) = if let Some(kas) = akun_kas_kode {
        validate_akun_kas(tx, kas)?;
        (String::from("PENJUALAN_TUNAI"), kas.to_string())
    } else {
        let akun_piutang = cfg
            .akun_piutang
            .ok_or_else(|| "Konfigurasi akun piutang belum diatur (Konfigurasi akun jurnal).".to_string())?;
        (String::from("PENJUALAN"), akun_piutang)
    };

    let catatan = format!("Faktur penjualan {referensi} — pelanggan {pelanggan_kode}");
    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)",
        params![tanggal, jenis, referensi, catatan, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let jurnal_id = tx.last_insert_rowid();

    let lines = [
        (debit_akun.as_str(), total, 0_i64),
        (akun_inventori.as_str(), 0_i64, total),
    ];
    for (akun_kode, debit, kredit) in lines {
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, ?, ?, '')",
            params![jurnal_id, akun_kode, debit, kredit],
        )
        .map_err(|e| e.to_string())?;
        akun_jurnal_apply_saldo_delta(tx, akun_kode, debit, kredit, ts)?;
    }
    Ok(())
}

fn penjualan_validate_and_total(
    payload: &PenjualanInsertPayload,
) -> Result<(NaiveDate, NaiveDate, i64, i64, i64, i64), String> {
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

    let mut subtotal_barang: i64 = 0;
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
        if line.diskon < 0 {
            return Err("Diskon tidak valid.".into());
        }
        if line.diskon > line.harga_satuan {
            return Err("Diskon per satuan tidak boleh melebihi harga satuan.".into());
        }
        let sub = penjualan_line_subtotal(line.qty, line.harga_satuan, line.diskon)?;
        subtotal_barang = subtotal_barang
            .checked_add(sub)
            .ok_or_else(|| "Subtotal barang melimpahi batas.".to_string())?;
    }

    let diskon_faktur = payload.diskon_faktur;
    let pajak = payload.pajak;
    if diskon_faktur < 0 {
        return Err("Diskon faktur tidak valid.".into());
    }
    if diskon_faktur > subtotal_barang {
        return Err("Diskon faktur tidak boleh melebihi subtotal barang.".into());
    }
    if pajak < 0 {
        return Err("Pajak tidak valid.".into());
    }
    let total = penjualan_faktur_total(subtotal_barang, diskon_faktur, pajak)?;

    Ok((tgl, jt, subtotal_barang, diskon_faktur, pajak, total))
}

/// Kurangi stok + baris mutasi keluar untuk satu baris penjualan bertipe Barang.
fn penjualan_tx_apply_barang_stok(
    tx: &Transaction<'_>,
    nomor: &str,
    kode_b: &str,
    qty: i64,
    satuan_tingkat: u8,
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
    let qty_stok = barang_line_qty_to_smallest_conn(&*tx, kode_b, qty, satuan_tingkat)?;
    let tiers = barang_load_satuan_tiers(&*tx, kode_b)?;
    let max_tingkat = tiers.iter().map(|t| t.tingkat).max().unwrap_or(1);
    let satuan_stok = barang_satuan_nama(&*tx, kode_b, max_tingkat)?;
    let satuan_pilih = barang_satuan_nama(&*tx, kode_b, satuan_tingkat)?;
    let prev: i64 = tx
        .query_row(
            "SELECT COALESCE(stok, 0) FROM barang_jasa WHERE lower(kode) = lower(?)",
            params![kode_b],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if prev < qty_stok {
        return Err(format!(
            "Stok tidak cukup untuk {} ({}). Stok saat ini {} {}; diminta {} {} (setara {} {}).",
            kode_b, nomor, prev, satuan_stok, qty, satuan_pilih, qty_stok, satuan_stok
        ));
    }
    let next = prev - qty_stok;
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
            qty_stok,
            next,
            catatan
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Kembalikan stok (balikkan dampak penjualan) untuk baris bertipe Barang.
fn penjualan_tx_revert_barang_stok(
    tx: &Transaction<'_>,
    kode_b: &str,
    qty: i64,
    satuan_tingkat: u8,
    ts: i64,
) -> Result<(), String> {
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
    let qty_stok = barang_line_qty_to_smallest_conn(&*tx, kode_b, qty, satuan_tingkat)?;
    let cur: i64 = tx
        .query_row(
            "SELECT COALESCE(stok, 0) FROM barang_jasa WHERE lower(kode) = lower(?)",
            params![kode_b],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let next = cur.checked_add(qty_stok).ok_or_else(|| {
        format!(
            "Stok melimpahi batas saat mengoreksi faktur penjualan ({}).",
            kode_b
        )
    })?;
    tx.execute(
        "UPDATE barang_jasa SET stok = ?, updated_at = ? WHERE lower(kode) = lower(?)",
        params![next, ts, kode_b],
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

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PenjualanDetailLine {
    pub barang_kode: String,
    pub barang_nama: String,
    pub qty: i64,
    pub satuan_tingkat: u8,
    pub satuan_nama: String,
    pub harga_satuan: i64,
    pub diskon: i64,
    pub subtotal: i64,
    pub catatan: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PenjualanDetail {
    pub nomor: String,
    pub pelanggan_kode: String,
    pub pelanggan_nama: String,
    pub gudang_kode: String,
    pub gudang_nama: String,
    pub salesman: String,
    pub tanggal_faktur: String,
    pub jatuh_tempo: String,
    pub catatan_faktur: String,
    pub subtotal_barang: i64,
    pub diskon_faktur: i64,
    pub pajak: i64,
    pub akun_kas_kode: Option<String>,
    pub akun_kas_nama: Option<String>,
    pub total: i64,
    pub status: String,
    pub lines: Vec<PenjualanDetailLine>,
}

#[tauri::command]
pub fn penjualan_detail(state: State<DbState>, nomor: String) -> Result<PenjualanDetail, String> {
    let n = nomor.trim();
    if n.is_empty() {
        return Err("Nomor faktur wajib diisi.".into());
    }
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;

    let mut detail: PenjualanDetail = conn
        .query_row(
            "SELECT p.nomor, p.pelanggan_kode, c.nama, p.gudang_kode, g.nama, p.salesman,
                    p.tanggal_faktur, p.jatuh_tempo, p.catatan_faktur,
                    COALESCE(p.diskon_faktur, 0), COALESCE(p.pajak, 0), p.akun_kas_kode, k.nama, p.total, p.status
             FROM penjualan p
             JOIN pelanggan c ON lower(c.kode) = lower(p.pelanggan_kode)
             JOIN gudang g ON lower(g.kode) = lower(p.gudang_kode)
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(p.akun_kas_kode)
             WHERE p.nomor = ?",
            params![n],
            |r| {
                Ok(PenjualanDetail {
                    nomor: r.get(0)?,
                    pelanggan_kode: r.get(1)?,
                    pelanggan_nama: r.get(2)?,
                    gudang_kode: r.get(3)?,
                    gudang_nama: r.get(4)?,
                    salesman: r.get(5)?,
                    tanggal_faktur: r.get(6)?,
                    jatuh_tempo: r.get(7)?,
                    catatan_faktur: r.get(8)?,
                    subtotal_barang: 0,
                    diskon_faktur: r.get(9)?,
                    pajak: r.get(10)?,
                    akun_kas_kode: r.get(11)?,
                    akun_kas_nama: r.get(12)?,
                    total: r.get(13)?,
                    status: r.get(14)?,
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
            "SELECT l.barang_kode, b.nama, l.qty, l.satuan_tingkat, l.harga_satuan, COALESCE(l.diskon, 0), l.subtotal, l.catatan
             FROM penjualan_line l
             JOIN barang_jasa b ON lower(b.kode) = lower(l.barang_kode)
             WHERE l.nomor = ?
             ORDER BY l.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let line_rows = stmt
        .query_map(params![n], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, i64>(2)?,
                r.get::<_, u8>(3)?,
                r.get::<_, i64>(4)?,
                r.get::<_, i64>(5)?,
                r.get::<_, i64>(6)?,
                r.get::<_, String>(7)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let mut lines = Vec::new();
    for lr in line_rows {
        let (
            barang_kode,
            barang_nama,
            qty,
            satuan_tingkat,
            harga_satuan,
            diskon,
            subtotal,
            catatan,
        ) = lr.map_err(|e| e.to_string())?;
        let satuan_nama = barang_satuan_nama(&conn, &barang_kode, satuan_tingkat)?;
        lines.push(PenjualanDetailLine {
            barang_kode,
            barang_nama,
            qty,
            satuan_tingkat,
            satuan_nama,
            harga_satuan,
            diskon,
            subtotal,
            catatan,
        });
    }
    detail.subtotal_barang = lines.iter().map(|l| l.subtotal).sum();
    detail.lines = lines;

    Ok(detail)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardPenjualanBulananPoint {
    pub month: String,
    pub month_num: u8,
    pub sales: i64,
    pub revenue: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardPenjualanBulananResult {
    pub year: i32,
    pub points: Vec<DashboardPenjualanBulananPoint>,
    pub available_years: Vec<i32>,
    pub highlight_month: u8,
}

const DASHBOARD_MONTH_LABELS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

fn dashboard_penjualan_available_years(conn: &Connection) -> rusqlite::Result<Vec<i32>> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT CAST(substr(tanggal_faktur, 1, 4) AS INTEGER) AS y
         FROM penjualan
         WHERE length(tanggal_faktur) >= 4
         ORDER BY y DESC",
    )?;
    let years: Vec<i32> = stmt
        .query_map([], |r| r.get::<_, i32>(0))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(years)
}

/// Agregasi penjualan per bulan: `sales` = total faktur, `revenue` = faktur berstatus Lunas.
#[tauri::command]
pub fn dashboard_penjualan_bulanan(
    state: State<DbState>,
    year: Option<i32>,
) -> Result<DashboardPenjualanBulananResult, String> {
    with_conn(&state, |conn| {
        let now = Local::now();
        let current_year = now.year();
        let current_month = now.month() as u8;
        let mut available_years = dashboard_penjualan_available_years(conn)?;
        if available_years.is_empty() {
            available_years.push(current_year);
        }
        let tahun = year.unwrap_or(*available_years.first().unwrap_or(&current_year));
        let year_prefix = format!("{tahun}-");

        let mut stmt = conn.prepare(
            "SELECT CAST(strftime('%m', tanggal_faktur) AS INTEGER) AS bulan,
                    COALESCE(SUM(total), 0),
                    COALESCE(SUM(CASE WHEN status = 'Lunas' THEN total ELSE 0 END), 0)
             FROM penjualan
             WHERE tanggal_faktur LIKE ?1 || '%'
             GROUP BY bulan
             ORDER BY bulan",
        )?;
        let mut by_month: HashMap<u8, (i64, i64)> = HashMap::new();
        let rows = stmt.query_map([year_prefix.as_str()], |r| {
            let bulan: i32 = r.get(0)?;
            let sales: i64 = r.get(1)?;
            let revenue: i64 = r.get(2)?;
            Ok((bulan as u8, sales, revenue))
        })?;
        for row in rows {
            let (bulan, sales, revenue) = row?;
            by_month.insert(bulan, (sales, revenue));
        }

        let highlight_month = if tahun == current_year {
            current_month
        } else {
            by_month
                .iter()
                .max_by_key(|(_, (s, _))| s)
                .map(|(m, _)| *m)
                .unwrap_or(0)
        };

        let points: Vec<DashboardPenjualanBulananPoint> = (1..=12u8)
            .map(|m| {
                let (sales, revenue) = by_month.get(&m).copied().unwrap_or((0, 0));
                DashboardPenjualanBulananPoint {
                    month: DASHBOARD_MONTH_LABELS[(m - 1) as usize].to_string(),
                    month_num: m,
                    sales,
                    revenue,
                }
            })
            .collect();

        Ok(DashboardPenjualanBulananResult {
            year: tahun,
            points,
            available_years,
            highlight_month,
        })
    })
}

/// Faktur dianggap terlunasi jika status Lunas atau penjualan tunai (akun kas terisi).
const SQL_PENJUALAN_TERLUNASI: &str =
    "(upper(trim(status)) = 'LUNAS' OR (akun_kas_kode IS NOT NULL AND trim(akun_kas_kode) != ''))";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardPenjualanRingkasanBulan {
    pub jumlah_faktur: i64,
    pub nilai_total: i64,
    pub jumlah_terlunasi: i64,
    pub nilai_terlunasi: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DashboardPenjualanRingkasan {
    pub bulan_ini: DashboardPenjualanRingkasanBulan,
    pub bulan_lalu: DashboardPenjualanRingkasanBulan,
    pub piutang_jumlah: i64,
    pub piutang_nilai: i64,
    pub label_bulan_ini: String,
}

fn dashboard_penjualan_ringkasan_bulan(
    conn: &Connection,
    year_month_prefix: &str,
) -> rusqlite::Result<DashboardPenjualanRingkasanBulan> {
    let sql = format!(
        "SELECT COUNT(*),
                COALESCE(SUM(total), 0),
                COALESCE(SUM(CASE WHEN {SQL_PENJUALAN_TERLUNASI} THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN {SQL_PENJUALAN_TERLUNASI} THEN total ELSE 0 END), 0)
         FROM penjualan
         WHERE tanggal_faktur LIKE ?1 || '%'"
    );
    conn.query_row(&sql, [year_month_prefix], |r| {
        Ok(DashboardPenjualanRingkasanBulan {
            jumlah_faktur: r.get(0)?,
            nilai_total: r.get(1)?,
            jumlah_terlunasi: r.get(2)?,
            nilai_terlunasi: r.get(3)?,
        })
    })
}

#[tauri::command]
pub fn dashboard_penjualan_ringkasan(state: State<DbState>) -> Result<DashboardPenjualanRingkasan, String> {
    with_conn(&state, |conn| {
        let now = Local::now();
        let y = now.year();
        let m = now.month();
        let prefix_ini = format!("{y:04}-{m:02}");
        let (y_lalu, m_lalu) = if m == 1 {
            (y - 1, 12u32)
        } else {
            (y, m - 1)
        };
        let prefix_lalu = format!("{y_lalu:04}-{m_lalu:02}");

        let bulan_ini = dashboard_penjualan_ringkasan_bulan(conn, &prefix_ini)?;
        let bulan_lalu = dashboard_penjualan_ringkasan_bulan(conn, &prefix_lalu)?;

        let (piutang_jumlah, piutang_nilai): (i64, i64) = conn.query_row(
            "SELECT COUNT(*), COALESCE(SUM(total), 0)
             FROM penjualan
             WHERE (akun_kas_kode IS NULL OR trim(akun_kas_kode) = '')
               AND upper(trim(status)) != 'LUNAS'",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;

        let label_bulan_ini = format!(
            "{} {}",
            match m {
                1 => "Januari",
                2 => "Februari",
                3 => "Maret",
                4 => "April",
                5 => "Mei",
                6 => "Juni",
                7 => "Juli",
                8 => "Agustus",
                9 => "September",
                10 => "Oktober",
                11 => "November",
                12 => "Desember",
                _ => "",
            },
            y
        );

        Ok(DashboardPenjualanRingkasan {
            bulan_ini,
            bulan_lalu,
            piutang_jumlah,
            piutang_nilai,
            label_bulan_ini,
        })
    })
}

#[tauri::command]
pub fn penjualan_insert(
    app: tauri::AppHandle,
    state: State<DbState>,
    payload: PenjualanInsertPayload,
) -> Result<String, String> {
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    crate::activation::assert_can_create_transaction(&app, &conn)?;

    let (tgl, jt, _sub, diskon_faktur, pajak, total) = penjualan_validate_and_total(&payload)?;
    let pelanggan_kode = payload.pelanggan_kode.trim();
    let gudang_kode = payload.gudang_kode.trim();
    let salesman = payload.salesman.trim();
    let catatan_faktur = payload.catatan_faktur.trim();
    let akun_kas_kode = pembelian_normalize_akun_kas(&payload.akun_kas_kode);
    let nomor = format!("FJ-{}", Utc::now().timestamp_millis());
    let ts = now_ts();
    let tanggal_str = tgl.format("%Y-%m-%d").to_string();
    let jatuh_str = jt.format("%Y-%m-%d").to_string();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO penjualan (nomor, pelanggan_kode, gudang_kode, salesman, tanggal_faktur, jatuh_tempo, catatan_faktur, diskon_faktur, pajak, akun_kas_kode, total, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Dipesan', ?, ?)",
        params![
            &nomor,
            pelanggan_kode,
            gudang_kode,
            salesman,
            tanggal_str,
            jatuh_str,
            catatan_faktur,
            diskon_faktur,
            pajak,
            akun_kas_kode.as_deref(),
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
        let sub = penjualan_line_subtotal(line.qty, line.harga_satuan, line.diskon)?;
        let line_catatan = line.catatan.trim();
        tx.execute(
            "INSERT INTO penjualan_line (nomor, barang_kode, qty, satuan_tingkat, harga_satuan, diskon, subtotal, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                &nomor,
                kode_b,
                line.qty,
                line.satuan_tingkat,
                line.harga_satuan,
                line.diskon,
                sub,
                line_catatan
            ],
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
            line.satuan_tingkat,
            gudang_kode,
            &tanggal_str,
            line_catatan,
            ts,
            ts,
        )?;
    }

    penjualan_tx_post_jurnal(
        &tx,
        &tanggal_str,
        &nomor,
        pelanggan_kode,
        total,
        akun_kas_kode.as_deref(),
        ts,
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(nomor)
}

#[tauri::command]
pub fn penjualan_update(
    state: State<DbState>,
    nomor: String,
    payload: PenjualanInsertPayload,
) -> Result<(), String> {
    let nomor_trim = nomor.trim();
    if nomor_trim.is_empty() {
        return Err("Nomor faktur tidak valid.".into());
    }
    let (tgl, jt, _sub, diskon_faktur, pajak, total) = penjualan_validate_and_total(&payload)?;
    let pelanggan_kode = payload.pelanggan_kode.trim();
    let gudang_kode = payload.gudang_kode.trim();
    let salesman = payload.salesman.trim();
    let catatan_faktur = payload.catatan_faktur.trim();
    let akun_kas_kode = pembelian_normalize_akun_kas(&payload.akun_kas_kode);
    let tanggal_str = tgl.format("%Y-%m-%d").to_string();
    let jatuh_str = jt.format("%Y-%m-%d").to_string();
    let ts = now_ts();

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    jurnal_tx_delete_penjualan_by_referensi(&tx, nomor_trim, ts)?;

    let exists: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM penjualan WHERE nomor = ?",
            params![nomor_trim],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err("Faktur penjualan tidak ditemukan.".into());
    }

    let mut old_lines: Vec<(String, i64, u8)> = Vec::new();
    {
        let mut stmt = tx
            .prepare("SELECT barang_kode, qty, satuan_tingkat FROM penjualan_line WHERE nomor = ?")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![nomor_trim], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?, r.get::<_, u8>(2)?))
            })
            .map_err(|e| e.to_string())?;
        for row in rows {
            old_lines.push(row.map_err(|e| e.to_string())?);
        }
    }

    tx.execute(
        "DELETE FROM stok_mutasi WHERE referensi = ? AND upper(trim(jenis)) = 'PENJUALAN'",
        params![nomor_trim],
    )
    .map_err(|e| e.to_string())?;

    for (kode_b, qty, satuan_tingkat) in &old_lines {
        penjualan_tx_revert_barang_stok(&tx, kode_b.trim(), *qty, *satuan_tingkat, ts)?;
    }

    tx.execute(
        "DELETE FROM penjualan_line WHERE nomor = ?",
        params![nomor_trim],
    )
    .map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE penjualan SET pelanggan_kode = ?, gudang_kode = ?, salesman = ?, tanggal_faktur = ?, jatuh_tempo = ?, catatan_faktur = ?, diskon_faktur = ?, pajak = ?, akun_kas_kode = ?, total = ?, updated_at = ? WHERE nomor = ?",
        params![
            pelanggan_kode,
            gudang_kode,
            salesman,
            tanggal_str,
            jatuh_str,
            catatan_faktur,
            diskon_faktur,
            pajak,
            akun_kas_kode.as_deref(),
            total,
            ts,
            nomor_trim
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("FOREIGN KEY") {
            "Pelanggan atau gudang tidak ditemukan.".into()
        } else {
            e.to_string()
        }
    })?;

    for line in &payload.lines {
        let kode_b = line.barang_kode.trim();
        let sub = penjualan_line_subtotal(line.qty, line.harga_satuan, line.diskon)?;
        let line_catatan = line.catatan.trim();
        tx.execute(
            "INSERT INTO penjualan_line (nomor, barang_kode, qty, satuan_tingkat, harga_satuan, diskon, subtotal, catatan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                nomor_trim,
                kode_b,
                line.qty,
                line.satuan_tingkat,
                line.harga_satuan,
                line.diskon,
                sub,
                line_catatan
            ],
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
            nomor_trim,
            kode_b,
            line.qty,
            line.satuan_tingkat,
            gudang_kode,
            &tanggal_str,
            line_catatan,
            ts,
            ts,
        )?;
    }

    penjualan_tx_post_jurnal(
        &tx,
        &tanggal_str,
        nomor_trim,
        pelanggan_kode,
        total,
        akun_kas_kode.as_deref(),
        ts,
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PiutangBelumLunasRow {
    pub nomor: String,
    pub tanggal_faktur: String,
    pub jatuh_tempo: String,
    pub pelanggan_kode: String,
    pub pelanggan_nama: String,
    pub total: i64,
    pub catatan_faktur: String,
}

#[tauri::command]
pub fn piutang_belum_lunas_list(state: State<DbState>) -> Result<Vec<PiutangBelumLunasRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT p.nomor, p.tanggal_faktur, p.jatuh_tempo, p.pelanggan_kode, c.nama, p.total, p.catatan_faktur
             FROM penjualan p
             INNER JOIN pelanggan c ON lower(c.kode) = lower(p.pelanggan_kode)
             WHERE (p.akun_kas_kode IS NULL OR trim(p.akun_kas_kode) = '')
               AND upper(trim(p.status)) != 'LUNAS'
             ORDER BY p.jatuh_tempo ASC, p.tanggal_faktur ASC, p.nomor ASC",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(PiutangBelumLunasRow {
                nomor: r.get(0)?,
                tanggal_faktur: r.get(1)?,
                jatuh_tempo: r.get(2)?,
                pelanggan_kode: r.get(3)?,
                pelanggan_nama: r.get(4)?,
                total: r.get(5)?,
                catatan_faktur: r.get(6)?,
            })
        })?;
        rows.collect()
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanPiutangPayload {
    pub nomor_faktur: String,
    pub tanggal: String,
    pub kas_kode: String,
    pub jumlah: i64,
    pub catatan: String,
}

/// Jurnal pelunasan piutang: D kas, K piutang. Mengembalikan id jurnal.
fn pelunasan_piutang_tx_post_jurnal(
    tx: &Transaction<'_>,
    tanggal: &str,
    referensi: &str,
    pelanggan_kode: &str,
    jumlah: i64,
    kas_kode: &str,
    catatan_extra: &str,
    ts: i64,
) -> Result<i64, String> {
    if jumlah <= 0 {
        return Err("Jumlah pelunasan harus lebih dari 0.".into());
    }
    konfigurasi_ensure_row(tx, ts)?;
    let cfg = konfigurasi_get_row(tx)?;
    let akun_piutang = cfg
        .akun_piutang
        .ok_or_else(|| "Konfigurasi akun piutang belum diatur (Konfigurasi akun jurnal).".to_string())?;
    validate_akun_kas(tx, kas_kode)?;

    let mut catatan = format!("Pelunasan piutang faktur {referensi} — pelanggan {pelanggan_kode}");
    if !catatan_extra.is_empty() {
        catatan.push_str(" — ");
        catatan.push_str(catatan_extra);
    }

    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, 'PELUNASAN_PIUTANG', ?, ?, ?, ?)",
        params![tanggal, referensi, catatan, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let jurnal_id = tx.last_insert_rowid();

    let lines = [(kas_kode, jumlah, 0_i64), (akun_piutang.as_str(), 0_i64, jumlah)];
    for (akun_kode, debit, kredit) in lines {
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, ?, ?, '')",
            params![jurnal_id, akun_kode, debit, kredit],
        )
        .map_err(|e| e.to_string())?;
        akun_jurnal_apply_saldo_delta(tx, akun_kode, debit, kredit, ts)?;
    }
    Ok(jurnal_id)
}

fn pelunasan_piutang_tx_save_riwayat(
    tx: &Transaction<'_>,
    pelunasan_nomor: &str,
    tanggal: &str,
    pelanggan_kode: &str,
    kas_kode: &str,
    total: i64,
    catatan: &str,
    jurnal_id: i64,
    faktur_list: &[(String, i64)],
    ts: i64,
) -> Result<(), String> {
    tx.execute(
        "INSERT INTO pelunasan_piutang (nomor, tanggal, pelanggan_kode, akun_kas_kode, total, catatan, jurnal_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            pelunasan_nomor,
            tanggal,
            pelanggan_kode,
            kas_kode,
            total,
            catatan,
            jurnal_id,
            ts,
            ts
        ],
    )
    .map_err(|e| e.to_string())?;

    for (faktur_nomor, jumlah) in faktur_list {
        tx.execute(
            "INSERT INTO pelunasan_piutang_faktur (pelunasan_nomor, faktur_nomor, jumlah) VALUES (?, ?, ?)",
            params![pelunasan_nomor, faktur_nomor, jumlah],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Validasi faktur piutang; kembalikan (pelanggan_kode, total).
fn pelunasan_piutang_tx_read_faktur(
    tx: &Transaction<'_>,
    nomor: &str,
) -> Result<(String, i64), String> {
    let (pelanggan_kode, total, sudah_lunas): (String, i64, bool) = tx
        .query_row(
            "SELECT pelanggan_kode, total,
                    CASE WHEN akun_kas_kode IS NOT NULL AND trim(akun_kas_kode) != '' THEN 1
                         WHEN upper(trim(status)) = 'LUNAS' THEN 1 ELSE 0 END
             FROM penjualan WHERE nomor = ?",
            params![nomor],
            |r| Ok((r.get(0)?, r.get(1)?, r.get::<_, i64>(2)? != 0)),
        )
        .map_err(|_| format!("Faktur penjualan '{nomor}' tidak ditemukan."))?;
    if sudah_lunas {
        return Err(format!("Faktur '{nomor}' sudah lunas atau bukan piutang."));
    }
    Ok((pelanggan_kode.trim().to_string(), total))
}

fn pelunasan_piutang_tx_mark_lunas(
    tx: &Transaction<'_>,
    nomor: &str,
    kas_kode: &str,
    ts: i64,
) -> Result<(), String> {
    tx.execute(
        "UPDATE penjualan SET akun_kas_kode = ?, status = 'Lunas', updated_at = ? WHERE nomor = ?",
        params![kas_kode, ts, nomor],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn pelunasan_batch_referensi(nomor_list: &[String]) -> String {
    if nomor_list.is_empty() {
        return String::new();
    }
    if nomor_list.len() == 1 {
        return nomor_list[0].clone();
    }
    format!("{} (+{} faktur)", nomor_list[0], nomor_list.len() - 1)
}

fn pelunasan_piutang_tx_settle_one(
    tx: &Transaction<'_>,
    nomor: &str,
    tanggal: &str,
    kas_kode: &str,
    catatan: &str,
    ts: i64,
) -> Result<String, String> {
    let (pelanggan_kode, total) = pelunasan_piutang_tx_read_faktur(tx, nomor)?;
    let pelunasan_nomor = format!("PLP-{}", ts);

    let jurnal_id = pelunasan_piutang_tx_post_jurnal(
        tx,
        tanggal,
        nomor,
        &pelanggan_kode,
        total,
        kas_kode,
        catatan,
        ts,
    )?;

    pelunasan_piutang_tx_mark_lunas(tx, nomor, kas_kode, ts)?;

    pelunasan_piutang_tx_save_riwayat(
        tx,
        &pelunasan_nomor,
        tanggal,
        &pelanggan_kode,
        kas_kode,
        total,
        catatan,
        jurnal_id,
        &[(nomor.to_string(), total)],
        ts,
    )?;

    Ok(pelunasan_nomor)
}

#[tauri::command]
pub fn pelunasan_piutang_apply(
    state: State<DbState>,
    payload: PelunasanPiutangPayload,
) -> Result<String, String> {
    let nomor = payload.nomor_faktur.trim();
    let tanggal = payload.tanggal.trim();
    let kas_kode = payload.kas_kode.trim().to_uppercase();
    let jumlah = payload.jumlah;
    let catatan = payload.catatan.trim();

    if nomor.is_empty() {
        return Err("Nomor faktur wajib diisi.".into());
    }
    if tanggal.is_empty() {
        return Err("Tanggal pelunasan wajib diisi.".into());
    }
    NaiveDate::parse_from_str(tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if kas_kode.is_empty() {
        return Err("Pilih akun kas penerimaan.".into());
    }
    if jumlah <= 0 {
        return Err("Jumlah pelunasan harus lebih dari 0.".into());
    }

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let ts = now_ts();

    let total: i64 = tx
        .query_row(
            "SELECT total FROM penjualan WHERE nomor = ?",
            params![nomor],
            |r| r.get(0),
        )
        .map_err(|_| format!("Faktur penjualan '{nomor}' tidak ditemukan."))?;
    if jumlah != total {
        return Err(format!(
            "Pelunasan penuh diperlukan: jumlah harus sama dengan total faktur ({total})."
        ));
    }

    let pelunasan_nomor =
        pelunasan_piutang_tx_settle_one(&tx, nomor, tanggal, &kas_kode, catatan, ts)?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(pelunasan_nomor)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanPiutangBatchPayload {
    pub pelanggan_kode: String,
    pub tanggal: String,
    pub kas_kode: String,
    pub catatan: String,
    pub nomor_faktur: Vec<String>,
}

#[tauri::command]
pub fn pelunasan_piutang_apply_batch(
    state: State<DbState>,
    payload: PelunasanPiutangBatchPayload,
) -> Result<String, String> {
    let pelanggan_kode = payload.pelanggan_kode.trim();
    let tanggal = payload.tanggal.trim();
    let kas_kode = payload.kas_kode.trim().to_uppercase();
    let catatan = payload.catatan.trim();
    let mut nomor_list: Vec<String> = payload
        .nomor_faktur
        .iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    nomor_list.sort();
    nomor_list.dedup();

    if pelanggan_kode.is_empty() {
        return Err("Pilih pelanggan.".into());
    }
    if tanggal.is_empty() {
        return Err("Tanggal pelunasan wajib diisi.".into());
    }
    NaiveDate::parse_from_str(tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if kas_kode.is_empty() {
        return Err("Pilih akun kas penerimaan.".into());
    }
    if nomor_list.is_empty() {
        return Err("Pilih minimal satu faktur piutang.".into());
    }

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let ts = now_ts();

    validate_akun_kas(&tx, &kas_kode)?;

    let mut total_jumlah: i64 = 0;
    for nomor in &nomor_list {
        let (pk, total) = pelunasan_piutang_tx_read_faktur(&tx, nomor)?;
        if pk.to_uppercase() != pelanggan_kode.to_uppercase() {
            return Err(format!(
                "Faktur '{nomor}' bukan milik pelanggan {pelanggan_kode}."
            ));
        }
        total_jumlah = total_jumlah
            .checked_add(total)
            .ok_or_else(|| "Total pelunasan melebihi batas.".to_string())?;
    }

    let referensi = pelunasan_batch_referensi(&nomor_list);
    let mut catatan_extra = format!("faktur: {}", nomor_list.join(", "));
    if !catatan.is_empty() {
        catatan_extra.push_str(" — ");
        catatan_extra.push_str(catatan);
    }

    let jurnal_id = pelunasan_piutang_tx_post_jurnal(
        &tx,
        tanggal,
        &referensi,
        pelanggan_kode,
        total_jumlah,
        &kas_kode,
        &catatan_extra,
        ts,
    )?;

    let mut faktur_jumlah: Vec<(String, i64)> = Vec::new();
    for nomor in &nomor_list {
        let total: i64 = tx
            .query_row(
                "SELECT total FROM penjualan WHERE nomor = ?",
                params![nomor],
                |r| r.get(0),
            )
            .map_err(|_| format!("Faktur '{nomor}' tidak ditemukan."))?;
        pelunasan_piutang_tx_mark_lunas(&tx, nomor, &kas_kode, ts)?;
        faktur_jumlah.push((nomor.clone(), total));
    }

    let pelunasan_nomor = format!("PLP-{}", ts);
    pelunasan_piutang_tx_save_riwayat(
        &tx,
        &pelunasan_nomor,
        tanggal,
        pelanggan_kode,
        &kas_kode,
        total_jumlah,
        catatan,
        jurnal_id,
        &faktur_jumlah,
        ts,
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(pelunasan_nomor)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanPiutangRiwayatRow {
    pub nomor: String,
    pub tanggal: String,
    pub pelanggan_kode: String,
    pub pelanggan_nama: String,
    pub akun_kas_kode: String,
    pub akun_kas_nama: String,
    pub total: i64,
    pub jumlah_faktur: i64,
    pub catatan: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanPiutangFakturRow {
    pub faktur_nomor: String,
    pub tanggal_faktur: String,
    pub jatuh_tempo: String,
    pub jumlah: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanPiutangDetail {
    pub nomor: String,
    pub tanggal: String,
    pub pelanggan_kode: String,
    pub pelanggan_nama: String,
    pub akun_kas_kode: String,
    pub akun_kas_nama: String,
    pub total: i64,
    pub catatan: String,
    pub created_at: i64,
    pub jurnal_id: Option<i64>,
    pub faktur: Vec<PelunasanPiutangFakturRow>,
}

#[tauri::command]
pub fn pelunasan_piutang_riwayat_list(
    state: State<DbState>,
    tanggal_dari: String,
    tanggal_sampai: String,
) -> Result<Vec<PelunasanPiutangRiwayatRow>, String> {
    let dari = tanggal_dari.trim();
    let sampai = tanggal_sampai.trim();
    let d1 = NaiveDate::parse_from_str(dari, "%Y-%m-%d")
        .map_err(|_| "Tanggal mulai tidak valid (YYYY-MM-DD).".to_string())?;
    let d2 = NaiveDate::parse_from_str(sampai, "%Y-%m-%d")
        .map_err(|_| "Tanggal akhir tidak valid (YYYY-MM-DD).".to_string())?;
    if d2 < d1 {
        return Err("Tanggal akhir tidak boleh sebelum tanggal mulai.".into());
    }

    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT pp.nomor, pp.tanggal, pp.pelanggan_kode, COALESCE(c.nama, ''), pp.akun_kas_kode,
                    COALESCE(k.nama, ''), pp.total,
                    (SELECT COUNT(*) FROM pelunasan_piutang_faktur pf WHERE pf.pelunasan_nomor = pp.nomor),
                    pp.catatan, pp.created_at
             FROM pelunasan_piutang pp
             LEFT JOIN pelanggan c ON lower(c.kode) = lower(pp.pelanggan_kode)
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(pp.akun_kas_kode)
             WHERE pp.tanggal >= ? AND pp.tanggal <= ?
             ORDER BY pp.tanggal DESC, pp.created_at DESC, pp.nomor DESC",
        )?;
        let rows = stmt.query_map(params![dari, sampai], |r| {
            Ok(PelunasanPiutangRiwayatRow {
                nomor: r.get(0)?,
                tanggal: r.get(1)?,
                pelanggan_kode: r.get(2)?,
                pelanggan_nama: r.get(3)?,
                akun_kas_kode: r.get(4)?,
                akun_kas_nama: r.get(5)?,
                total: r.get(6)?,
                jumlah_faktur: r.get(7)?,
                catatan: r.get(8)?,
                created_at: r.get(9)?,
            })
        })?;
        rows.collect()
    })
}

#[tauri::command]
pub fn pelunasan_piutang_riwayat_detail(
    state: State<DbState>,
    nomor: String,
) -> Result<PelunasanPiutangDetail, String> {
    let key = nomor.trim();
    if key.is_empty() {
        return Err("Nomor pelunasan wajib diisi.".into());
    }

    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;

    let header: PelunasanPiutangDetail = conn
        .query_row(
            "SELECT pp.nomor, pp.tanggal, pp.pelanggan_kode, COALESCE(c.nama, ''), pp.akun_kas_kode,
                    COALESCE(k.nama, ''), pp.total, pp.catatan, pp.created_at, pp.jurnal_id
             FROM pelunasan_piutang pp
             LEFT JOIN pelanggan c ON lower(c.kode) = lower(pp.pelanggan_kode)
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(pp.akun_kas_kode)
             WHERE pp.nomor = ?",
            params![key],
            |r| {
                Ok(PelunasanPiutangDetail {
                    nomor: r.get(0)?,
                    tanggal: r.get(1)?,
                    pelanggan_kode: r.get(2)?,
                    pelanggan_nama: r.get(3)?,
                    akun_kas_kode: r.get(4)?,
                    akun_kas_nama: r.get(5)?,
                    total: r.get(6)?,
                    catatan: r.get(7)?,
                    created_at: r.get(8)?,
                    jurnal_id: r.get(9)?,
                    faktur: Vec::new(),
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Pelunasan '{key}' tidak ditemukan."),
            _ => e.to_string(),
        })?;

    let mut stmt = conn
        .prepare(
            "SELECT pf.faktur_nomor, p.tanggal_faktur, p.jatuh_tempo, pf.jumlah
             FROM pelunasan_piutang_faktur pf
             INNER JOIN penjualan p ON p.nomor = pf.faktur_nomor
             WHERE pf.pelunasan_nomor = ?
             ORDER BY p.tanggal_faktur ASC, pf.faktur_nomor ASC",
        )
        .map_err(|e| e.to_string())?;
    let faktur = stmt
        .query_map(params![key], |r| {
            Ok(PelunasanPiutangFakturRow {
                faktur_nomor: r.get(0)?,
                tanggal_faktur: r.get(1)?,
                jatuh_tempo: r.get(2)?,
                jumlah: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(PelunasanPiutangDetail { faktur, ..header })
}

/// Buka faktur penjualan yang sebelumnya dilunasi: bersihkan kas + kembalikan status ke 'Dipesan'.
fn pelunasan_piutang_tx_unsettle_faktur(
    tx: &Transaction<'_>,
    nomor_faktur: &str,
    ts: i64,
) -> Result<(), String> {
    tx.execute(
        "UPDATE penjualan
         SET akun_kas_kode = NULL,
             status = 'Dipesan',
             updated_at = ?
         WHERE nomor = ?",
        params![ts, nomor_faktur],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pelunasan_piutang_delete(
    state: State<DbState>,
    nomor: String,
    actor_username: String,
    actor_nama: String,
) -> Result<(), String> {
    let key = nomor.trim().to_string();
    if key.is_empty() {
        return Err("Nomor pelunasan wajib diisi.".into());
    }
    let actor_username = actor_username.trim().to_string();
    let actor_nama = actor_nama.trim().to_string();
    if actor_username.is_empty() {
        return Err("Sesi pengguna tidak terbaca — silakan login ulang.".into());
    }

    let ts = now_ts();
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (
        tanggal_pelunasan,
        pelanggan_kode,
        kas_kode,
        total,
        catatan,
        old_jurnal_id_opt,
    ): (String, String, String, i64, String, Option<i64>) = tx
        .query_row(
            "SELECT tanggal, pelanggan_kode, akun_kas_kode, total, catatan, jurnal_id
             FROM pelunasan_piutang WHERE nomor = ?",
            params![&key],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Pelunasan '{key}' tidak ditemukan."),
            _ => e.to_string(),
        })?;
    let old_jurnal_id = old_jurnal_id_opt
        .ok_or_else(|| "Pelunasan ini tidak terhubung dengan jurnal asal — tidak bisa dihapus.".to_string())?;

    let mut faktur_list: Vec<(String, i64)> = Vec::new();
    {
        let mut stmt = tx
            .prepare("SELECT faktur_nomor, jumlah FROM pelunasan_piutang_faktur WHERE pelunasan_nomor = ?")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![&key], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            faktur_list.push(row.map_err(|e| e.to_string())?);
        }
    }

    // Jurnal pembalik dicatat di tanggal hari ini (saat koreksi dilakukan), bukan tanggal pelunasan asli.
    // Tujuan: muncul di periode aktif user, tidak mengubah laporan periode lampau secara retroaktif.
    let tanggal_pembalik = Local::now().date_naive().format("%Y-%m-%d").to_string();
    let catatan_pembalik = format!(
        "Pembalik pelunasan piutang {key} tgl {tanggal_pelunasan} (jurnal asal #{old_jurnal_id})"
    );
    let reversal_jurnal_id = jurnal_tx_reverse_full(
        &tx,
        old_jurnal_id,
        &tanggal_pembalik,
        "PELUNASAN_PIUTANG_REVERSAL",
        &key,
        &catatan_pembalik,
        ts,
    )?;

    for (faktur_nomor, _jumlah) in &faktur_list {
        pelunasan_piutang_tx_unsettle_faktur(&tx, faktur_nomor, ts)?;
    }

    tx.execute("DELETE FROM pelunasan_piutang WHERE nomor = ?", params![&key])
        .map_err(|e| e.to_string())?;

    let faktur_dibuka: Vec<&str> = faktur_list.iter().map(|(n, _)| n.as_str()).collect();
    let snapshot_sebelum = serde_json::json!({
        "nomor": key,
        "tanggal": tanggal_pelunasan,
        "pelangganKode": pelanggan_kode,
        "akunKasKode": kas_kode,
        "total": total,
        "catatan": catatan,
        "jurnalId": old_jurnal_id,
        "faktur": faktur_list.iter().map(|(n, j)| serde_json::json!({"nomor": n, "jumlah": j})).collect::<Vec<_>>(),
    })
    .to_string();
    let metadata = serde_json::json!({
        "jurnalAsalId": old_jurnal_id,
        "jurnalPembalikId": reversal_jurnal_id,
        "fakturDibukaKembali": faktur_dibuka,
    })
    .to_string();
    let ringkasan = format!(
        "Hapus pelunasan piutang {key} — pelanggan {pelanggan_kode}, total {total} (jurnal pembalik #{reversal_jurnal_id}, {} faktur dibuka kembali)",
        faktur_list.len()
    );
    activity_log_record_tx(
        &tx,
        ts,
        &actor_username,
        &actor_nama,
        "DELETE",
        "PELUNASAN_PIUTANG",
        &key,
        &ringkasan,
        Some(snapshot_sebelum.as_str()),
        None,
        Some(metadata.as_str()),
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HutangBelumLunasRow {
    pub nomor: String,
    pub tanggal_faktur: String,
    pub jatuh_tempo: String,
    pub pemasok_kode: String,
    pub pemasok_nama: String,
    pub total: i64,
    pub metode_pembayaran: String,
}

#[tauri::command]
pub fn hutang_belum_lunas_list(state: State<DbState>) -> Result<Vec<HutangBelumLunasRow>, String> {
    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT p.nomor, p.tanggal_faktur, p.jatuh_tempo, p.pemasok_kode, s.nama, p.total, p.metode_pembayaran
             FROM pembelian p
             INNER JOIN pemasok s ON lower(s.kode) = lower(p.pemasok_kode)
             WHERE (p.akun_kas_kode IS NULL OR trim(p.akun_kas_kode) = '')
               AND upper(trim(p.status)) != 'LUNAS'
             ORDER BY p.jatuh_tempo ASC, p.tanggal_faktur ASC, p.nomor ASC",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(HutangBelumLunasRow {
                nomor: r.get(0)?,
                tanggal_faktur: r.get(1)?,
                jatuh_tempo: r.get(2)?,
                pemasok_kode: r.get(3)?,
                pemasok_nama: r.get(4)?,
                total: r.get(5)?,
                metode_pembayaran: r.get(6)?,
            })
        })?;
        rows.collect()
    })
}

/// Jurnal pelunasan hutang: D hutang, K kas. Mengembalikan id jurnal.
fn pelunasan_hutang_tx_post_jurnal(
    tx: &Transaction<'_>,
    tanggal: &str,
    referensi: &str,
    pemasok_kode: &str,
    jumlah: i64,
    kas_kode: &str,
    catatan_extra: &str,
    ts: i64,
) -> Result<i64, String> {
    if jumlah <= 0 {
        return Err("Jumlah pelunasan harus lebih dari 0.".into());
    }
    konfigurasi_ensure_row(tx, ts)?;
    let cfg = konfigurasi_get_row(tx)?;
    let akun_hutang = cfg
        .akun_hutang
        .ok_or_else(|| "Konfigurasi akun hutang belum diatur (Konfigurasi akun jurnal).".to_string())?;
    validate_akun_kas(tx, kas_kode)?;

    let mut catatan = format!("Pelunasan hutang faktur {referensi} — pemasok {pemasok_kode}");
    if !catatan_extra.is_empty() {
        catatan.push_str(" — ");
        catatan.push_str(catatan_extra);
    }

    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, 'PELUNASAN_HUTANG', ?, ?, ?, ?)",
        params![tanggal, referensi, catatan, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let jurnal_id = tx.last_insert_rowid();

    let lines = [(akun_hutang.as_str(), jumlah, 0_i64), (kas_kode, 0_i64, jumlah)];
    for (akun_kode, debit, kredit) in lines {
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, ?, ?, '')",
            params![jurnal_id, akun_kode, debit, kredit],
        )
        .map_err(|e| e.to_string())?;
        akun_jurnal_apply_saldo_delta(tx, akun_kode, debit, kredit, ts)?;
    }
    Ok(jurnal_id)
}

fn pelunasan_hutang_tx_save_riwayat(
    tx: &Transaction<'_>,
    pelunasan_nomor: &str,
    tanggal: &str,
    pemasok_kode: &str,
    kas_kode: &str,
    total: i64,
    catatan: &str,
    jurnal_id: i64,
    faktur_list: &[(String, i64)],
    ts: i64,
) -> Result<(), String> {
    tx.execute(
        "INSERT INTO pelunasan_hutang (nomor, tanggal, pemasok_kode, akun_kas_kode, total, catatan, jurnal_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            pelunasan_nomor,
            tanggal,
            pemasok_kode,
            kas_kode,
            total,
            catatan,
            jurnal_id,
            ts,
            ts
        ],
    )
    .map_err(|e| e.to_string())?;

    for (faktur_nomor, jumlah) in faktur_list {
        tx.execute(
            "INSERT INTO pelunasan_hutang_faktur (pelunasan_nomor, faktur_nomor, jumlah) VALUES (?, ?, ?)",
            params![pelunasan_nomor, faktur_nomor, jumlah],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn pelunasan_hutang_tx_read_faktur(
    tx: &Transaction<'_>,
    nomor: &str,
) -> Result<(String, i64), String> {
    let (pemasok_kode, total, sudah_lunas): (String, i64, bool) = tx
        .query_row(
            "SELECT pemasok_kode, total,
                    CASE WHEN akun_kas_kode IS NOT NULL AND trim(akun_kas_kode) != '' THEN 1
                         WHEN upper(trim(status)) = 'LUNAS' THEN 1 ELSE 0 END
             FROM pembelian WHERE nomor = ?",
            params![nomor],
            |r| Ok((r.get(0)?, r.get(1)?, r.get::<_, i64>(2)? != 0)),
        )
        .map_err(|_| format!("Faktur pembelian '{nomor}' tidak ditemukan."))?;
    if sudah_lunas {
        return Err(format!("Faktur '{nomor}' sudah lunas atau bukan hutang."));
    }
    Ok((pemasok_kode.trim().to_string(), total))
}

fn pelunasan_hutang_tx_mark_lunas(
    tx: &Transaction<'_>,
    nomor: &str,
    kas_kode: &str,
    ts: i64,
) -> Result<(), String> {
    tx.execute(
        "UPDATE pembelian SET akun_kas_kode = ?, status = 'Lunas', updated_at = ? WHERE nomor = ?",
        params![kas_kode, ts, nomor],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn pelunasan_hutang_tx_settle_one(
    tx: &Transaction<'_>,
    nomor: &str,
    tanggal: &str,
    kas_kode: &str,
    catatan: &str,
    ts: i64,
) -> Result<String, String> {
    let (pemasok_kode, total) = pelunasan_hutang_tx_read_faktur(tx, nomor)?;
    let pelunasan_nomor = format!("PLH-{}", ts);

    let jurnal_id = pelunasan_hutang_tx_post_jurnal(
        tx,
        tanggal,
        nomor,
        &pemasok_kode,
        total,
        kas_kode,
        catatan,
        ts,
    )?;

    pelunasan_hutang_tx_mark_lunas(tx, nomor, kas_kode, ts)?;

    pelunasan_hutang_tx_save_riwayat(
        tx,
        &pelunasan_nomor,
        tanggal,
        &pemasok_kode,
        kas_kode,
        total,
        catatan,
        jurnal_id,
        &[(nomor.to_string(), total)],
        ts,
    )?;

    Ok(pelunasan_nomor)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanHutangPayload {
    pub nomor_faktur: String,
    pub tanggal: String,
    pub kas_kode: String,
    pub jumlah: i64,
    pub catatan: String,
}

#[tauri::command]
pub fn pelunasan_hutang_apply(
    state: State<DbState>,
    payload: PelunasanHutangPayload,
) -> Result<String, String> {
    let nomor = payload.nomor_faktur.trim();
    let tanggal = payload.tanggal.trim();
    let kas_kode = payload.kas_kode.trim().to_uppercase();
    let jumlah = payload.jumlah;
    let catatan = payload.catatan.trim();

    if nomor.is_empty() {
        return Err("Nomor faktur wajib diisi.".into());
    }
    if tanggal.is_empty() {
        return Err("Tanggal pelunasan wajib diisi.".into());
    }
    NaiveDate::parse_from_str(tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if kas_kode.is_empty() {
        return Err("Pilih akun kas pembayaran.".into());
    }
    if jumlah <= 0 {
        return Err("Jumlah pelunasan harus lebih dari 0.".into());
    }

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let ts = now_ts();

    let total: i64 = tx
        .query_row(
            "SELECT total FROM pembelian WHERE nomor = ?",
            params![nomor],
            |r| r.get(0),
        )
        .map_err(|_| format!("Faktur pembelian '{nomor}' tidak ditemukan."))?;
    if jumlah != total {
        return Err(format!(
            "Pelunasan penuh diperlukan: jumlah harus sama dengan total faktur ({total})."
        ));
    }

    let pelunasan_nomor =
        pelunasan_hutang_tx_settle_one(&tx, nomor, tanggal, &kas_kode, catatan, ts)?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(pelunasan_nomor)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanHutangBatchPayload {
    pub pemasok_kode: String,
    pub tanggal: String,
    pub kas_kode: String,
    pub catatan: String,
    pub nomor_faktur: Vec<String>,
}

#[tauri::command]
pub fn pelunasan_hutang_apply_batch(
    state: State<DbState>,
    payload: PelunasanHutangBatchPayload,
) -> Result<String, String> {
    let pemasok_kode = payload.pemasok_kode.trim();
    let tanggal = payload.tanggal.trim();
    let kas_kode = payload.kas_kode.trim().to_uppercase();
    let catatan = payload.catatan.trim();
    let mut nomor_list: Vec<String> = payload
        .nomor_faktur
        .iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    nomor_list.sort();
    nomor_list.dedup();

    if pemasok_kode.is_empty() {
        return Err("Pilih pemasok.".into());
    }
    if tanggal.is_empty() {
        return Err("Tanggal pelunasan wajib diisi.".into());
    }
    NaiveDate::parse_from_str(tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if kas_kode.is_empty() {
        return Err("Pilih akun kas pembayaran.".into());
    }
    if nomor_list.is_empty() {
        return Err("Pilih minimal satu faktur hutang.".into());
    }

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let ts = now_ts();

    validate_akun_kas(&tx, &kas_kode)?;

    let mut total_jumlah: i64 = 0;
    for nomor in &nomor_list {
        let (pk, total) = pelunasan_hutang_tx_read_faktur(&tx, nomor)?;
        if pk.to_uppercase() != pemasok_kode.to_uppercase() {
            return Err(format!(
                "Faktur '{nomor}' bukan milik pemasok {pemasok_kode}."
            ));
        }
        total_jumlah = total_jumlah
            .checked_add(total)
            .ok_or_else(|| "Total pelunasan melebihi batas.".to_string())?;
    }

    let referensi = pelunasan_batch_referensi(&nomor_list);
    let mut catatan_extra = format!("faktur: {}", nomor_list.join(", "));
    if !catatan.is_empty() {
        catatan_extra.push_str(" — ");
        catatan_extra.push_str(catatan);
    }

    let jurnal_id = pelunasan_hutang_tx_post_jurnal(
        &tx,
        tanggal,
        &referensi,
        pemasok_kode,
        total_jumlah,
        &kas_kode,
        &catatan_extra,
        ts,
    )?;

    let mut faktur_jumlah: Vec<(String, i64)> = Vec::new();
    for nomor in &nomor_list {
        let total: i64 = tx
            .query_row(
                "SELECT total FROM pembelian WHERE nomor = ?",
                params![nomor],
                |r| r.get(0),
            )
            .map_err(|_| format!("Faktur '{nomor}' tidak ditemukan."))?;
        pelunasan_hutang_tx_mark_lunas(&tx, nomor, &kas_kode, ts)?;
        faktur_jumlah.push((nomor.clone(), total));
    }

    let pelunasan_nomor = format!("PLH-{}", ts);
    pelunasan_hutang_tx_save_riwayat(
        &tx,
        &pelunasan_nomor,
        tanggal,
        pemasok_kode,
        &kas_kode,
        total_jumlah,
        catatan,
        jurnal_id,
        &faktur_jumlah,
        ts,
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(pelunasan_nomor)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanHutangRiwayatRow {
    pub nomor: String,
    pub tanggal: String,
    pub pemasok_kode: String,
    pub pemasok_nama: String,
    pub akun_kas_kode: String,
    pub akun_kas_nama: String,
    pub total: i64,
    pub jumlah_faktur: i64,
    pub catatan: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanHutangFakturRow {
    pub faktur_nomor: String,
    pub tanggal_faktur: String,
    pub jatuh_tempo: String,
    pub jumlah: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PelunasanHutangDetail {
    pub nomor: String,
    pub tanggal: String,
    pub pemasok_kode: String,
    pub pemasok_nama: String,
    pub akun_kas_kode: String,
    pub akun_kas_nama: String,
    pub total: i64,
    pub catatan: String,
    pub created_at: i64,
    pub jurnal_id: Option<i64>,
    pub faktur: Vec<PelunasanHutangFakturRow>,
}

#[tauri::command]
pub fn pelunasan_hutang_riwayat_list(
    state: State<DbState>,
    tanggal_dari: String,
    tanggal_sampai: String,
) -> Result<Vec<PelunasanHutangRiwayatRow>, String> {
    let dari = tanggal_dari.trim();
    let sampai = tanggal_sampai.trim();
    let d1 = NaiveDate::parse_from_str(dari, "%Y-%m-%d")
        .map_err(|_| "Tanggal mulai tidak valid (YYYY-MM-DD).".to_string())?;
    let d2 = NaiveDate::parse_from_str(sampai, "%Y-%m-%d")
        .map_err(|_| "Tanggal akhir tidak valid (YYYY-MM-DD).".to_string())?;
    if d2 < d1 {
        return Err("Tanggal akhir tidak boleh sebelum tanggal mulai.".into());
    }

    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT ph.nomor, ph.tanggal, ph.pemasok_kode, COALESCE(s.nama, ''), ph.akun_kas_kode,
                    COALESCE(k.nama, ''), ph.total,
                    (SELECT COUNT(*) FROM pelunasan_hutang_faktur pf WHERE pf.pelunasan_nomor = ph.nomor),
                    ph.catatan, ph.created_at
             FROM pelunasan_hutang ph
             LEFT JOIN pemasok s ON lower(s.kode) = lower(ph.pemasok_kode)
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(ph.akun_kas_kode)
             WHERE ph.tanggal >= ? AND ph.tanggal <= ?
             ORDER BY ph.tanggal DESC, ph.created_at DESC, ph.nomor DESC",
        )?;
        let rows = stmt.query_map(params![dari, sampai], |r| {
            Ok(PelunasanHutangRiwayatRow {
                nomor: r.get(0)?,
                tanggal: r.get(1)?,
                pemasok_kode: r.get(2)?,
                pemasok_nama: r.get(3)?,
                akun_kas_kode: r.get(4)?,
                akun_kas_nama: r.get(5)?,
                total: r.get(6)?,
                jumlah_faktur: r.get(7)?,
                catatan: r.get(8)?,
                created_at: r.get(9)?,
            })
        })?;
        rows.collect()
    })
}

#[tauri::command]
pub fn pelunasan_hutang_riwayat_detail(
    state: State<DbState>,
    nomor: String,
) -> Result<PelunasanHutangDetail, String> {
    let key = nomor.trim();
    if key.is_empty() {
        return Err("Nomor pelunasan wajib diisi.".into());
    }

    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;

    let header: PelunasanHutangDetail = conn
        .query_row(
            "SELECT ph.nomor, ph.tanggal, ph.pemasok_kode, COALESCE(s.nama, ''), ph.akun_kas_kode,
                    COALESCE(k.nama, ''), ph.total, ph.catatan, ph.created_at, ph.jurnal_id
             FROM pelunasan_hutang ph
             LEFT JOIN pemasok s ON lower(s.kode) = lower(ph.pemasok_kode)
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(ph.akun_kas_kode)
             WHERE ph.nomor = ?",
            params![key],
            |r| {
                Ok(PelunasanHutangDetail {
                    nomor: r.get(0)?,
                    tanggal: r.get(1)?,
                    pemasok_kode: r.get(2)?,
                    pemasok_nama: r.get(3)?,
                    akun_kas_kode: r.get(4)?,
                    akun_kas_nama: r.get(5)?,
                    total: r.get(6)?,
                    catatan: r.get(7)?,
                    created_at: r.get(8)?,
                    jurnal_id: r.get(9)?,
                    faktur: Vec::new(),
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Pelunasan '{key}' tidak ditemukan."),
            _ => e.to_string(),
        })?;

    let mut stmt = conn
        .prepare(
            "SELECT pf.faktur_nomor, p.tanggal_faktur, p.jatuh_tempo, pf.jumlah
             FROM pelunasan_hutang_faktur pf
             INNER JOIN pembelian p ON p.nomor = pf.faktur_nomor
             WHERE pf.pelunasan_nomor = ?
             ORDER BY p.tanggal_faktur ASC, pf.faktur_nomor ASC",
        )
        .map_err(|e| e.to_string())?;
    let faktur = stmt
        .query_map(params![key], |r| {
            Ok(PelunasanHutangFakturRow {
                faktur_nomor: r.get(0)?,
                tanggal_faktur: r.get(1)?,
                jatuh_tempo: r.get(2)?,
                jumlah: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(PelunasanHutangDetail { faktur, ..header })
}

/// Buka faktur pembelian yang sebelumnya dilunasi: bersihkan kas + kembalikan status ke 'Dipesan'.
fn pelunasan_hutang_tx_unsettle_faktur(
    tx: &Transaction<'_>,
    nomor_faktur: &str,
    ts: i64,
) -> Result<(), String> {
    tx.execute(
        "UPDATE pembelian
         SET akun_kas_kode = NULL,
             status = 'Dipesan',
             updated_at = ?
         WHERE nomor = ?",
        params![ts, nomor_faktur],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pelunasan_hutang_delete(
    state: State<DbState>,
    nomor: String,
    actor_username: String,
    actor_nama: String,
) -> Result<(), String> {
    let key = nomor.trim().to_string();
    if key.is_empty() {
        return Err("Nomor pelunasan wajib diisi.".into());
    }
    let actor_username = actor_username.trim().to_string();
    let actor_nama = actor_nama.trim().to_string();
    if actor_username.is_empty() {
        return Err("Sesi pengguna tidak terbaca — silakan login ulang.".into());
    }

    let ts = now_ts();
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (
        tanggal_pelunasan,
        pemasok_kode,
        kas_kode,
        total,
        catatan,
        old_jurnal_id_opt,
    ): (String, String, String, i64, String, Option<i64>) = tx
        .query_row(
            "SELECT tanggal, pemasok_kode, akun_kas_kode, total, catatan, jurnal_id
             FROM pelunasan_hutang WHERE nomor = ?",
            params![&key],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Pelunasan '{key}' tidak ditemukan."),
            _ => e.to_string(),
        })?;
    let old_jurnal_id = old_jurnal_id_opt
        .ok_or_else(|| "Pelunasan ini tidak terhubung dengan jurnal asal — tidak bisa dihapus.".to_string())?;

    let mut faktur_list: Vec<(String, i64)> = Vec::new();
    {
        let mut stmt = tx
            .prepare("SELECT faktur_nomor, jumlah FROM pelunasan_hutang_faktur WHERE pelunasan_nomor = ?")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![&key], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            faktur_list.push(row.map_err(|e| e.to_string())?);
        }
    }

    // Jurnal pembalik dicatat di tanggal hari ini (saat koreksi dilakukan), bukan tanggal pelunasan asli.
    // Tujuan: muncul di periode aktif user, tidak mengubah laporan periode lampau secara retroaktif.
    let tanggal_pembalik = Local::now().date_naive().format("%Y-%m-%d").to_string();
    let catatan_pembalik = format!(
        "Pembalik pelunasan hutang {key} tgl {tanggal_pelunasan} (jurnal asal #{old_jurnal_id})"
    );
    let reversal_jurnal_id = jurnal_tx_reverse_full(
        &tx,
        old_jurnal_id,
        &tanggal_pembalik,
        "PELUNASAN_HUTANG_REVERSAL",
        &key,
        &catatan_pembalik,
        ts,
    )?;

    for (faktur_nomor, _jumlah) in &faktur_list {
        pelunasan_hutang_tx_unsettle_faktur(&tx, faktur_nomor, ts)?;
    }

    tx.execute("DELETE FROM pelunasan_hutang WHERE nomor = ?", params![&key])
        .map_err(|e| e.to_string())?;

    let faktur_dibuka: Vec<&str> = faktur_list.iter().map(|(n, _)| n.as_str()).collect();
    let snapshot_sebelum = serde_json::json!({
        "nomor": key,
        "tanggal": tanggal_pelunasan,
        "pemasokKode": pemasok_kode,
        "akunKasKode": kas_kode,
        "total": total,
        "catatan": catatan,
        "jurnalId": old_jurnal_id,
        "faktur": faktur_list.iter().map(|(n, j)| serde_json::json!({"nomor": n, "jumlah": j})).collect::<Vec<_>>(),
    })
    .to_string();
    let metadata = serde_json::json!({
        "jurnalAsalId": old_jurnal_id,
        "jurnalPembalikId": reversal_jurnal_id,
        "fakturDibukaKembali": faktur_dibuka,
    })
    .to_string();
    let ringkasan = format!(
        "Hapus pelunasan hutang {key} — pemasok {pemasok_kode}, total {total} (jurnal pembalik #{reversal_jurnal_id}, {} faktur dibuka kembali)",
        faktur_list.len()
    );
    activity_log_record_tx(
        &tx,
        ts,
        &actor_username,
        &actor_nama,
        "DELETE",
        "PELUNASAN_HUTANG",
        &key,
        &ringkasan,
        Some(snapshot_sebelum.as_str()),
        None,
        Some(metadata.as_str()),
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PengeluaranListRow {
    pub nomor: String,
    pub tanggal: String,
    pub akun_kas_kode: String,
    pub akun_kas_nama: String,
    pub total: i64,
    pub catatan: String,
    pub jumlah_baris: i64,
}

#[tauri::command]
pub fn pengeluaran_list(
    state: State<DbState>,
    tanggal_dari: String,
    tanggal_sampai: String,
) -> Result<Vec<PengeluaranListRow>, String> {
    let dari = tanggal_dari.trim();
    let sampai = tanggal_sampai.trim();
    let d1 = NaiveDate::parse_from_str(dari, "%Y-%m-%d")
        .map_err(|_| "Tanggal mulai tidak valid (YYYY-MM-DD).".to_string())?;
    let d2 = NaiveDate::parse_from_str(sampai, "%Y-%m-%d")
        .map_err(|_| "Tanggal akhir tidak valid (YYYY-MM-DD).".to_string())?;
    if d2 < d1 {
        return Err("Tanggal akhir tidak boleh sebelum tanggal mulai.".into());
    }

    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT p.nomor, p.tanggal, p.akun_kas_kode, COALESCE(k.nama, ''), p.total, p.catatan,
                    (SELECT COUNT(*) FROM pengeluaran_line pl WHERE pl.nomor = p.nomor)
             FROM pengeluaran p
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(p.akun_kas_kode)
             WHERE p.tanggal >= ? AND p.tanggal <= ?
             ORDER BY p.tanggal DESC, p.nomor DESC",
        )?;
        let rows = stmt.query_map(params![dari, sampai], |r| {
            Ok(PengeluaranListRow {
                nomor: r.get(0)?,
                tanggal: r.get(1)?,
                akun_kas_kode: r.get(2)?,
                akun_kas_nama: r.get(3)?,
                total: r.get(4)?,
                catatan: r.get(5)?,
                jumlah_baris: r.get(6)?,
            })
        })?;
        rows.collect()
    })
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PengeluaranDetailLine {
    pub id: i64,
    pub akun_kode: String,
    pub akun_nama: String,
    pub jumlah: i64,
    pub catatan: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PengeluaranDetail {
    pub nomor: String,
    pub tanggal: String,
    pub akun_kas_kode: String,
    pub akun_kas_nama: String,
    pub total: i64,
    pub catatan: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub lines: Vec<PengeluaranDetailLine>,
}

#[tauri::command]
pub fn pengeluaran_detail(state: State<DbState>, nomor: String) -> Result<PengeluaranDetail, String> {
    let key = nomor.trim();
    if key.is_empty() {
        return Err("Nomor pengeluaran wajib diisi.".into());
    }

    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;

    let header: PengeluaranDetail = conn
        .query_row(
            "SELECT p.nomor, p.tanggal, p.akun_kas_kode, COALESCE(k.nama, ''),
                    p.total, p.catatan, p.created_at, p.updated_at
             FROM pengeluaran p
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(p.akun_kas_kode)
             WHERE p.nomor = ?",
            params![key],
            |r| {
                Ok(PengeluaranDetail {
                    nomor: r.get(0)?,
                    tanggal: r.get(1)?,
                    akun_kas_kode: r.get(2)?,
                    akun_kas_nama: r.get(3)?,
                    total: r.get(4)?,
                    catatan: r.get(5)?,
                    created_at: r.get(6)?,
                    updated_at: r.get(7)?,
                    lines: Vec::new(),
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Pengeluaran '{key}' tidak ditemukan."),
            _ => e.to_string(),
        })?;

    let mut stmt = conn
        .prepare(
            "SELECT pl.id, pl.akun_kode, COALESCE(a.nama, ''), pl.jumlah, pl.catatan
             FROM pengeluaran_line pl
             LEFT JOIN akun_keuangan a ON lower(a.kode) = lower(pl.akun_kode)
             WHERE pl.nomor = ?
             ORDER BY pl.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let lines = stmt
        .query_map(params![key], |r| {
            Ok(PengeluaranDetailLine {
                id: r.get(0)?,
                akun_kode: r.get(1)?,
                akun_nama: r.get(2)?,
                jumlah: r.get(3)?,
                catatan: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(PengeluaranDetail { lines, ..header })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PengeluaranLineInput {
    pub akun_kode: String,
    pub jumlah: i64,
    pub catatan: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PengeluaranInsertPayload {
    pub tanggal: String,
    pub kas_kode: String,
    pub catatan: String,
    pub lines: Vec<PengeluaranLineInput>,
}

fn validate_akun_biaya_pengeluaran(tx: &Transaction<'_>, kode: &str) -> Result<(), String> {
    let row: (String, i64, String) = tx
        .query_row(
            "SELECT COALESCE(kelompok, ''), COALESCE(is_akun_kas, 0), COALESCE(kelompok_lr, '')
             FROM akun_keuangan WHERE lower(kode) = lower(?)",
            params![kode],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| format!("Akun biaya '{kode}' tidak ditemukan."))?;
    if row.1 != 0 {
        return Err(format!("Akun '{kode}' adalah akun kas, bukan akun biaya."));
    }
    let kelompok = row.0.to_uppercase();
    let kelompok_lr = row.2.to_uppercase();
    if kelompok != "BIAYA" && kelompok_lr != "BEBAN" && kelompok_lr != "HPP" {
        return Err(format!(
            "Akun '{kode}' bukan akun biaya/beban (pilih akun kelompok Biaya)."
        ));
    }
    Ok(())
}

/// Jurnal pengeluaran: D biaya per baris, K kas total.
fn pengeluaran_tx_post_jurnal(
    tx: &Transaction<'_>,
    tanggal: &str,
    referensi: &str,
    catatan_header: &str,
    kas_kode: &str,
    lines: &[(String, i64, String)],
    ts: i64,
) -> Result<(), String> {
    let total: i64 = lines.iter().map(|(_, j, _)| *j).sum();
    if total <= 0 {
        return Err("Total pengeluaran harus lebih dari 0.".into());
    }
    validate_akun_kas(tx, kas_kode)?;

    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, 'PENGELUARAN', ?, ?, ?, ?)",
        params![tanggal, referensi, catatan_header, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let jurnal_id = tx.last_insert_rowid();

    for (akun_kode, jumlah, line_catatan) in lines {
        validate_akun_biaya_pengeluaran(tx, akun_kode)?;
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, ?, 0, ?)",
            params![jurnal_id, akun_kode, jumlah, line_catatan],
        )
        .map_err(|e| e.to_string())?;
        akun_jurnal_apply_saldo_delta(tx, akun_kode, *jumlah, 0, ts)?;
    }

    tx.execute(
        "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
         VALUES (?, ?, 0, ?, '')",
        params![jurnal_id, kas_kode, total],
    )
    .map_err(|e| e.to_string())?;
    akun_jurnal_apply_saldo_delta(tx, kas_kode, 0, total, ts)?;
    Ok(())
}

#[tauri::command]
pub fn pengeluaran_insert(state: State<DbState>, payload: PengeluaranInsertPayload) -> Result<String, String> {
    let tanggal = payload.tanggal.trim();
    let kas_kode = payload.kas_kode.trim().to_uppercase();
    let catatan = payload.catatan.trim();

    if tanggal.is_empty() {
        return Err("Tanggal pengeluaran wajib diisi.".into());
    }
    NaiveDate::parse_from_str(tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if kas_kode.is_empty() {
        return Err("Pilih akun kas pembayaran.".into());
    }
    if payload.lines.is_empty() {
        return Err("Minimal satu baris biaya.".into());
    }

    let mut normalized: Vec<(String, i64, String)> = Vec::new();
    for line in &payload.lines {
        let akun = line.akun_kode.trim().to_uppercase();
        if akun.is_empty() {
            return Err("Setiap baris harus memilih akun biaya.".into());
        }
        let jumlah = line.jumlah;
        if jumlah <= 0 {
            return Err("Jumlah setiap baris harus lebih dari 0.".into());
        }
        normalized.push((akun, jumlah, line.catatan.trim().to_string()));
    }

    let total: i64 = normalized.iter().map(|(_, j, _)| *j).sum();
    let nomor = format!("PG-{}", Utc::now().timestamp_millis());
    let ts = now_ts();

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    validate_akun_kas(&tx, &kas_kode)?;

    tx.execute(
        "INSERT INTO pengeluaran (nomor, tanggal, akun_kas_kode, total, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![&nomor, tanggal, &kas_kode, total, catatan, ts, ts],
    )
    .map_err(|e| e.to_string())?;

    for (akun_kode, jumlah, line_catatan) in &normalized {
        validate_akun_biaya_pengeluaran(&tx, akun_kode)?;
        tx.execute(
            "INSERT INTO pengeluaran_line (nomor, akun_kode, jumlah, catatan) VALUES (?, ?, ?, ?)",
            params![&nomor, akun_kode, jumlah, line_catatan],
        )
        .map_err(|e| e.to_string())?;
    }

    let mut catatan_jurnal = format!("Pengeluaran {nomor}");
    if !catatan.is_empty() {
        catatan_jurnal.push_str(" — ");
        catatan_jurnal.push_str(catatan);
    }

    pengeluaran_tx_post_jurnal(
        &tx,
        tanggal,
        &nomor,
        &catatan_jurnal,
        &kas_kode,
        &normalized,
        ts,
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(nomor)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PenerimaanListRow {
    pub nomor: String,
    pub tanggal: String,
    pub akun_kas_kode: String,
    pub akun_kas_nama: String,
    pub total: i64,
    pub catatan: String,
    pub jumlah_baris: i64,
}

#[tauri::command]
pub fn penerimaan_list(
    state: State<DbState>,
    tanggal_dari: String,
    tanggal_sampai: String,
) -> Result<Vec<PenerimaanListRow>, String> {
    let dari = tanggal_dari.trim();
    let sampai = tanggal_sampai.trim();
    let d1 = NaiveDate::parse_from_str(dari, "%Y-%m-%d")
        .map_err(|_| "Tanggal mulai tidak valid (YYYY-MM-DD).".to_string())?;
    let d2 = NaiveDate::parse_from_str(sampai, "%Y-%m-%d")
        .map_err(|_| "Tanggal akhir tidak valid (YYYY-MM-DD).".to_string())?;
    if d2 < d1 {
        return Err("Tanggal akhir tidak boleh sebelum tanggal mulai.".into());
    }

    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT p.nomor, p.tanggal, p.akun_kas_kode, COALESCE(k.nama, ''), p.total, p.catatan,
                    (SELECT COUNT(*) FROM penerimaan_line pl WHERE pl.nomor = p.nomor)
             FROM penerimaan p
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(p.akun_kas_kode)
             WHERE p.tanggal >= ? AND p.tanggal <= ?
             ORDER BY p.tanggal DESC, p.nomor DESC",
        )?;
        let rows = stmt.query_map(params![dari, sampai], |r| {
            Ok(PenerimaanListRow {
                nomor: r.get(0)?,
                tanggal: r.get(1)?,
                akun_kas_kode: r.get(2)?,
                akun_kas_nama: r.get(3)?,
                total: r.get(4)?,
                catatan: r.get(5)?,
                jumlah_baris: r.get(6)?,
            })
        })?;
        rows.collect()
    })
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PenerimaanDetailLine {
    pub id: i64,
    pub akun_kode: String,
    pub akun_nama: String,
    pub jumlah: i64,
    pub catatan: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PenerimaanDetail {
    pub nomor: String,
    pub tanggal: String,
    pub akun_kas_kode: String,
    pub akun_kas_nama: String,
    pub total: i64,
    pub catatan: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub lines: Vec<PenerimaanDetailLine>,
}

#[tauri::command]
pub fn penerimaan_detail(state: State<DbState>, nomor: String) -> Result<PenerimaanDetail, String> {
    let key = nomor.trim();
    if key.is_empty() {
        return Err("Nomor penerimaan wajib diisi.".into());
    }

    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;

    let header: PenerimaanDetail = conn
        .query_row(
            "SELECT p.nomor, p.tanggal, p.akun_kas_kode, COALESCE(k.nama, ''),
                    p.total, p.catatan, p.created_at, p.updated_at
             FROM penerimaan p
             LEFT JOIN akun_keuangan k ON lower(k.kode) = lower(p.akun_kas_kode)
             WHERE p.nomor = ?",
            params![key],
            |r| {
                Ok(PenerimaanDetail {
                    nomor: r.get(0)?,
                    tanggal: r.get(1)?,
                    akun_kas_kode: r.get(2)?,
                    akun_kas_nama: r.get(3)?,
                    total: r.get(4)?,
                    catatan: r.get(5)?,
                    created_at: r.get(6)?,
                    updated_at: r.get(7)?,
                    lines: Vec::new(),
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => format!("Penerimaan '{key}' tidak ditemukan."),
            _ => e.to_string(),
        })?;

    let mut stmt = conn
        .prepare(
            "SELECT pl.id, pl.akun_kode, COALESCE(a.nama, ''), pl.jumlah, pl.catatan
             FROM penerimaan_line pl
             LEFT JOIN akun_keuangan a ON lower(a.kode) = lower(pl.akun_kode)
             WHERE pl.nomor = ?
             ORDER BY pl.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let lines = stmt
        .query_map(params![key], |r| {
            Ok(PenerimaanDetailLine {
                id: r.get(0)?,
                akun_kode: r.get(1)?,
                akun_nama: r.get(2)?,
                jumlah: r.get(3)?,
                catatan: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(PenerimaanDetail { lines, ..header })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PenerimaanLineInput {
    pub akun_kode: String,
    pub jumlah: i64,
    pub catatan: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PenerimaanInsertPayload {
    pub tanggal: String,
    pub kas_kode: String,
    pub catatan: String,
    pub lines: Vec<PenerimaanLineInput>,
}

fn validate_akun_penerimaan(tx: &Transaction<'_>, kode: &str) -> Result<(), String> {
    let row: (String, i64, String) = tx
        .query_row(
            "SELECT COALESCE(kelompok, ''), COALESCE(is_akun_kas, 0), COALESCE(kelompok_lr, '')
             FROM akun_keuangan WHERE lower(kode) = lower(?)",
            params![kode],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| format!("Akun penerimaan '{kode}' tidak ditemukan."))?;
    if row.1 != 0 {
        return Err(format!("Akun '{kode}' adalah akun kas, bukan akun penerimaan."));
    }
    let kelompok = row.0.to_uppercase();
    let kelompok_lr = row.2.to_uppercase();
    if kelompok != "PENDAPATAN" && kelompok_lr != "PENDAPATAN" {
        return Err(format!(
            "Akun '{kode}' bukan akun pendapatan/penerimaan (pilih akun kelompok Pendapatan)."
        ));
    }
    Ok(())
}

/// Jurnal penerimaan: D kas total, K penerimaan per baris.
fn penerimaan_tx_post_jurnal(
    tx: &Transaction<'_>,
    tanggal: &str,
    referensi: &str,
    catatan_header: &str,
    kas_kode: &str,
    lines: &[(String, i64, String)],
    ts: i64,
) -> Result<(), String> {
    let total: i64 = lines.iter().map(|(_, j, _)| *j).sum();
    if total <= 0 {
        return Err("Total penerimaan harus lebih dari 0.".into());
    }
    validate_akun_kas(tx, kas_kode)?;

    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, 'PENERIMAAN', ?, ?, ?, ?)",
        params![tanggal, referensi, catatan_header, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let jurnal_id = tx.last_insert_rowid();

    tx.execute(
        "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
         VALUES (?, ?, ?, 0, '')",
        params![jurnal_id, kas_kode, total],
    )
    .map_err(|e| e.to_string())?;
    akun_jurnal_apply_saldo_delta(tx, kas_kode, total, 0, ts)?;

    for (akun_kode, jumlah, line_catatan) in lines {
        validate_akun_penerimaan(tx, akun_kode)?;
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, 0, ?, ?)",
            params![jurnal_id, akun_kode, jumlah, line_catatan],
        )
        .map_err(|e| e.to_string())?;
        akun_jurnal_apply_saldo_delta(tx, akun_kode, 0, *jumlah, ts)?;
    }

    Ok(())
}

#[tauri::command]
pub fn penerimaan_insert(state: State<DbState>, payload: PenerimaanInsertPayload) -> Result<String, String> {
    let tanggal = payload.tanggal.trim();
    let kas_kode = payload.kas_kode.trim().to_uppercase();
    let catatan = payload.catatan.trim();

    if tanggal.is_empty() {
        return Err("Tanggal penerimaan wajib diisi.".into());
    }
    NaiveDate::parse_from_str(tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if kas_kode.is_empty() {
        return Err("Pilih akun kas penerimaan.".into());
    }
    if payload.lines.is_empty() {
        return Err("Minimal satu baris penerimaan.".into());
    }

    let mut normalized: Vec<(String, i64, String)> = Vec::new();
    for line in &payload.lines {
        let akun = line.akun_kode.trim().to_uppercase();
        if akun.is_empty() {
            return Err("Setiap baris harus memilih akun penerimaan.".into());
        }
        let jumlah = line.jumlah;
        if jumlah <= 0 {
            return Err("Jumlah setiap baris harus lebih dari 0.".into());
        }
        normalized.push((akun, jumlah, line.catatan.trim().to_string()));
    }

    let total: i64 = normalized.iter().map(|(_, j, _)| *j).sum();
    let nomor = format!("PN-{}", Utc::now().timestamp_millis());
    let ts = now_ts();

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    validate_akun_kas(&tx, &kas_kode)?;

    tx.execute(
        "INSERT INTO penerimaan (nomor, tanggal, akun_kas_kode, total, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![&nomor, tanggal, &kas_kode, total, catatan, ts, ts],
    )
    .map_err(|e| e.to_string())?;

    for (akun_kode, jumlah, line_catatan) in &normalized {
        validate_akun_penerimaan(&tx, akun_kode)?;
        tx.execute(
            "INSERT INTO penerimaan_line (nomor, akun_kode, jumlah, catatan) VALUES (?, ?, ?, ?)",
            params![&nomor, akun_kode, jumlah, line_catatan],
        )
        .map_err(|e| e.to_string())?;
    }

    let mut catatan_jurnal = format!("Penerimaan {nomor}");
    if !catatan.is_empty() {
        catatan_jurnal.push_str(" — ");
        catatan_jurnal.push_str(catatan);
    }

    penerimaan_tx_post_jurnal(
        &tx,
        tanggal,
        &nomor,
        &catatan_jurnal,
        &kas_kode,
        &normalized,
        ts,
    )?;

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
            .prepare("SELECT barang_kode, qty, satuan_tingkat FROM pembelian_line WHERE nomor = ? ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let lines = line_stmt
            .query_map(params![nomor.as_str()], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, i64>(1)?,
                    r.get::<_, u8>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        let mut line_idx = 0_i64;
        for ln in lines {
            let (kode_b, qty, satuan_tingkat) = ln.map_err(|e| e.to_string())?;
            line_idx += 1;
            pembelian_tx_apply_barang_stok(
                &tx,
                nomor.as_str(),
                kode_b.trim(),
                qty,
                satuan_tingkat,
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
pub struct StokPerGudangKolom {
    pub kode: String,
    pub nama: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BarangStokPerGudangRow {
    pub kode: String,
    pub nama: String,
    pub satuan: String,
    pub total_stok: i64,
    /// Saldo per gudang; urutan sama dengan field `gudang` pada matriks.
    pub stok_per_gudang: Vec<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StokPerGudangMatrix {
    pub gudang: Vec<StokPerGudangKolom>,
    pub barang: Vec<BarangStokPerGudangRow>,
}

#[tauri::command]
pub fn barang_stok_per_gudang_matrix(state: State<DbState>) -> Result<StokPerGudangMatrix, String> {
    with_conn(&state, |conn| {
        let gudang: Vec<StokPerGudangKolom> = conn
            .prepare("SELECT kode, nama FROM gudang ORDER BY kode COLLATE NOCASE")?
            .query_map([], |r| Ok(StokPerGudangKolom {
                kode: r.get(0)?,
                nama: r.get(1)?,
            }))?
            .collect::<Result<Vec<_>, _>>()?;

        let mut saldo_map: HashMap<(String, String), i64> = HashMap::new();
        let mut agg_stmt = conn.prepare(
            "SELECT lower(trim(barang_kode)), lower(trim(gudang_kode)),
                    COALESCE(SUM(qty_masuk), 0) - COALESCE(SUM(qty_keluar), 0)
             FROM stok_mutasi
             GROUP BY lower(trim(barang_kode)), lower(trim(gudang_kode))",
        )?;
        let agg_rows = agg_stmt.query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, i64>(2)?,
            ))
        })?;
        for row in agg_rows {
            let (barang_kode, gudang_kode, saldo) = row?;
            saldo_map.insert((barang_kode, gudang_kode), saldo);
        }

        let mut barang_stmt = conn.prepare(
            "SELECT kode, nama, satuan, COALESCE(stok, 0)
             FROM barang_jasa
             WHERE tipe = 'Barang'
             ORDER BY kode COLLATE NOCASE",
        )?;
        let barang = barang_stmt
            .query_map([], |r| {
                let kode: String = r.get(0)?;
                let nama: String = r.get(1)?;
                let satuan: String = r.get(2)?;
                let master_stok: i64 = r.get(3)?;
                let barang_key = kode.trim().to_lowercase();

                let mut stok_per_gudang: Vec<i64> = Vec::with_capacity(gudang.len());
                let mut sum_mutasi: i64 = 0;
                for g in &gudang {
                    let gudang_key = g.kode.trim().to_lowercase();
                    let qty = saldo_map
                        .get(&(barang_key.clone(), gudang_key))
                        .copied()
                        .unwrap_or(0);
                    stok_per_gudang.push(qty);
                    sum_mutasi = sum_mutasi.saturating_add(qty);
                }

                let total_stok = if sum_mutasi > 0 {
                    sum_mutasi
                } else {
                    master_stok
                };

                Ok(BarangStokPerGudangRow {
                    kode,
                    nama,
                    satuan,
                    total_stok,
                    stok_per_gudang,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(StokPerGudangMatrix { gudang, barang })
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BarangSaldoGudangRow {
    pub kode: String,
    pub nama: String,
    pub satuan: String,
    pub saldo: i64,
}

#[tauri::command]
pub fn stok_barang_di_gudang(state: State<DbState>, gudang_kode: String) -> Result<Vec<BarangSaldoGudangRow>, String> {
    let gk = gudang_kode.trim().to_string();
    if gk.is_empty() {
        return Err("Pilih gudang.".into());
    }
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM gudang WHERE lower(kode) = lower(?)",
            params![gk],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err(format!("Gudang '{gk}' tidak ditemukan."));
    }

    let mut stmt = conn
        .prepare(
            "SELECT b.kode, b.nama, b.satuan,
                    COALESCE(SUM(m.qty_masuk), 0) - COALESCE(SUM(m.qty_keluar), 0) AS saldo
             FROM barang_jasa b
             LEFT JOIN stok_mutasi m ON lower(m.barang_kode) = lower(b.kode)
                 AND lower(m.gudang_kode) = lower(?)
             WHERE b.tipe = 'Barang'
             GROUP BY b.kode, b.nama, b.satuan
             HAVING saldo > 0
             ORDER BY b.kode COLLATE NOCASE",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![gk], |r| {
            Ok(BarangSaldoGudangRow {
                kode: r.get(0)?,
                nama: r.get(1)?,
                satuan: r.get(2)?,
                saldo: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

fn stok_tx_saldo_di_gudang(
    tx: &Transaction<'_>,
    barang_kode: &str,
    gudang_kode: &str,
) -> Result<i64, String> {
    let saldo: i64 = tx
        .query_row(
            "SELECT COALESCE(SUM(qty_masuk), 0) - COALESCE(SUM(qty_keluar), 0)
             FROM stok_mutasi
             WHERE lower(trim(barang_kode)) = lower(trim(?))
               AND lower(trim(gudang_kode)) = lower(trim(?))",
            params![barang_kode, gudang_kode],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(saldo)
}

fn stok_tx_insert_mutasi_gudang(
    tx: &Transaction<'_>,
    waktu: i64,
    tanggal: &str,
    barang_kode: &str,
    gudang_kode: &str,
    jenis: &str,
    referensi: &str,
    qty_masuk: i64,
    qty_keluar: i64,
    catatan: &str,
) -> Result<(), String> {
    let saldo_sebelum = stok_tx_saldo_di_gudang(tx, barang_kode, gudang_kode)?;
    let saldo_setelah = saldo_sebelum
        .checked_add(qty_masuk)
        .and_then(|s| s.checked_sub(qty_keluar))
        .ok_or_else(|| "Perhitungan saldo gudang melimpahi batas.".to_string())?;
    if saldo_setelah < 0 {
        return Err(format!(
            "Stok tidak cukup di gudang {gudang_kode} untuk barang {barang_kode} (tersedia {saldo_sebelum}, keluar {qty_keluar})."
        ));
    }
    tx.execute(
        "INSERT INTO stok_mutasi (waktu, tanggal_transaksi, barang_kode, gudang_kode, jenis, referensi, qty_masuk, qty_keluar, saldo_setelah, catatan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            waktu,
            tanggal,
            barang_kode,
            gudang_kode,
            jenis,
            referensi,
            qty_masuk,
            qty_keluar,
            saldo_setelah,
            catatan
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MutasiAntarGudangLinePayload {
    pub barang_kode: String,
    pub qty: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MutasiAntarGudangPayload {
    pub gudang_asal: String,
    pub gudang_tujuan: String,
    pub tanggal: String,
    pub catatan: String,
    pub lines: Vec<MutasiAntarGudangLinePayload>,
}

#[tauri::command]
pub fn mutasi_antar_gudang_apply(
    state: State<DbState>,
    payload: MutasiAntarGudangPayload,
) -> Result<String, String> {
    let gudang_asal = payload.gudang_asal.trim();
    let gudang_tujuan = payload.gudang_tujuan.trim();
    let tanggal = payload.tanggal.trim();
    let catatan_header = payload.catatan.trim();

    if gudang_asal.is_empty() || gudang_tujuan.is_empty() {
        return Err("Gudang asal dan gudang tujuan wajib dipilih.".into());
    }
    if gudang_asal.eq_ignore_ascii_case(gudang_tujuan) {
        return Err("Gudang asal dan tujuan tidak boleh sama.".into());
    }
    if tanggal.is_empty() {
        return Err("Tanggal mutasi wajib diisi.".into());
    }
    NaiveDate::parse_from_str(tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (gunakan YYYY-MM-DD).".to_string())?;

    let mut lines: Vec<(String, i64)> = payload
        .lines
        .into_iter()
        .map(|l| (l.barang_kode.trim().to_string(), l.qty))
        .filter(|(k, q)| !k.is_empty() && *q > 0)
        .collect();
    if lines.is_empty() {
        return Err("Pilih minimal satu barang dengan jumlah dipindahkan.".into());
    }
    lines.sort_by(|a, b| a.0.cmp(&b.0));
    lines.dedup_by(|a, b| {
        if a.0 == b.0 {
            a.1 = a.1.saturating_add(b.1);
            true
        } else {
            false
        }
    });

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let ts = now_ts();
    let referensi = format!("MAG-{}", ts);

    for gk in [gudang_asal, gudang_tujuan] {
        let n: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM gudang WHERE lower(kode) = lower(?)",
                params![gk],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        if n == 0 {
            return Err(format!("Gudang '{gk}' tidak ditemukan."));
        }
    }

    let mut total_qty: i64 = 0;
    for (barang_kode, qty) in &lines {
        let tipe: String = tx
            .query_row(
                "SELECT tipe FROM barang_jasa WHERE lower(kode) = lower(?)",
                params![barang_kode],
                |r| r.get(0),
            )
            .map_err(|_| format!("Barang '{barang_kode}' tidak ditemukan."))?;
        if tipe != "Barang" {
            return Err(format!("'{barang_kode}' bukan tipe Barang (tidak bisa dipindahkan)."));
        }
        let saldo_asal = stok_tx_saldo_di_gudang(&tx, barang_kode, gudang_asal)?;
        if saldo_asal < *qty {
            return Err(format!(
                "Stok '{barang_kode}' di gudang asal tidak cukup (tersedia {saldo_asal}, diminta {qty})."
            ));
        }
        total_qty = total_qty
            .checked_add(*qty)
            .ok_or_else(|| "Total qty melebihi batas.".to_string())?;
    }

    let catatan_mutasi = if catatan_header.is_empty() {
        format!("Mutasi {gudang_asal} → {gudang_tujuan}")
    } else {
        format!("Mutasi {gudang_asal} → {gudang_tujuan} — {catatan_header}")
    };

    for (barang_kode, qty) in &lines {
        stok_tx_insert_mutasi_gudang(
            &tx,
            ts,
            tanggal,
            barang_kode,
            gudang_asal,
            "MUTASI_GUDANG",
            &referensi,
            0,
            *qty,
            &catatan_mutasi,
        )?;
        stok_tx_insert_mutasi_gudang(
            &tx,
            ts,
            tanggal,
            barang_kode,
            gudang_tujuan,
            "MUTASI_GUDANG",
            &referensi,
            *qty,
            0,
            &catatan_mutasi,
        )?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(referensi)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MutasiAntarGudangRiwayatRow {
    pub referensi: String,
    pub tanggal: String,
    pub gudang_asal_kode: String,
    pub gudang_asal_nama: String,
    pub gudang_tujuan_kode: String,
    pub gudang_tujuan_nama: String,
    pub catatan: String,
    pub jumlah_barang: i64,
    pub total_qty: i64,
    pub created_at: i64,
    pub baris: Vec<MutasiAntarGudangBarisRow>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MutasiAntarGudangBarisRow {
    pub barang_kode: String,
    pub barang_nama: String,
    pub satuan: String,
    pub qty: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MutasiAntarGudangDetail {
    pub referensi: String,
    pub tanggal: String,
    pub gudang_asal_kode: String,
    pub gudang_asal_nama: String,
    pub gudang_tujuan_kode: String,
    pub gudang_tujuan_nama: String,
    pub catatan: String,
    pub total_qty: i64,
    pub created_at: i64,
    pub baris: Vec<MutasiAntarGudangBarisRow>,
}

#[tauri::command]
pub fn mutasi_antar_gudang_riwayat_list(
    state: State<DbState>,
    tanggal_dari: String,
    tanggal_sampai: String,
) -> Result<Vec<MutasiAntarGudangRiwayatRow>, String> {
    let dari = tanggal_dari.trim();
    let sampai = tanggal_sampai.trim();
    let d1 = NaiveDate::parse_from_str(dari, "%Y-%m-%d")
        .map_err(|_| "Tanggal mulai tidak valid (YYYY-MM-DD).".to_string())?;
    let d2 = NaiveDate::parse_from_str(sampai, "%Y-%m-%d")
        .map_err(|_| "Tanggal akhir tidak valid (YYYY-MM-DD).".to_string())?;
    if d2 < d1 {
        return Err("Tanggal akhir tidak boleh sebelum tanggal mulai.".into());
    }

    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT m.referensi,
                    MIN(m.tanggal_transaksi),
                    MIN(m.waktu),
                    MIN(m.catatan),
                    COUNT(DISTINCT CASE WHEN m.qty_keluar > 0 THEN m.barang_kode END),
                    COALESCE(SUM(CASE WHEN m.qty_keluar > 0 THEN m.qty_keluar ELSE 0 END), 0),
                    (SELECT s.gudang_kode FROM stok_mutasi s
                     WHERE s.referensi = m.referensi AND s.qty_keluar > 0
                     ORDER BY s.id ASC LIMIT 1),
                    (SELECT COALESCE(g.nama, '') FROM stok_mutasi s
                     LEFT JOIN gudang g ON lower(g.kode) = lower(s.gudang_kode)
                     WHERE s.referensi = m.referensi AND s.qty_keluar > 0
                     ORDER BY s.id ASC LIMIT 1),
                    (SELECT s.gudang_kode FROM stok_mutasi s
                     WHERE s.referensi = m.referensi AND s.qty_masuk > 0
                     ORDER BY s.id ASC LIMIT 1),
                    (SELECT COALESCE(g.nama, '') FROM stok_mutasi s
                     LEFT JOIN gudang g ON lower(g.kode) = lower(s.gudang_kode)
                     WHERE s.referensi = m.referensi AND s.qty_masuk > 0
                     ORDER BY s.id ASC LIMIT 1)
             FROM stok_mutasi m
             WHERE upper(trim(m.jenis)) = 'MUTASI_GUDANG'
               AND m.tanggal_transaksi >= ? AND m.tanggal_transaksi <= ?
             GROUP BY m.referensi
             ORDER BY MIN(m.waktu) DESC, m.referensi DESC",
        )?;
        let mut rows: Vec<MutasiAntarGudangRiwayatRow> = stmt
            .query_map(params![dari, sampai], |r| {
                let catatan_penuh: String = r.get(3)?;
                let catatan = catatan_penuh
                    .split(" — ")
                    .nth(1)
                    .map(|s| s.trim().to_string())
                    .unwrap_or_default();
                Ok(MutasiAntarGudangRiwayatRow {
                    referensi: r.get(0)?,
                    tanggal: r.get(1)?,
                    created_at: r.get(2)?,
                    catatan,
                    jumlah_barang: r.get(4)?,
                    total_qty: r.get(5)?,
                    gudang_asal_kode: r.get(6)?,
                    gudang_asal_nama: r.get(7)?,
                    gudang_tujuan_kode: r.get(8)?,
                    gudang_tujuan_nama: r.get(9)?,
                    baris: Vec::new(),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let mut stmt_baris = conn.prepare(
            "SELECT m.referensi, m.barang_kode, b.nama, b.satuan, m.qty_keluar
             FROM stok_mutasi m
             INNER JOIN barang_jasa b ON lower(b.kode) = lower(m.barang_kode)
             WHERE upper(trim(m.jenis)) = 'MUTASI_GUDANG'
               AND m.qty_keluar > 0
               AND m.tanggal_transaksi >= ? AND m.tanggal_transaksi <= ?
             ORDER BY m.referensi, m.barang_kode COLLATE NOCASE",
        )?;
        let baris_iter = stmt_baris.query_map(params![dari, sampai], |r| {
            Ok((
                r.get::<_, String>(0)?,
                MutasiAntarGudangBarisRow {
                    barang_kode: r.get(1)?,
                    barang_nama: r.get(2)?,
                    satuan: r.get(3)?,
                    qty: r.get(4)?,
                },
            ))
        })?;

        let mut baris_by_ref: HashMap<String, Vec<MutasiAntarGudangBarisRow>> = HashMap::new();
        for item in baris_iter {
            let (referensi, baris) = item?;
            baris_by_ref.entry(referensi).or_default().push(baris);
        }

        for row in rows.iter_mut() {
            if let Some(list) = baris_by_ref.remove(&row.referensi) {
                row.baris = list;
            }
        }

        Ok(rows)
    })
}

#[tauri::command]
pub fn mutasi_antar_gudang_riwayat_detail(
    state: State<DbState>,
    referensi: String,
) -> Result<MutasiAntarGudangDetail, String> {
    let key = referensi.trim();
    if key.is_empty() {
        return Err("Referensi mutasi wajib diisi.".into());
    }

    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;

    let header: (String, String, i64, String, String, String, String, String) = conn
        .query_row(
            "SELECT m.referensi, m.tanggal_transaksi, m.waktu, m.catatan,
                    (SELECT s.gudang_kode FROM stok_mutasi s WHERE s.referensi = m.referensi AND s.qty_keluar > 0 ORDER BY s.id LIMIT 1),
                    (SELECT COALESCE(g.nama,'') FROM stok_mutasi s LEFT JOIN gudang g ON lower(g.kode)=lower(s.gudang_kode) WHERE s.referensi = m.referensi AND s.qty_keluar > 0 ORDER BY s.id LIMIT 1),
                    (SELECT s.gudang_kode FROM stok_mutasi s WHERE s.referensi = m.referensi AND s.qty_masuk > 0 ORDER BY s.id LIMIT 1),
                    (SELECT COALESCE(g.nama,'') FROM stok_mutasi s LEFT JOIN gudang g ON lower(g.kode)=lower(s.gudang_kode) WHERE s.referensi = m.referensi AND s.qty_masuk > 0 ORDER BY s.id LIMIT 1)
             FROM stok_mutasi m
             WHERE m.referensi = ? AND upper(trim(m.jenis)) = 'MUTASI_GUDANG'
             LIMIT 1",
            params![key],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?, r.get(6)?, r.get(7)?)),
        )
        .map_err(|_| format!("Mutasi '{key}' tidak ditemukan."))?;

    let catatan_penuh = header.3.clone();
    let catatan_user = catatan_penuh
        .split(" — ")
        .nth(1)
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    let mut stmt = conn
        .prepare(
            "SELECT m.barang_kode, b.nama, b.satuan, m.qty_keluar
             FROM stok_mutasi m
             INNER JOIN barang_jasa b ON lower(b.kode) = lower(m.barang_kode)
             WHERE m.referensi = ? AND upper(trim(m.jenis)) = 'MUTASI_GUDANG' AND m.qty_keluar > 0
             ORDER BY m.barang_kode COLLATE NOCASE",
        )
        .map_err(|e| e.to_string())?;
    let baris = stmt
        .query_map(params![key], |r| {
            Ok(MutasiAntarGudangBarisRow {
                barang_kode: r.get(0)?,
                barang_nama: r.get(1)?,
                satuan: r.get(2)?,
                qty: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let total_qty = baris.iter().map(|b| b.qty).sum();

    Ok(MutasiAntarGudangDetail {
        referensi: header.0,
        tanggal: header.1,
        created_at: header.2,
        catatan: catatan_user,
        gudang_asal_kode: header.4,
        gudang_asal_nama: header.5,
        gudang_tujuan_kode: header.6,
        gudang_tujuan_nama: header.7,
        total_qty,
        baris,
    })
}

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
    pub kelompok: String,
    pub kolom_norm: String,
    pub kelompok_lr: String,
    pub sub_kelompok: String,
    pub is_akun_kas: bool,
    pub saldo: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AkunKeuanganInsertPayload {
    pub kode: String,
    pub nama: String,
    pub induk_kode: Option<String>,
    pub kelompok: Option<String>,
    pub kolom_norm: Option<String>,
    pub kelompok_lr: Option<String>,
    pub sub_kelompok: Option<String>,
    pub is_akun_kas: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AkunKeuanganUpdatePayload {
    pub kode: String,
    pub nama: String,
    pub induk_kode: Option<String>,
    pub kelompok: Option<String>,
    pub kolom_norm: Option<String>,
    pub kelompok_lr: Option<String>,
    pub sub_kelompok: Option<String>,
    pub is_akun_kas: bool,
}

fn normalize_kelompok(raw: Option<&str>) -> String {
    match raw.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()) {
        Some(k)
            if matches!(
                k.as_str(),
                "AKTIVA_LANCAR"
                    | "AKTIVA_TETAP"
                    | "HUTANG_LANCAR"
                    | "HUTANG_JANGKA_PANJANG"
                    | "MODAL"
                    | "PENDAPATAN"
                    | "BIAYA"
            ) =>
        {
            k
        }
        Some(_) => String::new(),
        None => String::new(),
    }
}

fn normalize_kolom_norm(raw: Option<&str>) -> String {
    match raw.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()) {
        Some(k) if k == "D" || k == "K" => k,
        Some(_) => String::new(),
        None => String::new(),
    }
}

fn normalize_kelompok_lr(raw: Option<&str>) -> String {
    match raw.map(|s| s.trim().to_uppercase()).filter(|s| !s.is_empty()) {
        Some(k) if k == "PENDAPATAN" || k == "BEBAN" || k == "HPP" => k,
        Some(_) => String::new(),
        None => String::new(),
    }
}

fn normalize_sub_kelompok(raw: Option<&str>) -> String {
    raw.map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_default()
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

/// Perbarui saldo akun dari baris jurnal (kas & non-kas) sesuai kolom normal D/K.
fn akun_jurnal_apply_saldo_delta(
    tx: &Transaction<'_>,
    akun_kode: &str,
    debit: i64,
    kredit: i64,
    ts: i64,
) -> Result<(), String> {
    let kolom_norm: String = match tx.query_row(
        "SELECT COALESCE(NULLIF(trim(kolom_norm), ''), 'D') FROM akun_keuangan WHERE lower(kode) = lower(?)",
        params![akun_kode],
        |r| r.get(0),
    ) {
        Ok(v) => v,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };
    let delta = if kolom_norm.eq_ignore_ascii_case("K") {
        kredit - debit
    } else {
        debit - kredit
    };
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
    pub line_id: i64,
    pub jurnal_id: i64,
    pub tanggal: String,
    pub jenis: String,
    pub referensi: String,
    pub catatan: String,
    pub akun_kode: String,
    pub akun_nama: String,
    pub debit: i64,
    pub kredit: i64,
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
            "SELECT a.kode, a.nama, a.induk_kode, p.nama,
                    COALESCE(a.kelompok, ''), COALESCE(a.kolom_norm, ''),
                    COALESCE(a.kelompok_lr, ''), COALESCE(a.sub_kelompok, ''),
                    COALESCE(a.is_akun_kas, 0), COALESCE(a.saldo, 0)
             FROM akun_keuangan a
             LEFT JOIN akun_keuangan p ON lower(p.kode) = lower(a.induk_kode)
             ORDER BY
               CASE COALESCE(a.kelompok, '')
                 WHEN 'AKTIVA_LANCAR' THEN 1
                 WHEN 'AKTIVA_TETAP' THEN 2
                 WHEN 'HUTANG_LANCAR' THEN 3
                 WHEN 'HUTANG_JANGKA_PANJANG' THEN 4
                 WHEN 'MODAL' THEN 5
                 WHEN 'PENDAPATAN' THEN 6
                 WHEN 'BIAYA' THEN 7
                 ELSE 99
               END,
               a.kode COLLATE NOCASE ASC",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(AkunKeuanganRow {
                kode: r.get(0)?,
                nama: r.get(1)?,
                induk_kode: r.get(2)?,
                induk_nama: r.get(3)?,
                kelompok: r.get(4)?,
                kolom_norm: r.get(5)?,
                kelompok_lr: r.get(6)?,
                sub_kelompok: r.get(7)?,
                is_akun_kas: r.get::<_, i64>(8)? != 0,
                saldo: r.get(9)?,
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
    let kelompok = normalize_kelompok(payload.kelompok.as_deref());
    let kolom_norm = normalize_kolom_norm(payload.kolom_norm.as_deref());
    let kelompok_lr = normalize_kelompok_lr(payload.kelompok_lr.as_deref());
    let sub_kelompok = normalize_sub_kelompok(payload.sub_kelompok.as_deref());
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
        "INSERT INTO akun_keuangan (kode, nama, induk_kode, kelompok, kolom_norm, kelompok_lr, sub_kelompok, is_akun_kas, saldo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
        params![
            kode,
            nama,
            induk,
            kelompok,
            kolom_norm,
            kelompok_lr,
            sub_kelompok,
            is_kas,
            ts,
            ts
        ],
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
    let kelompok = normalize_kelompok(payload.kelompok.as_deref());
    let kolom_norm = normalize_kolom_norm(payload.kolom_norm.as_deref());
    let kelompok_lr = normalize_kelompok_lr(payload.kelompok_lr.as_deref());
    let sub_kelompok = normalize_sub_kelompok(payload.sub_kelompok.as_deref());
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
            "UPDATE akun_keuangan SET nama = ?, induk_kode = ?, kelompok = ?, kolom_norm = ?, kelompok_lr = ?, sub_kelompok = ?, is_akun_kas = ?, updated_at = ?
             WHERE lower(kode) = lower(?)",
            params![
                nama,
                induk,
                kelompok,
                kolom_norm,
                kelompok_lr,
                sub_kelompok,
                is_kas,
                ts,
                kode
            ],
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
    let kode = kode.trim();
    if kode.is_empty() {
        return Err("Kode akun wajib diisi.".into());
    }

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

    let child: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM akun_keuangan WHERE lower(induk_kode) = lower(?)",
            params![kode],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if child > 0 {
        return Err("Hapus dulu akun anak di bawah akun ini.".into());
    }

    let journal_lines: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM jurnal_umum_line WHERE lower(akun_kode) = lower(?)",
            params![kode],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if journal_lines > 0 {
        return Err("Akun sudah dipakai di jurnal umum dan tidak dapat dihapus.".into());
    }

    // Lepas referensi konfigurasi jurnal agar tidak terblokir foreign key.
    tx.execute(
        "UPDATE jurnal_konfigurasi
         SET akun_piutang = CASE WHEN lower(akun_piutang) = lower(?) THEN NULL ELSE akun_piutang END,
             akun_hutang = CASE WHEN lower(akun_hutang) = lower(?) THEN NULL ELSE akun_hutang END,
             akun_pendapatan = CASE WHEN lower(akun_pendapatan) = lower(?) THEN NULL ELSE akun_pendapatan END,
             akun_pembelian = CASE WHEN lower(akun_pembelian) = lower(?) THEN NULL ELSE akun_pembelian END,
             akun_penerimaan_lainnya = CASE WHEN lower(akun_penerimaan_lainnya) = lower(?) THEN NULL ELSE akun_penerimaan_lainnya END,
             akun_pengeluaran_lainnya = CASE WHEN lower(akun_pengeluaran_lainnya) = lower(?) THEN NULL ELSE akun_pengeluaran_lainnya END
         WHERE id = 1",
        params![kode, kode, kode, kode, kode, kode],
    )
    .map_err(|e| e.to_string())?;

    let n = tx
        .execute(
            "DELETE FROM akun_keuangan WHERE lower(kode) = lower(?)",
            params![kode],
        )
        .map_err(|e| {
            if e.to_string().contains("FOREIGN KEY") {
                "Akun masih direferensikan data lain.".to_string()
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
pub fn jurnal_umum_list(
    state: State<DbState>,
    tanggal_dari: String,
    tanggal_sampai: String,
) -> Result<Vec<JurnalUmumListRow>, String> {
    let dari = tanggal_dari.trim();
    let sampai = tanggal_sampai.trim();
    let d1 = NaiveDate::parse_from_str(dari, "%Y-%m-%d")
        .map_err(|_| "Tanggal mulai tidak valid (YYYY-MM-DD).".to_string())?;
    let d2 = NaiveDate::parse_from_str(sampai, "%Y-%m-%d")
        .map_err(|_| "Tanggal akhir tidak valid (YYYY-MM-DD).".to_string())?;
    if d2 < d1 {
        return Err("Tanggal akhir tidak boleh sebelum tanggal mulai.".into());
    }

    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT l.id, j.id, j.tanggal, j.jenis, j.referensi,
                    COALESCE(NULLIF(TRIM(l.catatan), ''), j.catatan),
                    l.akun_kode, a.nama, l.debit, l.kredit
             FROM jurnal_umum_line l
             INNER JOIN jurnal_umum j ON j.id = l.jurnal_id
             INNER JOIN akun_keuangan a ON lower(a.kode) = lower(l.akun_kode)
             WHERE j.tanggal >= ? AND j.tanggal <= ?
             ORDER BY j.tanggal DESC, j.id DESC, l.debit DESC, l.kredit DESC, l.id ASC
             LIMIT 2000",
        )?;
        let rows = stmt.query_map(params![dari, sampai], |r| {
            Ok(JurnalUmumListRow {
                line_id: r.get(0)?,
                jurnal_id: r.get(1)?,
                tanggal: r.get(2)?,
                jenis: r.get(3)?,
                referensi: r.get(4)?,
                catatan: r.get(5)?,
                akun_kode: r.get(6)?,
                akun_nama: r.get(7)?,
                debit: r.get(8)?,
                kredit: r.get(9)?,
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
        "PEMBELIAN" | "PEMBELIAN_TUNAI" => {
            let akun_pembelian = cfg
                .akun_pembelian
                .ok_or_else(|| "Konfigurasi akun pembelian belum diatur.".to_string())?;
            lines.push((akun_pembelian, jumlah, 0));
            if let Some(kas) = kas_kode {
                validate_akun_kas(&tx, &kas)?;
                lines.push((kas, 0, jumlah));
            } else if jenis == "PEMBELIAN_TUNAI" {
                return Err("Pilih akun kas untuk pembelian tunai.".into());
            } else {
                let akun_hutang = cfg
                    .akun_hutang
                    .ok_or_else(|| "Konfigurasi akun hutang belum diatur.".to_string())?;
                lines.push((akun_hutang, 0, jumlah));
            }
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JurnalManualLineInput {
    pub akun_kode: String,
    pub debit: i64,
    pub kredit: i64,
    pub catatan: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JurnalManualInsertPayload {
    pub tanggal: String,
    pub referensi: String,
    pub catatan: String,
    pub lines: Vec<JurnalManualLineInput>,
}

fn validate_akun_exists(tx: &Transaction<'_>, kode: &str) -> Result<(), String> {
    let n: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM akun_keuangan WHERE lower(kode) = lower(?)",
            params![kode],
            |r| r.get(0),
        )
        .map_err(|_| format!("Akun '{kode}' tidak ditemukan."))?;
    if n == 0 {
        return Err(format!("Akun '{kode}' tidak ditemukan."));
    }
    Ok(())
}

#[tauri::command]
pub fn jurnal_umum_insert_manual(
    state: State<DbState>,
    payload: JurnalManualInsertPayload,
) -> Result<String, String> {
    let tanggal = payload.tanggal.trim();
    let referensi = payload.referensi.trim();
    let catatan_header = payload.catatan.trim();

    if tanggal.is_empty() {
        return Err("Tanggal wajib diisi.".into());
    }
    NaiveDate::parse_from_str(tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (gunakan YYYY-MM-DD).".to_string())?;
    if referensi.is_empty() {
        return Err("Referensi wajib diisi.".into());
    }
    if payload.lines.is_empty() {
        return Err("Minimal satu baris jurnal.".into());
    }

    let mut normalized: Vec<(String, i64, i64, String)> = Vec::new();
    for line in &payload.lines {
        let akun = line.akun_kode.trim().to_uppercase();
        if akun.is_empty() {
            return Err("Setiap baris harus memilih akun.".into());
        }
        let debit = line.debit;
        let kredit = line.kredit;
        if debit < 0 || kredit < 0 {
            return Err("Nilai debit/kredit tidak boleh negatif.".into());
        }
        if (debit > 0 && kredit > 0) || (debit == 0 && kredit == 0) {
            return Err("Setiap baris hanya boleh berisi debit atau kredit (salah satu > 0).".into());
        }
        let line_catatan = line.catatan.trim();
        normalized.push((akun, debit, kredit, line_catatan.to_string()));
    }

    let total_debit: i64 = normalized.iter().map(|(_, d, _, _)| *d).sum();
    let total_kredit: i64 = normalized.iter().map(|(_, _, k, _)| *k).sum();
    if total_debit <= 0 || total_kredit <= 0 {
        return Err("Total debit dan kredit harus lebih dari 0.".into());
    }
    if total_debit != total_kredit {
        return Err(format!(
            "Jurnal tidak balance: debit {total_debit} ≠ kredit {total_kredit}."
        ));
    }

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let ts = now_ts();

    for (akun, _, _, _) in &normalized {
        validate_akun_exists(&tx, akun)?;
    }

    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, 'MANUAL', ?, ?, ?, ?)",
        params![tanggal, referensi, catatan_header, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let jurnal_id = tx.last_insert_rowid();

    for (akun_kode, debit, kredit, line_catatan) in &normalized {
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, ?, ?, ?)",
            params![jurnal_id, akun_kode, debit, kredit, line_catatan],
        )
        .map_err(|e| e.to_string())?;
        akun_kas_apply_saldo_delta(&tx, akun_kode, *debit, *kredit, ts)?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(format!("Jurnal tersimpan (ID: {}).", jurnal_id))
}

// --- Activity log (audit) -------------------------------------------------

/// Tulis satu baris audit ke `activity_log` dalam transaksi yang sama dengan operasi bisnisnya.
///
/// Best practice: panggil dari dalam transaksi `tx` yang juga melakukan perubahan data — kalau
/// salah satu gagal, semuanya rollback. Tabel ini bersifat append-only; jangan UPDATE/DELETE.
#[allow(clippy::too_many_arguments)]
fn activity_log_record_tx(
    tx: &Transaction<'_>,
    waktu: i64,
    aktor_username: &str,
    aktor_nama: &str,
    aksi: &str,
    entitas: &str,
    entitas_id: &str,
    ringkasan: &str,
    nilai_sebelum_json: Option<&str>,
    nilai_sesudah_json: Option<&str>,
    metadata_json: Option<&str>,
) -> Result<(), String> {
    tx.execute(
        "INSERT INTO activity_log (
            waktu, aktor_username, aktor_nama, aksi, entitas, entitas_id,
            ringkasan, nilai_sebelum, nilai_sesudah, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            waktu,
            aktor_username.trim(),
            aktor_nama.trim(),
            aksi.trim(),
            entitas.trim(),
            entitas_id.trim(),
            ringkasan.trim(),
            nilai_sebelum_json,
            nilai_sesudah_json,
            metadata_json,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Transfer kas ---------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransferKasListRow {
    pub nomor: String,
    pub tanggal: String,
    pub akun_sumber_kode: String,
    pub akun_sumber_nama: String,
    pub akun_tujuan_kode: String,
    pub akun_tujuan_nama: String,
    pub nominal_kirim: i64,
    pub nominal_terima: i64,
    pub biaya_transfer: i64,
    pub akun_biaya_kode: Option<String>,
    pub akun_biaya_nama: Option<String>,
    pub catatan: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferKasInsertPayload {
    pub tanggal: String,
    pub akun_sumber_kode: String,
    pub akun_tujuan_kode: String,
    pub nominal_kirim: i64,
    pub nominal_terima: i64,
    pub biaya_transfer: i64,
    pub akun_biaya_kode: Option<String>,
    pub catatan: String,
    pub actor_username: Option<String>,
    pub actor_nama: Option<String>,
}

fn validate_akun_biaya(tx: &Transaction<'_>, kode: &str) -> Result<(), String> {
    let row: (String, i64, String) = tx
        .query_row(
            "SELECT COALESCE(kelompok, ''), COALESCE(is_akun_kas, 0), COALESCE(kelompok_lr, '')
             FROM akun_keuangan WHERE lower(kode) = lower(?)",
            params![kode],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| format!("Akun biaya '{kode}' tidak ditemukan."))?;
    if row.1 != 0 {
        return Err(format!("Akun '{kode}' adalah akun kas, bukan akun biaya."));
    }
    let kelompok = row.0.to_uppercase();
    let kelompok_lr = row.2.to_uppercase();
    if kelompok != "BIAYA" && kelompok_lr != "BEBAN" && kelompok_lr != "HPP" {
        return Err(format!(
            "Akun '{kode}' bukan akun biaya (pilih akun kelompok Biaya / Beban)."
        ));
    }
    Ok(())
}

/// Hasil normalisasi & validasi payload transfer kas (dipakai insert & update).
struct TransferKasNormalized {
    tanggal: String,
    sumber: String,
    tujuan: String,
    nominal_kirim: i64,
    nominal_terima: i64,
    biaya: i64,
    akun_biaya: Option<String>,
    catatan: String,
    actor_username: String,
    actor_nama: String,
}

fn transfer_kas_validate(payload: &TransferKasInsertPayload) -> Result<TransferKasNormalized, String> {
    let tanggal = payload.tanggal.trim().to_string();
    let sumber = payload.akun_sumber_kode.trim().to_uppercase();
    let tujuan = payload.akun_tujuan_kode.trim().to_uppercase();
    let nominal_kirim = payload.nominal_kirim;
    let nominal_terima = payload.nominal_terima;
    let biaya = payload.biaya_transfer;
    let akun_biaya = payload
        .akun_biaya_kode
        .as_ref()
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());
    let catatan = payload.catatan.trim().to_string();
    let actor_username = payload
        .actor_username
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let actor_nama = payload
        .actor_nama
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();

    if tanggal.is_empty() {
        return Err("Tanggal transfer wajib diisi.".into());
    }
    NaiveDate::parse_from_str(&tanggal, "%Y-%m-%d")
        .map_err(|_| "Tanggal tidak valid (YYYY-MM-DD).".to_string())?;
    if sumber.is_empty() || tujuan.is_empty() {
        return Err("Pilih akun kas sumber dan tujuan.".into());
    }
    if sumber == tujuan {
        return Err("Akun kas sumber dan tujuan tidak boleh sama.".into());
    }
    if nominal_kirim <= 0 || nominal_terima <= 0 {
        return Err("Nominal kirim & terima harus lebih dari 0.".into());
    }
    if biaya < 0 {
        return Err("Biaya transfer tidak boleh negatif.".into());
    }
    if biaya > 0 && akun_biaya.is_none() {
        return Err("Pilih akun biaya untuk mencatat biaya transfer.".into());
    }
    let kirim_check = nominal_terima
        .checked_add(biaya)
        .ok_or_else(|| "Nominal melebihi batas perhitungan.".to_string())?;
    if kirim_check != nominal_kirim {
        return Err(format!(
            "Nominal tidak balance: kirim ({}) harus = terima ({}) + biaya ({}).",
            nominal_kirim, nominal_terima, biaya
        ));
    }
    if actor_username.is_empty() {
        return Err("Sesi pengguna tidak terbaca — silakan login ulang.".into());
    }

    Ok(TransferKasNormalized {
        tanggal,
        sumber,
        tujuan,
        nominal_kirim,
        nominal_terima,
        biaya,
        akun_biaya,
        catatan,
        actor_username,
        actor_nama,
    })
}

/// Posting jurnal transfer kas — dipakai untuk insert maupun jurnal baru saat update.
#[allow(clippy::too_many_arguments)]
fn transfer_kas_tx_post_jurnal(
    tx: &Transaction<'_>,
    tanggal: &str,
    nomor: &str,
    sumber: &str,
    tujuan: &str,
    nominal_kirim: i64,
    nominal_terima: i64,
    biaya: i64,
    akun_biaya: Option<&str>,
    catatan: &str,
    ts: i64,
) -> Result<i64, String> {
    let catatan_jurnal = if catatan.is_empty() {
        format!("Transfer {} → {} ({})", sumber, tujuan, nomor)
    } else {
        format!("Transfer {} → {} — {}", sumber, tujuan, catatan)
    };
    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, 'TRANSFER', ?, ?, ?, ?)",
        params![tanggal, nomor, &catatan_jurnal, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let jurnal_id = tx.last_insert_rowid();

    let mut lines: Vec<(String, i64, i64)> = Vec::with_capacity(3);
    lines.push((tujuan.to_string(), nominal_terima, 0));
    if biaya > 0 {
        if let Some(b) = akun_biaya {
            lines.push((b.to_string(), biaya, 0));
        }
    }
    lines.push((sumber.to_string(), 0, nominal_kirim));

    for (akun_kode, debit, kredit) in &lines {
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, ?, ?, '')",
            params![jurnal_id, akun_kode, debit, kredit],
        )
        .map_err(|e| e.to_string())?;
        akun_jurnal_apply_saldo_delta(tx, akun_kode, *debit, *kredit, ts)?;
    }

    Ok(jurnal_id)
}

/// Bangun jurnal pembalik untuk satu jurnal lama (D↔K dibalik). Saldo akun ikut dibalikkan.
/// Jurnal lama TIDAK dihapus — jejak audit tetap.
///
/// Dipakai oleh transfer kas, pelunasan piutang/hutang, dst.
fn jurnal_tx_reverse_full(
    tx: &Transaction<'_>,
    old_jurnal_id: i64,
    tanggal: &str,
    jenis_pembalik: &str,
    referensi: &str,
    catatan: &str,
    ts: i64,
) -> Result<i64, String> {
    let mut old_lines: Vec<(String, i64, i64)> = Vec::new();
    {
        let mut stmt = tx
            .prepare(
                "SELECT akun_kode, debit, kredit FROM jurnal_umum_line WHERE jurnal_id = ? ORDER BY id ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![old_jurnal_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, i64>(1)?,
                    r.get::<_, i64>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?;
        for r in rows {
            old_lines.push(r.map_err(|e| e.to_string())?);
        }
    }
    if old_lines.is_empty() {
        return Err("Jurnal asal tidak punya baris — tidak bisa dibalik.".into());
    }

    tx.execute(
        "INSERT INTO jurnal_umum (tanggal, jenis, referensi, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)",
        params![tanggal, jenis_pembalik, referensi, catatan, ts, ts],
    )
    .map_err(|e| e.to_string())?;
    let rev_id = tx.last_insert_rowid();

    for (akun_kode, debit, kredit) in &old_lines {
        let new_debit = *kredit;
        let new_kredit = *debit;
        tx.execute(
            "INSERT INTO jurnal_umum_line (jurnal_id, akun_kode, debit, kredit, catatan)
             VALUES (?, ?, ?, ?, '')",
            params![rev_id, akun_kode, new_debit, new_kredit],
        )
        .map_err(|e| e.to_string())?;
        akun_jurnal_apply_saldo_delta(tx, akun_kode, new_debit, new_kredit, ts)?;
    }

    Ok(rev_id)
}

/// Alias spesifik untuk transfer kas (jenis & catatan baku).
fn transfer_kas_tx_reverse_old_jurnal(
    tx: &Transaction<'_>,
    old_jurnal_id: i64,
    tanggal: &str,
    nomor: &str,
    ts: i64,
) -> Result<i64, String> {
    let catatan = format!("Pembalik transfer {} (jurnal asal #{old_jurnal_id})", nomor);
    jurnal_tx_reverse_full(tx, old_jurnal_id, tanggal, "TRANSFER_REVERSAL", nomor, &catatan, ts)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TransferKasDetail {
    pub nomor: String,
    pub tanggal: String,
    pub akun_sumber_kode: String,
    pub akun_sumber_nama: String,
    pub akun_tujuan_kode: String,
    pub akun_tujuan_nama: String,
    pub nominal_kirim: i64,
    pub nominal_terima: i64,
    pub biaya_transfer: i64,
    pub akun_biaya_kode: Option<String>,
    pub akun_biaya_nama: Option<String>,
    pub catatan: String,
    pub jurnal_id: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub fn transfer_kas_detail(state: State<DbState>, nomor: String) -> Result<TransferKasDetail, String> {
    let n = nomor.trim();
    if n.is_empty() {
        return Err("Nomor transfer wajib diisi.".into());
    }
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let detail = conn
        .query_row(
            "SELECT t.nomor, t.tanggal,
                    t.akun_sumber_kode, COALESCE(s.nama, ''),
                    t.akun_tujuan_kode, COALESCE(d.nama, ''),
                    t.nominal_kirim, t.nominal_terima, t.biaya_transfer,
                    t.akun_biaya_kode, b.nama,
                    t.catatan, t.jurnal_id, t.created_at, t.updated_at
             FROM transfer_kas t
             LEFT JOIN akun_keuangan s ON lower(s.kode) = lower(t.akun_sumber_kode)
             LEFT JOIN akun_keuangan d ON lower(d.kode) = lower(t.akun_tujuan_kode)
             LEFT JOIN akun_keuangan b ON lower(b.kode) = lower(t.akun_biaya_kode)
             WHERE t.nomor = ?",
            params![n],
            |r| {
                Ok(TransferKasDetail {
                    nomor: r.get(0)?,
                    tanggal: r.get(1)?,
                    akun_sumber_kode: r.get(2)?,
                    akun_sumber_nama: r.get(3)?,
                    akun_tujuan_kode: r.get(4)?,
                    akun_tujuan_nama: r.get(5)?,
                    nominal_kirim: r.get(6)?,
                    nominal_terima: r.get(7)?,
                    biaya_transfer: r.get(8)?,
                    akun_biaya_kode: r.get(9)?,
                    akun_biaya_nama: r.get(10)?,
                    catatan: r.get(11)?,
                    jurnal_id: r.get(12)?,
                    created_at: r.get(13)?,
                    updated_at: r.get(14)?,
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => "Transfer tidak ditemukan.".into(),
            _ => e.to_string(),
        })?;
    Ok(detail)
}

#[tauri::command]
pub fn transfer_kas_list(
    state: State<DbState>,
    tanggal_dari: String,
    tanggal_sampai: String,
) -> Result<Vec<TransferKasListRow>, String> {
    let dari = tanggal_dari.trim();
    let sampai = tanggal_sampai.trim();
    let d1 = NaiveDate::parse_from_str(dari, "%Y-%m-%d")
        .map_err(|_| "Tanggal mulai tidak valid (YYYY-MM-DD).".to_string())?;
    let d2 = NaiveDate::parse_from_str(sampai, "%Y-%m-%d")
        .map_err(|_| "Tanggal akhir tidak valid (YYYY-MM-DD).".to_string())?;
    if d2 < d1 {
        return Err("Tanggal akhir tidak boleh sebelum tanggal mulai.".into());
    }

    with_conn(&state, |conn| {
        let mut stmt = conn.prepare(
            "SELECT t.nomor, t.tanggal,
                    t.akun_sumber_kode, COALESCE(s.nama, ''),
                    t.akun_tujuan_kode, COALESCE(d.nama, ''),
                    t.nominal_kirim, t.nominal_terima, t.biaya_transfer,
                    t.akun_biaya_kode, b.nama,
                    t.catatan
             FROM transfer_kas t
             LEFT JOIN akun_keuangan s ON lower(s.kode) = lower(t.akun_sumber_kode)
             LEFT JOIN akun_keuangan d ON lower(d.kode) = lower(t.akun_tujuan_kode)
             LEFT JOIN akun_keuangan b ON lower(b.kode) = lower(t.akun_biaya_kode)
             WHERE t.tanggal >= ? AND t.tanggal <= ?
             ORDER BY t.tanggal DESC, t.nomor DESC",
        )?;
        let rows = stmt.query_map(params![dari, sampai], |r| {
            Ok(TransferKasListRow {
                nomor: r.get(0)?,
                tanggal: r.get(1)?,
                akun_sumber_kode: r.get(2)?,
                akun_sumber_nama: r.get(3)?,
                akun_tujuan_kode: r.get(4)?,
                akun_tujuan_nama: r.get(5)?,
                nominal_kirim: r.get(6)?,
                nominal_terima: r.get(7)?,
                biaya_transfer: r.get(8)?,
                akun_biaya_kode: r.get(9)?,
                akun_biaya_nama: r.get(10)?,
                catatan: r.get(11)?,
            })
        })?;
        rows.collect()
    })
}

#[tauri::command]
pub fn transfer_kas_insert(
    state: State<DbState>,
    payload: TransferKasInsertPayload,
) -> Result<String, String> {
    let n = transfer_kas_validate(&payload)?;

    let nomor = format!("TRF-{}", Utc::now().timestamp_millis());
    let ts = now_ts();

    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    validate_akun_kas(&tx, &n.sumber)?;
    validate_akun_kas(&tx, &n.tujuan)?;
    if let Some(b) = n.akun_biaya.as_deref() {
        validate_akun_biaya(&tx, b)?;
    }

    tx.execute(
        "INSERT INTO transfer_kas (
            nomor, tanggal, akun_sumber_kode, akun_tujuan_kode,
            nominal_kirim, nominal_terima, biaya_transfer, akun_biaya_kode,
            catatan, jurnal_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)",
        params![
            &nomor,
            &n.tanggal,
            &n.sumber,
            &n.tujuan,
            n.nominal_kirim,
            n.nominal_terima,
            n.biaya,
            n.akun_biaya.as_deref(),
            &n.catatan,
            ts,
            ts,
        ],
    )
    .map_err(|e| e.to_string())?;

    let jurnal_id = transfer_kas_tx_post_jurnal(
        &tx,
        &n.tanggal,
        &nomor,
        &n.sumber,
        &n.tujuan,
        n.nominal_kirim,
        n.nominal_terima,
        n.biaya,
        n.akun_biaya.as_deref(),
        &n.catatan,
        ts,
    )?;

    tx.execute(
        "UPDATE transfer_kas SET jurnal_id = ?, updated_at = ? WHERE nomor = ?",
        params![jurnal_id, ts, &nomor],
    )
    .map_err(|e| e.to_string())?;

    let snapshot_sesudah = serde_json::json!({
        "nomor": nomor,
        "tanggal": n.tanggal,
        "akunSumberKode": n.sumber,
        "akunTujuanKode": n.tujuan,
        "nominalKirim": n.nominal_kirim,
        "nominalTerima": n.nominal_terima,
        "biayaTransfer": n.biaya,
        "akunBiayaKode": n.akun_biaya,
        "catatan": n.catatan,
        "jurnalId": jurnal_id,
    })
    .to_string();
    let ringkasan = format!(
        "Transfer kas {} dari {} ke {} senilai {} (biaya {})",
        nomor, n.sumber, n.tujuan, n.nominal_kirim, n.biaya
    );
    activity_log_record_tx(
        &tx,
        ts,
        &n.actor_username,
        &n.actor_nama,
        "CREATE",
        "TRANSFER_KAS",
        &nomor,
        &ringkasan,
        None,
        Some(snapshot_sesudah.as_str()),
        None,
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(nomor)
}

#[tauri::command]
pub fn transfer_kas_update(
    state: State<DbState>,
    nomor: String,
    payload: TransferKasInsertPayload,
) -> Result<(), String> {
    let nomor_trim = nomor.trim().to_string();
    if nomor_trim.is_empty() {
        return Err("Nomor transfer tidak valid.".into());
    }
    let n = transfer_kas_validate(&payload)?;

    let ts = now_ts();
    let mut conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let old: (
        String,
        String,
        String,
        i64,
        i64,
        i64,
        Option<String>,
        String,
        Option<i64>,
    ) = tx
        .query_row(
            "SELECT tanggal, akun_sumber_kode, akun_tujuan_kode,
                    nominal_kirim, nominal_terima, biaya_transfer,
                    akun_biaya_kode, catatan, jurnal_id
             FROM transfer_kas WHERE nomor = ?",
            params![&nomor_trim],
            |r| {
                Ok((
                    r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?, r.get(6)?,
                    r.get(7)?, r.get(8)?,
                ))
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => "Transfer tidak ditemukan.".into(),
            _ => e.to_string(),
        })?;

    let (
        old_tanggal,
        old_sumber,
        old_tujuan,
        old_nominal_kirim,
        old_nominal_terima,
        old_biaya,
        old_akun_biaya,
        old_catatan,
        old_jurnal_id_opt,
    ) = old;
    let old_jurnal_id = old_jurnal_id_opt
        .ok_or_else(|| "Transfer ini tidak terhubung dengan jurnal asal — tidak bisa diedit.".to_string())?;

    validate_akun_kas(&tx, &n.sumber)?;
    validate_akun_kas(&tx, &n.tujuan)?;
    if let Some(b) = n.akun_biaya.as_deref() {
        validate_akun_biaya(&tx, b)?;
    }

    // 1. Jurnal pembalik untuk jurnal asal.
    let reversal_jurnal_id =
        transfer_kas_tx_reverse_old_jurnal(&tx, old_jurnal_id, &n.tanggal, &nomor_trim, ts)?;

    // 2. Jurnal baru dengan nilai terbaru.
    let new_jurnal_id = transfer_kas_tx_post_jurnal(
        &tx,
        &n.tanggal,
        &nomor_trim,
        &n.sumber,
        &n.tujuan,
        n.nominal_kirim,
        n.nominal_terima,
        n.biaya,
        n.akun_biaya.as_deref(),
        &n.catatan,
        ts,
    )?;

    // 3. Update header transfer_kas — pakai jurnal_id terbaru.
    tx.execute(
        "UPDATE transfer_kas
         SET tanggal = ?, akun_sumber_kode = ?, akun_tujuan_kode = ?,
             nominal_kirim = ?, nominal_terima = ?, biaya_transfer = ?,
             akun_biaya_kode = ?, catatan = ?, jurnal_id = ?, updated_at = ?
         WHERE nomor = ?",
        params![
            &n.tanggal,
            &n.sumber,
            &n.tujuan,
            n.nominal_kirim,
            n.nominal_terima,
            n.biaya,
            n.akun_biaya.as_deref(),
            &n.catatan,
            new_jurnal_id,
            ts,
            &nomor_trim,
        ],
    )
    .map_err(|e| e.to_string())?;

    // 4. Audit log: aksi=UPDATE, snapshot lama vs baru.
    let snapshot_sebelum = serde_json::json!({
        "nomor": nomor_trim,
        "tanggal": old_tanggal,
        "akunSumberKode": old_sumber,
        "akunTujuanKode": old_tujuan,
        "nominalKirim": old_nominal_kirim,
        "nominalTerima": old_nominal_terima,
        "biayaTransfer": old_biaya,
        "akunBiayaKode": old_akun_biaya,
        "catatan": old_catatan,
        "jurnalId": old_jurnal_id,
    })
    .to_string();
    let snapshot_sesudah = serde_json::json!({
        "nomor": nomor_trim,
        "tanggal": n.tanggal,
        "akunSumberKode": n.sumber,
        "akunTujuanKode": n.tujuan,
        "nominalKirim": n.nominal_kirim,
        "nominalTerima": n.nominal_terima,
        "biayaTransfer": n.biaya,
        "akunBiayaKode": n.akun_biaya,
        "catatan": n.catatan,
        "jurnalId": new_jurnal_id,
    })
    .to_string();
    let metadata = serde_json::json!({
        "jurnalAsalId": old_jurnal_id,
        "jurnalPembalikId": reversal_jurnal_id,
        "jurnalBaruId": new_jurnal_id,
    })
    .to_string();
    let ringkasan = format!(
        "Edit transfer kas {} (jurnal asal #{old_jurnal_id}, pembalik #{reversal_jurnal_id}, baru #{new_jurnal_id})",
        nomor_trim
    );
    activity_log_record_tx(
        &tx,
        ts,
        &n.actor_username,
        &n.actor_nama,
        "UPDATE",
        "TRANSFER_KAS",
        &nomor_trim,
        &ringkasan,
        Some(snapshot_sebelum.as_str()),
        Some(snapshot_sesudah.as_str()),
        Some(metadata.as_str()),
    )?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

// --- HPP (moving average) ------------------------------------------------
//
// Konsep
// ------
// HPP per barang dihitung dengan metode **moving average (rata-rata
// bergerak)** secara global per item (digabung lintas gudang). Setiap
// pembelian merekalkulasi HPP:
//
//   hpp_baru = (stok_lama * hpp_lama + qty_masuk * harga_beli_per_unit) /
//              (stok_lama + qty_masuk)
//
// Penjualan dan mutasi antar gudang TIDAK mengubah HPP — hanya mengubah
// posisi stok. Pendekatan "global per item" dipilih karena standar &
// paling familiar untuk laporan keuangan HPP; kalau di masa depan butuh
// HPP per gudang, hitungan dapat dipindah ke key (barang_kode, gudang_kode).
//
// Sumber data
// -----------
// - `stok_mutasi`  : timeline event stok per barang (kronologis).
// - `pembelian_line.subtotal`  : nilai bersih (net diskon line) per baris
//   faktur. `subtotal / qty_smallest` = harga beli per satuan terkecil.
//   Catatan: belum prorata diskon faktur & pajak — bisa di-refine nanti.

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HppListRow {
    pub kode: String,
    pub nama: String,
    pub satuan: String,
    pub stok: i64,
    /// HPP per satuan terkecil (Rp), dibulatkan ke integer.
    pub hpp: i64,
    /// Total nilai persediaan (Rp) = stok × hpp (kurang lebih).
    pub total_nilai: i64,
    /// Jumlah event yang pernah mempengaruhi HPP (info ringan untuk UI).
    pub jumlah_event: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HppHistoryEvent {
    pub waktu: i64,
    pub tanggal_transaksi: String,
    pub jenis: String,
    pub referensi: String,
    pub gudang_kode: String,
    pub gudang_nama: String,
    pub qty_masuk: i64,
    pub qty_keluar: i64,
    /// Harga beli per satuan terkecil (Rp) — hanya untuk jenis PEMBELIAN.
    pub harga_satuan_beli: Option<i64>,
    /// Nilai event (Rp): + untuk masuk (qty × harga), − untuk keluar (qty × hpp_saat_itu).
    pub nilai_event: i64,
    pub stok_setelah: i64,
    pub hpp_setelah: i64,
    pub total_nilai_setelah: i64,
    pub catatan: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HppDetail {
    pub kode: String,
    pub nama: String,
    pub satuan: String,
    pub stok_akhir: i64,
    pub hpp_akhir: i64,
    pub total_nilai_akhir: i64,
    pub events: Vec<HppHistoryEvent>,
}

/// State internal saat replay event per barang.
struct HppState {
    stok: i64,
    /// Total nilai persediaan (Rp). Disimpan presisi tinggi (i128) untuk
    /// menghindari error akumulasi saat banyak event.
    total_nilai: i128,
}

impl HppState {
    fn new() -> Self {
        Self {
            stok: 0,
            total_nilai: 0,
        }
    }

    fn hpp(&self) -> i64 {
        if self.stok <= 0 {
            0
        } else {
            (self.total_nilai / self.stok as i128) as i64
        }
    }
}

/// Ambil mapping `(referensi, barang_kode) -> subtotal` pembelian sekali muat
/// untuk hindari N+1 query saat replay banyak event.
fn hpp_load_pembelian_subtotals(
    conn: &Connection,
    barang_kode: Option<&str>,
) -> Result<HashMap<(String, String), i64>, String> {
    let mut map: HashMap<(String, String), i64> = HashMap::new();
    if let Some(kode) = barang_kode {
        let mut stmt = conn
            .prepare(
                "SELECT nomor, barang_kode, subtotal FROM pembelian_line WHERE lower(barang_kode) = lower(?)",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![kode], |r| {
                let nomor: String = r.get(0)?;
                let barang: String = r.get(1)?;
                let sub: i64 = r.get(2)?;
                Ok((nomor, barang, sub))
            })
            .map_err(|e| e.to_string())?;
        for r in rows {
            let (nomor, barang, sub) = r.map_err(|e| e.to_string())?;
            map.entry((nomor.to_uppercase(), barang.to_uppercase()))
                .and_modify(|v| *v += sub)
                .or_insert(sub);
        }
    } else {
        let mut stmt = conn
            .prepare("SELECT nomor, barang_kode, subtotal FROM pembelian_line")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |r| {
                let nomor: String = r.get(0)?;
                let barang: String = r.get(1)?;
                let sub: i64 = r.get(2)?;
                Ok((nomor, barang, sub))
            })
            .map_err(|e| e.to_string())?;
        for r in rows {
            let (nomor, barang, sub) = r.map_err(|e| e.to_string())?;
            map.entry((nomor.to_uppercase(), barang.to_uppercase()))
                .and_modify(|v| *v += sub)
                .or_insert(sub);
        }
    }
    Ok(map)
}

/// Replay satu event ke state HPP. Mengembalikan info event yang sudah
/// terdekorasi (harga_satuan_beli, nilai_event, snapshot setelah).
#[allow(clippy::too_many_arguments)]
fn hpp_apply_event(
    state: &mut HppState,
    waktu: i64,
    tanggal: &str,
    jenis_raw: &str,
    referensi: &str,
    gudang_kode: &str,
    gudang_nama: &str,
    qty_masuk: i64,
    qty_keluar: i64,
    catatan: &str,
    pembelian_subtotal_map: &HashMap<(String, String), i64>,
    barang_kode: &str,
) -> HppHistoryEvent {
    let jenis = jenis_raw.trim().to_uppercase();
    let mut harga_satuan_beli: Option<i64> = None;
    let mut nilai_event: i64 = 0;

    match jenis.as_str() {
        "PEMBELIAN" | "PEMBELIAN_TUNAI" => {
            if qty_masuk > 0 {
                let key = (
                    referensi.trim().to_uppercase(),
                    barang_kode.trim().to_uppercase(),
                );
                if let Some(sub) = pembelian_subtotal_map.get(&key) {
                    let harga_per_unit = sub / qty_masuk; // round-down jika tidak habis
                    harga_satuan_beli = Some(harga_per_unit);
                    // Pakai subtotal asli untuk akurasi nilai_event (hindari
                    // pembulatan harga_per_unit × qty).
                    state.total_nilai += *sub as i128;
                    state.stok += qty_masuk;
                    nilai_event = *sub;
                } else {
                    // Pembelian line tidak ketemu (kemungkinan data lama /
                    // sudah dihapus) — fallback pakai 0, biar saldo tetap konsisten.
                    state.stok += qty_masuk;
                }
            }
        }
        "PENJUALAN" | "PENJUALAN_TUNAI" => {
            if qty_keluar > 0 {
                let hpp_saat_ini = state.hpp();
                let nilai_keluar = (qty_keluar as i128) * (hpp_saat_ini as i128);
                state.total_nilai -= nilai_keluar;
                state.stok -= qty_keluar;
                nilai_event = -(nilai_keluar as i64);
            }
        }
        "MUTASI_GUDANG" => {
            // Per-item agnostik gudang: mutasi antar gudang netral terhadap
            // total stok & nilai (qty keluar di sumber + qty masuk di tujuan
            // = 0). Tetap dicatat di histori untuk transparansi.
            nilai_event = 0;
        }
        _ => {
            // Jenis lain (ADJUSTMENT, dst.): perlakukan masuk/keluar tanpa
            // mengubah HPP — masuk dengan asumsi pakai HPP sekarang
            // (opening-like), keluar dengan HPP sekarang (sale-like).
            let hpp_saat_ini = state.hpp();
            if qty_masuk > 0 {
                let nilai_masuk = (qty_masuk as i128) * (hpp_saat_ini as i128);
                state.total_nilai += nilai_masuk;
                state.stok += qty_masuk;
                nilai_event = nilai_masuk as i64;
            } else if qty_keluar > 0 {
                let nilai_keluar = (qty_keluar as i128) * (hpp_saat_ini as i128);
                state.total_nilai -= nilai_keluar;
                state.stok -= qty_keluar;
                nilai_event = -(nilai_keluar as i64);
            }
        }
    }

    HppHistoryEvent {
        waktu,
        tanggal_transaksi: tanggal.to_string(),
        jenis: jenis_raw.to_string(),
        referensi: referensi.to_string(),
        gudang_kode: gudang_kode.to_string(),
        gudang_nama: gudang_nama.to_string(),
        qty_masuk,
        qty_keluar,
        harga_satuan_beli,
        nilai_event,
        stok_setelah: state.stok,
        hpp_setelah: state.hpp(),
        total_nilai_setelah: state.total_nilai as i64,
        catatan: catatan.to_string(),
    }
}

#[tauri::command]
pub fn barang_hpp_list(state: State<DbState>) -> Result<Vec<HppListRow>, String> {
    with_conn_app(&state, |conn| {
        // 1. Ambil semua barang tipe "Barang" (skip Jasa — tidak punya stok).
        let mut stmt = conn
            .prepare(
                "SELECT kode, nama, satuan FROM barang_jasa WHERE tipe = 'Barang' ORDER BY kode COLLATE NOCASE",
            )
            .map_err(|e| e.to_string())?;
        let barangs: Vec<(String, String, String)> = stmt
            .query_map([], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // 2. Preload semua subtotal pembelian sekali (hindari N+1 query).
        let pembelian_map = hpp_load_pembelian_subtotals(conn, None)?;

        // 3. Replay event per barang & ambil snapshot akhir.
        let mut result: Vec<HppListRow> = Vec::with_capacity(barangs.len());
        let mut event_stmt = conn
            .prepare(
                "SELECT waktu, tanggal_transaksi, jenis, referensi, gudang_kode, qty_masuk, qty_keluar, catatan
                 FROM stok_mutasi
                 WHERE lower(barang_kode) = lower(?)
                 ORDER BY waktu ASC, id ASC",
            )
            .map_err(|e| e.to_string())?;

        for (kode, nama, satuan) in barangs {
            let mut state_hpp = HppState::new();
            let mut jumlah_event: i64 = 0;
            let rows = event_stmt
                .query_map(params![&kode], |r| {
                    Ok((
                        r.get::<_, i64>(0)?,
                        r.get::<_, String>(1)?,
                        r.get::<_, String>(2)?,
                        r.get::<_, String>(3)?,
                        r.get::<_, String>(4)?,
                        r.get::<_, i64>(5)?,
                        r.get::<_, i64>(6)?,
                        r.get::<_, String>(7)?,
                    ))
                })
                .map_err(|e| e.to_string())?;
            for r in rows {
                let (waktu, tanggal, jenis, referensi, gudang_kode, qm, qk, catatan) =
                    r.map_err(|e| e.to_string())?;
                hpp_apply_event(
                    &mut state_hpp,
                    waktu,
                    &tanggal,
                    &jenis,
                    &referensi,
                    &gudang_kode,
                    "",
                    qm,
                    qk,
                    &catatan,
                    &pembelian_map,
                    &kode,
                );
                jumlah_event += 1;
            }
            result.push(HppListRow {
                kode,
                nama,
                satuan,
                stok: state_hpp.stok,
                hpp: state_hpp.hpp(),
                total_nilai: state_hpp.total_nilai as i64,
                jumlah_event,
            });
        }

        Ok(result)
    })
}

#[tauri::command]
pub fn barang_hpp_detail(state: State<DbState>, kode: String) -> Result<HppDetail, String> {
    let kode = kode.trim().to_string();
    if kode.is_empty() {
        return Err("Kode barang wajib diisi.".into());
    }
    with_conn_app(&state, |conn| {
        // 1. Validasi barang ada & tipe Barang.
        let (kode_db, nama, satuan, tipe): (String, String, String, String) = conn
            .query_row(
                "SELECT kode, nama, satuan, tipe FROM barang_jasa WHERE lower(kode) = lower(?)",
                params![&kode],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .map_err(|_| "Barang tidak ditemukan.".to_string())?;
        if tipe != "Barang" {
            return Err(
                "HPP hanya berlaku untuk barang fisik (tipe Barang). Jasa tidak punya stok.".into(),
            );
        }

        // 2. Preload subtotal pembelian khusus barang ini.
        let pembelian_map = hpp_load_pembelian_subtotals(conn, Some(&kode_db))?;

        // 3. Replay event + simpan setiap snapshot ke vektor.
        let mut stmt = conn
            .prepare(
                "SELECT m.waktu, m.tanggal_transaksi, m.jenis, m.referensi, m.gudang_kode,
                        COALESCE(g.nama, m.gudang_kode) AS gudang_nama,
                        m.qty_masuk, m.qty_keluar, m.catatan
                 FROM stok_mutasi m
                 LEFT JOIN gudang g ON lower(g.kode) = lower(m.gudang_kode)
                 WHERE lower(m.barang_kode) = lower(?)
                 ORDER BY m.waktu ASC, m.id ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![&kode_db], |r| {
                Ok((
                    r.get::<_, i64>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, String>(5)?,
                    r.get::<_, i64>(6)?,
                    r.get::<_, i64>(7)?,
                    r.get::<_, String>(8)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        let mut state_hpp = HppState::new();
        let mut events: Vec<HppHistoryEvent> = Vec::new();
        for r in rows {
            let (waktu, tanggal, jenis, referensi, gudang_kode, gudang_nama, qm, qk, catatan) =
                r.map_err(|e| e.to_string())?;
            let ev = hpp_apply_event(
                &mut state_hpp,
                waktu,
                &tanggal,
                &jenis,
                &referensi,
                &gudang_kode,
                &gudang_nama,
                qm,
                qk,
                &catatan,
                &pembelian_map,
                &kode_db,
            );
            events.push(ev);
        }

        Ok(HppDetail {
            kode: kode_db,
            nama,
            satuan,
            stok_akhir: state_hpp.stok,
            hpp_akhir: state_hpp.hpp(),
            total_nilai_akhir: state_hpp.total_nilai as i64,
            events,
        })
    })
}
