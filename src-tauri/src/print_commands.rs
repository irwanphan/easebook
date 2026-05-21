//! Perintah Tauri terkait cetak dokumen.
//!
//! Pendekatan: tulis HTML print-ready ke direktori temp OS,
//! lalu buka di browser default user lewat `tauri-plugin-opener`.
//! Alasan: `window.print()` di WKWebView (Tauri 2 macOS) sering tidak
//! reliabel di build production (upstream WebKit / wry issue), sedangkan
//! browser default selalu punya dialog cetak yang lengkap.

use std::fs;
use std::path::PathBuf;

use chrono::Utc;
use tauri_plugin_opener::OpenerExt;

/// Tulis `html` ke direktori temp OS sebagai file `.html` lalu buka di
/// browser default user. Browser yang menampilkan akan menyediakan dialog
/// cetak nativenya (Cmd+P / Ctrl+P → preview & pilih printer / Save as PDF).
///
/// `filename_hint` dipakai untuk membentuk nama file yang ramah dibaca user
/// di tab browser & nama default kalau user pilih "Save as PDF".
///
/// Mengembalikan path file temp untuk debugging / pengujian.
#[tauri::command]
pub fn print_open_html(
    app: tauri::AppHandle,
    html: String,
    filename_hint: String,
) -> Result<String, String> {
    if html.trim().is_empty() {
        return Err("HTML kosong — tidak ada yang bisa dicetak.".into());
    }

    let safe_hint = sanitize_filename_hint(&filename_hint);
    let ts = Utc::now().timestamp_millis();
    let filename = format!("easybook-{safe_hint}-{ts}.html");

    let mut path: PathBuf = std::env::temp_dir();
    path.push(filename);

    fs::write(&path, html.as_bytes())
        .map_err(|e| format!("Gagal menulis file cetak: {e}"))?;

    let path_str = path
        .to_str()
        .ok_or_else(|| "Path file cetak tidak valid (non-UTF8).".to_string())?
        .to_string();

    app.opener()
        .open_path(path_str.clone(), None::<&str>)
        .map_err(|e| format!("Gagal membuka file cetak di browser: {e}"))?;

    Ok(path_str)
}

/// Saring `hint` jadi karakter aman untuk nama file: huruf, angka, '-' '_' '.'.
/// Karakter lain diganti '-', spasi runtuh, hasil dipotong max 64 karakter
/// agar nama file tidak terlalu panjang di OS tertentu.
fn sanitize_filename_hint(hint: &str) -> String {
    let raw = hint.trim();
    if raw.is_empty() {
        return "cetak".to_string();
    }
    let mut out = String::with_capacity(raw.len());
    let mut prev_dash = false;
    for ch in raw.chars() {
        let safe = if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
            ch
        } else {
            '-'
        };
        if safe == '-' {
            if prev_dash {
                continue;
            }
            prev_dash = true;
        } else {
            prev_dash = false;
        }
        out.push(safe);
        if out.len() >= 64 {
            break;
        }
    }
    let trimmed = out.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "cetak".to_string()
    } else {
        trimmed
    }
}
