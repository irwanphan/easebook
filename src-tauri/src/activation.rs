//! Device fingerprint & aktivasi lisensi (multi-produk, online + offline).

use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// ID produk untuk build EasyBook ERP — harus sama dengan `EASYBOOK_APP_ID` di frontend.
pub const APP_PRODUCT_ID: &str = "easybook-erp";

/// Batas transaksi (pembelian + penjualan) sebelum aktivasi wajib.
pub const TRIAL_TRANSACTION_LIMIT: i64 = 100;

const ACTIVATION_PUBLIC_KEY_B64: &str = "RHYdpMbo9V5Xhf8opH6NrrWyRz3MfSGePMb3y0Pb0Y8=";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub transaction_count: i64,
    pub trial_limit: i64,
    pub activated: bool,
    pub blocked: bool,
    pub remaining: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivationStatus {
    pub activated: bool,
    pub product_id: String,
    pub invoice_number: String,
    pub device_code: String,
    pub method: String,
    pub activated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ActivationStore {
    products: HashMap<String, ActivationStatus>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyActivationStatus {
    activated: bool,
    invoice_number: String,
    device_code: String,
    method: String,
    activated_at: i64,
}

#[derive(Debug, Deserialize)]
struct OfflinePayloadV1 {
    inv: String,
    dev: String,
    iat: i64,
    v: u8,
}

#[derive(Debug, Deserialize)]
struct OfflinePayloadV2 {
    inv: String,
    dev: String,
    app: String,
    iat: i64,
    v: u8,
}

fn activation_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("activation.json"))
}

fn normalize_invoice(value: &str) -> String {
    value.trim().to_uppercase().replace(' ', "")
}

fn normalize_device(value: &str) -> String {
    value.trim().to_uppercase().replace(' ', "")
}

fn normalize_product_id(value: &str) -> String {
    value.trim().to_lowercase()
}

pub fn compute_device_code() -> Result<String, String> {
    let machine_id = machine_uid::get().map_err(|e| format!("Gagal membaca ID mesin: {e}"))?;
    let mut hasher = Sha256::new();
    hasher.update(machine_id.as_bytes());
    hasher.update(b"easybook-v1");
    let digest = hasher.finalize();
    let short = digest.iter().take(6).map(|b| format!("{b:02X}")).collect::<String>();
    Ok(format!("EB-DEV-{short}"))
}

fn decode_base64_url(value: &str) -> Result<Vec<u8>, String> {
    let padded = value
        .replace('-', "+")
        .replace('_', "/")
        + &"=".repeat((4 - value.len() % 4) % 4);
    base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        padded.as_bytes(),
    )
    .map_err(|e| format!("Base64 tidak valid: {e}"))
}

pub fn verify_offline_code(
    code: &str,
    expected_product_id: &str,
    invoice_raw: &str,
    device_raw: &str,
) -> Result<(), String> {
    let trimmed = code.trim();
    if !trimmed.starts_with("EB1.") {
        return Err("Format kode aktivasi tidak valid.".into());
    }
    let parts: Vec<&str> = trimmed.split('.').collect();
    if parts.len() != 3 {
        return Err("Format kode aktivasi tidak valid.".into());
    }

    let payload_bytes = decode_base64_url(parts[1])?;
    let signature_bytes = decode_base64_url(parts[2])?;

    let public_key_bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        ACTIVATION_PUBLIC_KEY_B64.as_bytes(),
    )
    .map_err(|_| "Public key aktivasi tidak valid.".to_string())?;

    let verifying_key = VerifyingKey::from_bytes(
        public_key_bytes
            .as_slice()
            .try_into()
            .map_err(|_| "Panjang public key salah.")?,
    )
    .map_err(|e| format!("Public key: {e}"))?;

    let signature = Signature::from_slice(&signature_bytes).map_err(|e| format!("Signature: {e}"))?;
    verifying_key
        .verify(&payload_bytes, &signature)
        .map_err(|_| "Tanda tangan kode aktivasi tidak valid.".to_string())?;

    let inv = normalize_invoice(invoice_raw);
    let dev = normalize_device(device_raw);
    let expected_app = normalize_product_id(expected_product_id);

    let raw: serde_json::Value =
        serde_json::from_slice(&payload_bytes).map_err(|_| "Payload kode tidak dapat dibaca.")?;
    let version = raw.get("v").and_then(|v| v.as_u64()).unwrap_or(0);

    if version == 2 {
        let payload: OfflinePayloadV2 =
            serde_json::from_value(raw).map_err(|_| "Payload v2 tidak valid.")?;
        if normalize_product_id(&payload.app) != expected_app {
            return Err("Kode aktivasi tidak untuk aplikasi ini.".into());
        }
        if payload.inv != inv {
            return Err("Kode tidak cocok dengan nomor invoice.".into());
        }
        if payload.dev != dev {
            return Err("Kode tidak cocok dengan kode perangkat.".into());
        }
        return Ok(());
    }

    if version == 1 {
        let payload: OfflinePayloadV1 =
            serde_json::from_value(raw).map_err(|_| "Payload v1 tidak valid.")?;
        if expected_app != APP_PRODUCT_ID {
            return Err("Kode aktivasi lama hanya berlaku untuk EasyBook ERP.".into());
        }
        if payload.inv != inv {
            return Err("Kode tidak cocok dengan nomor invoice.".into());
        }
        if payload.dev != dev {
            return Err("Kode tidak cocok dengan kode perangkat.".into());
        }
        return Ok(());
    }

    Err("Versi kode tidak didukung.".into())
}

fn read_store(app: &AppHandle) -> Result<ActivationStore, String> {
    let path = activation_file(app)?;
    if !path.exists() {
        return Ok(ActivationStore {
            products: HashMap::new(),
        });
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;

    if let Ok(store) = serde_json::from_str::<ActivationStore>(&raw) {
        return Ok(store);
    }

    if let Ok(legacy) = serde_json::from_str::<LegacyActivationStatus>(&raw) {
        let mut products = HashMap::new();
        products.insert(
            APP_PRODUCT_ID.to_string(),
            ActivationStatus {
                activated: legacy.activated,
                product_id: APP_PRODUCT_ID.to_string(),
                invoice_number: legacy.invoice_number,
                device_code: legacy.device_code,
                method: legacy.method,
                activated_at: legacy.activated_at,
            },
        );
        return Ok(ActivationStore { products });
    }

    Err("File aktivasi tidak dapat dibaca.".into())
}

fn write_store(app: &AppHandle, store: &ActivationStore) -> Result<(), String> {
    let path = activation_file(app)?;
    let raw = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())
}

fn read_status(app: &AppHandle, product_id: &str) -> Result<Option<ActivationStatus>, String> {
    let store = read_store(app)?;
    Ok(store.products.get(product_id).cloned())
}

pub fn count_combined_transactions(conn: &Connection) -> Result<i64, String> {
    let pembelian: i64 = conn
        .query_row("SELECT COUNT(*) FROM pembelian", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let penjualan: i64 = conn
        .query_row("SELECT COUNT(*) FROM penjualan", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    Ok(pembelian + penjualan)
}

pub fn is_activated(app: &AppHandle) -> Result<bool, String> {
    Ok(read_status(app, APP_PRODUCT_ID)?
        .map(|s| s.activated)
        .unwrap_or(false))
}

pub fn assert_can_create_transaction(app: &AppHandle, conn: &Connection) -> Result<(), String> {
    if is_activated(app)? {
        return Ok(());
    }
    let count = count_combined_transactions(conn)?;
    if count >= TRIAL_TRANSACTION_LIMIT {
        return Err(format!(
            "Batas uji coba {TRIAL_TRANSACTION_LIMIT} transaksi (pembelian + penjualan) telah tercapai. Aktifkan lisensi di Pengaturan → Aktivasi."
        ));
    }
    Ok(())
}

pub fn build_license_info(app: &AppHandle, conn: &Connection) -> Result<LicenseInfo, String> {
    let transaction_count = count_combined_transactions(conn)?;
    let activated = is_activated(app)?;
    let remaining = if activated {
        0
    } else {
        (TRIAL_TRANSACTION_LIMIT - transaction_count).max(0)
    };
    let blocked = !activated && transaction_count >= TRIAL_TRANSACTION_LIMIT;
    Ok(LicenseInfo {
        transaction_count,
        trial_limit: TRIAL_TRANSACTION_LIMIT,
        activated,
        blocked,
        remaining,
    })
}

#[tauri::command]
pub fn activation_get_license_info(
    app: AppHandle,
    state: tauri::State<crate::DbState>,
) -> Result<LicenseInfo, String> {
    let conn = crate::db::open_connection(&state.path).map_err(|e| e.to_string())?;
    build_license_info(&app, &conn)
}

#[tauri::command]
pub fn activation_get_device_code() -> Result<String, String> {
    compute_device_code()
}

#[tauri::command]
pub fn activation_get_status(app: AppHandle) -> Result<Option<ActivationStatus>, String> {
    read_status(&app, APP_PRODUCT_ID)
}

#[tauri::command]
pub fn activation_save(
    app: AppHandle,
    invoice_number: String,
    device_code: String,
    method: String,
    activated_at: i64,
) -> Result<ActivationStatus, String> {
    let local_device = compute_device_code()?;
    let normalized_device = normalize_device(&device_code);
    if normalized_device != local_device {
        return Err("Kode perangkat tidak cocok dengan perangkat ini.".into());
    }

    let status = ActivationStatus {
        activated: true,
        product_id: APP_PRODUCT_ID.to_string(),
        invoice_number: normalize_invoice(&invoice_number),
        device_code: normalized_device,
        method,
        activated_at,
    };

    let mut store = read_store(&app)?;
    store
        .products
        .insert(APP_PRODUCT_ID.to_string(), status.clone());
    write_store(&app, &store)?;
    Ok(status)
}

#[tauri::command]
pub fn activation_apply_offline_code(
    app: AppHandle,
    invoice_number: String,
    activation_code: String,
) -> Result<ActivationStatus, String> {
    let device_code = compute_device_code()?;
    verify_offline_code(
        &activation_code,
        APP_PRODUCT_ID,
        &invoice_number,
        &device_code,
    )?;
    activation_save(
        app,
        invoice_number,
        device_code,
        "offline".into(),
        chrono::Utc::now().timestamp(),
    )
}
