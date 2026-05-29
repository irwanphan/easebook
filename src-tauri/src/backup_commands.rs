//! Backup & restore database (SQLite) lewat UI Pengaturan → Data.
//!
//! Strategi:
//! - **Backup**: jalankan `VACUUM INTO '<backups>/easybook_YYYYMMDD_HHMMSS.db'`.
//!   Aman dijalankan saat DB sedang dipakai (SQLite mengelola lock-nya) dan
//!   sekaligus menghasilkan file yang sudah ter-compact (tidak ikut sampah
//!   WAL / freelist). Setiap backup dicatat di tabel `backup_log`.
//! - **Restore**: copy file backup → `easybook.db.pending-restore` di
//!   app_data_dir + tulis manifest berisi nama file sumber. Aktualisasinya
//!   dilakukan saat startup berikutnya oleh `db::finalize_pending_restore_if_any`
//!   sehingga tidak terjadi race condition dengan koneksi yang sedang aktif.
//!   Setelah finalize, `db::log_pending_restore_followup_if_any` mencatat
//!   event RESTORE di backup_log.

use std::path::{Path, PathBuf};

use chrono::Utc;
use rusqlite::params;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::db;
use crate::DbState;

const BACKUP_DIR_NAME: &str = "backups";

fn now_ts() -> i64 {
    Utc::now().timestamp()
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Gagal mengakses direktori data aplikasi: {e}"))
}

fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?.join(BACKUP_DIR_NAME);
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Gagal membuat folder backup: {e}"))?;
    Ok(dir)
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupRow {
    pub id: i64,
    /// "BACKUP" atau "RESTORE".
    pub jenis: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size_bytes: i64,
    pub catatan: String,
    pub created_at: i64,
    /// True bila ini event BACKUP **dan** file fisik masih ada di disk.
    /// Hanya backup dengan `file_exists = true` yang bisa di-restore.
    pub file_exists: bool,
}

/// Path absolut folder backup. Berguna untuk UI yang mau membukanya via
/// `@tauri-apps/plugin-opener`.
#[tauri::command]
pub fn backup_folder_path(app: AppHandle) -> Result<String, String> {
    let dir = backups_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

/// Buat backup baru dari DB aktif. Nama file:
/// `easybook_YYYYMMDD_HHMMSS.db` (waktu lokal mesin).
#[tauri::command]
pub fn backup_create(
    state: State<DbState>,
    app: AppHandle,
    catatan: Option<String>,
) -> Result<BackupRow, String> {
    let backups = backups_dir(&app)?;

    let stamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let file_name = format!("easybook_{stamp}.db");
    let file_path = backups.join(&file_name);

    if file_path.exists() {
        return Err(format!(
            "File backup dengan nama '{file_name}' sudah ada. Coba lagi beberapa detik kemudian."
        ));
    }

    // Eksekusi VACUUM INTO — aman saat DB sedang dipakai dan menghasilkan
    // file ter-compact (tanpa freelist/WAL sampah).
    let conn = db::open_connection(&state.path)
        .map_err(|e| format!("Gagal membuka DB sumber: {e}"))?;
    let dst_literal = file_path.to_string_lossy().replace('\'', "''");
    conn.execute_batch(&format!("VACUUM INTO '{dst_literal}'"))
        .map_err(|e| format!("Backup gagal (VACUUM INTO): {e}"))?;
    drop(conn);

    let file_size = std::fs::metadata(&file_path)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    let catatan_clean = catatan
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    // Catat ke backup_log
    let log_conn = db::open_connection(&state.path)
        .map_err(|e| format!("Gagal membuka DB untuk log: {e}"))?;
    let ts = now_ts();
    log_conn
        .execute(
            "INSERT INTO backup_log (jenis, file_name, file_path, file_size_bytes, catatan, created_at)
             VALUES ('BACKUP', ?, ?, ?, ?, ?)",
            params![
                file_name,
                file_path.to_string_lossy().to_string(),
                file_size,
                catatan_clean,
                ts
            ],
        )
        .map_err(|e| format!("Log backup gagal disimpan: {e}"))?;
    let id = log_conn.last_insert_rowid();

    Ok(BackupRow {
        id,
        jenis: "BACKUP".to_string(),
        file_name,
        file_path: file_path.to_string_lossy().to_string(),
        file_size_bytes: file_size,
        catatan: catatan_clean,
        created_at: ts,
        file_exists: true,
    })
}

/// List semua entri log (BACKUP & RESTORE), terbaru dulu. Untuk entri
/// BACKUP, `file_exists` diisi dengan hasil pengecekan filesystem.
#[tauri::command]
pub fn backup_list(state: State<DbState>) -> Result<Vec<BackupRow>, String> {
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, jenis, file_name, file_path, file_size_bytes, catatan, created_at
             FROM backup_log
             ORDER BY created_at DESC, id DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            let jenis: String = r.get(1)?;
            let file_path: String = r.get(3)?;
            let file_exists = if jenis == "BACKUP" {
                Path::new(&file_path).exists()
            } else {
                false
            };
            Ok(BackupRow {
                id: r.get(0)?,
                jenis,
                file_name: r.get(2)?,
                file_path,
                file_size_bytes: r.get(4)?,
                catatan: r.get(5)?,
                created_at: r.get(6)?,
                file_exists,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

/// Hapus file backup + entri log-nya. Hanya bisa untuk jenis BACKUP
/// (entry RESTORE bersifat read-only sebagai jejak audit).
#[tauri::command]
pub fn backup_delete(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let (jenis, file_path): (String, String) = conn
        .query_row(
            "SELECT jenis, file_path FROM backup_log WHERE id = ?",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| format!("Entri log tidak ditemukan: {e}"))?;

    if jenis != "BACKUP" {
        return Err(
            "Hanya entri jenis BACKUP yang bisa dihapus. Riwayat RESTORE bersifat permanen."
                .into(),
        );
    }

    let path = Path::new(&file_path);
    if path.exists() {
        std::fs::remove_file(path)
            .map_err(|e| format!("Gagal menghapus file backup: {e}"))?;
    }
    conn.execute("DELETE FROM backup_log WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Siapkan restore: copy file backup yang dipilih ke staging
/// `easybook.db.pending-restore` di app_data_dir. Penggantian DB aktif
/// dilakukan saat startup berikutnya oleh `db::finalize_pending_restore_if_any`.
///
/// Setelah perintah ini sukses, UI harus menyuruh user menutup &
/// membuka kembali aplikasi.
#[tauri::command]
pub fn backup_restore_stage(
    state: State<DbState>,
    app: AppHandle,
    id: i64,
) -> Result<(), String> {
    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let (jenis, file_name, file_path): (String, String, String) = conn
        .query_row(
            "SELECT jenis, file_name, file_path FROM backup_log WHERE id = ?",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|e| format!("Entri backup tidak ditemukan: {e}"))?;
    drop(conn);

    if jenis != "BACKUP" {
        return Err("Hanya entri jenis BACKUP yang bisa di-restore.".into());
    }
    let src = Path::new(&file_path);
    if !src.exists() {
        return Err(format!(
            "File backup '{file_name}' tidak ditemukan di disk. Mungkin sudah dihapus manual."
        ));
    }

    // Validasi integritas backup sebelum staging: pastikan SQLite bisa
    // membukanya. Lebih baik gagal sekarang daripada saat startup.
    {
        let probe = rusqlite::Connection::open(src)
            .map_err(|e| format!("File backup tidak valid (tidak bisa dibuka): {e}"))?;
        let result: String = probe
            .query_row("PRAGMA integrity_check", [], |r| r.get(0))
            .map_err(|e| format!("Integrity check gagal: {e}"))?;
        if result != "ok" {
            return Err(format!("Integrity check backup gagal: {result}"));
        }
    }

    let data_dir = app_data_dir(&app)?;
    let pending = data_dir.join(db::RESTORE_PENDING_FILENAME);
    let manifest = data_dir.join(db::RESTORE_MANIFEST_FILENAME);

    if pending.exists() {
        std::fs::remove_file(&pending)
            .map_err(|e| format!("Gagal membersihkan staging lama: {e}"))?;
    }

    std::fs::copy(src, &pending)
        .map_err(|e| format!("Gagal menyalin file backup ke staging: {e}"))?;
    std::fs::write(&manifest, &file_name)
        .map_err(|e| format!("Gagal menulis manifest restore: {e}"))?;

    Ok(())
}

/// Batalkan restore yang sudah di-stage namun belum dieksekusi (mis. user
/// berubah pikiran sebelum me-restart aplikasi).
#[tauri::command]
pub fn backup_restore_cancel(app: AppHandle) -> Result<(), String> {
    let data_dir = app_data_dir(&app)?;
    let pending = data_dir.join(db::RESTORE_PENDING_FILENAME);
    let manifest = data_dir.join(db::RESTORE_MANIFEST_FILENAME);
    if pending.exists() {
        std::fs::remove_file(&pending)
            .map_err(|e| format!("Gagal menghapus staging: {e}"))?;
    }
    if manifest.exists() {
        let _ = std::fs::remove_file(&manifest);
    }
    Ok(())
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupStatus {
    pub backup_folder_path: String,
    pub db_file_path: String,
    pub db_file_size_bytes: i64,
    /// Timestamp BACKUP terakhir, atau null kalau belum pernah.
    pub last_backup_at: Option<i64>,
    /// Nama file backup terakhir.
    pub last_backup_file_name: Option<String>,
    /// True bila ada restore yang sudah di-stage menunggu restart.
    pub restore_pending: bool,
    /// Nama file backup yang menunggu restore (bila ada).
    pub restore_pending_source: Option<String>,
}

/// Snapshot status: lokasi backup, DB aktif, last backup, pending restore.
#[tauri::command]
pub fn backup_status(state: State<DbState>, app: AppHandle) -> Result<BackupStatus, String> {
    let backup_folder = backups_dir(&app)?.to_string_lossy().to_string();
    let db_file_path = state.path.to_string_lossy().to_string();
    let db_file_size_bytes = std::fs::metadata(&state.path)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    let conn = db::open_connection(&state.path).map_err(|e| e.to_string())?;
    let last: Option<(i64, String)> = conn
        .query_row(
            "SELECT created_at, file_name FROM backup_log
             WHERE jenis = 'BACKUP'
             ORDER BY created_at DESC, id DESC LIMIT 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .ok();

    let data_dir = app_data_dir(&app)?;
    let pending_path = data_dir.join(db::RESTORE_PENDING_FILENAME);
    let manifest_path = data_dir.join(db::RESTORE_MANIFEST_FILENAME);
    let restore_pending = pending_path.exists();
    let restore_pending_source = if restore_pending {
        std::fs::read_to_string(&manifest_path)
            .ok()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    } else {
        None
    };

    Ok(BackupStatus {
        backup_folder_path: backup_folder,
        db_file_path,
        db_file_size_bytes,
        last_backup_at: last.as_ref().map(|(t, _)| *t),
        last_backup_file_name: last.map(|(_, n)| n),
        restore_pending,
        restore_pending_source,
    })
}
