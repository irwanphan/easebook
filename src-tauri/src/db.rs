//! SQLite schema, migrasi ringan, dan seed awal untuk master data.

use chrono::Utc;
use rusqlite::{params, Connection};
use std::path::Path;

fn now_ts() -> i64 {
    Utc::now().timestamp()
}

pub fn open_connection(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        ",
    )?;
    Ok(conn)
}

pub fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS kategori (
            kode TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama TEXT NOT NULL,
            deskripsi TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS merek (
            kode TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama TEXT NOT NULL,
            deskripsi TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS gudang (
            kode TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama TEXT NOT NULL,
            alamat TEXT NOT NULL,
            lokasi TEXT NOT NULL DEFAULT '',
            pic TEXT NOT NULL,
            nomor_kontak TEXT NOT NULL,
            luas_m2 REAL NOT NULL,
            kapasitas_penyimpanan TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS barang_jasa (
            kode TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama TEXT NOT NULL,
            tipe TEXT NOT NULL CHECK (tipe IN ('Barang', 'Jasa')),
            satuan TEXT NOT NULL,
            harga INTEGER NOT NULL,
            stok INTEGER,
            kategori_kode TEXT REFERENCES kategori(kode) ON DELETE SET NULL ON UPDATE CASCADE,
            merek_kode TEXT REFERENCES merek(kode) ON DELETE SET NULL ON UPDATE CASCADE,
            default_gudang_kode TEXT REFERENCES gudang(kode) ON DELETE SET NULL ON UPDATE CASCADE,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_barang_kategori ON barang_jasa(kategori_kode);
        CREATE INDEX IF NOT EXISTS idx_barang_merek ON barang_jasa(merek_kode);

        CREATE TABLE IF NOT EXISTS pelanggan (
            kode TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama TEXT NOT NULL,
            alamat TEXT NOT NULL DEFAULT '',
            kota TEXT NOT NULL DEFAULT '',
            telepon TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL DEFAULT '',
            npwp TEXT NOT NULL DEFAULT '',
            catatan TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pemasok (
            kode TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama TEXT NOT NULL,
            alamat TEXT NOT NULL DEFAULT '',
            kota TEXT NOT NULL DEFAULT '',
            telepon TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL DEFAULT '',
            npwp TEXT NOT NULL DEFAULT '',
            catatan TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pembelian (
            nomor TEXT PRIMARY KEY NOT NULL,
            pemasok_kode TEXT NOT NULL REFERENCES pemasok(kode) ON UPDATE CASCADE,
            gudang_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            tanggal_faktur TEXT NOT NULL,
            jatuh_tempo TEXT NOT NULL,
            metode_pembayaran TEXT NOT NULL,
            total INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Dipesan',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pembelian_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomor TEXT NOT NULL REFERENCES pembelian(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            qty INTEGER NOT NULL,
            harga_satuan INTEGER NOT NULL,
            subtotal INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pembelian_tgl ON pembelian(tanggal_faktur);
        CREATE INDEX IF NOT EXISTS idx_pembelian_line_nomor ON pembelian_line(nomor);
        ",
    )?;
    Ok(())
}

pub fn seed_if_empty(conn: &mut Connection) -> rusqlite::Result<()> {
    let k: i64 = conn.query_row("SELECT COUNT(*) FROM kategori", [], |r| r.get(0))?;
    if k > 0 {
        return Ok(());
    }

    let ts = now_ts();
    let tx = conn.transaction()?;

    tx.execute(
        "INSERT INTO kategori (kode, nama, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        params![
            "KTG-001",
            "Elektronik",
            "Produk elektronik dan aksesoris listrik.",
            ts,
            ts
        ],
    )?;
    tx.execute(
        "INSERT INTO kategori (kode, nama, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        params![
            "KTG-002",
            "Pakaian",
            "Fashion dan tekstil siap jual.",
            ts,
            ts
        ],
    )?;
    tx.execute(
        "INSERT INTO kategori (kode, nama, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        params!["KTG-003", "Makanan & minuman", "", ts, ts],
    )?;

    tx.execute(
        "INSERT INTO merek (kode, nama, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        params![
            "MRK-001",
            "Sony",
            "Elektronik dan audio.",
            ts,
            ts
        ],
    )?;
    tx.execute(
        "INSERT INTO merek (kode, nama, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        params!["MRK-002", "Samsung", "", ts, ts],
    )?;
    tx.execute(
        "INSERT INTO merek (kode, nama, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        params![
            "MRK-003",
            "Uniqlo",
            "Ritel fashion global.",
            ts,
            ts
        ],
    )?;

    tx.execute(
        "INSERT INTO gudang (kode, nama, alamat, lokasi, pic, nomor_kontak, luas_m2, kapasitas_penyimpanan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            "GD-001",
            "Gudang Pusat Bandung",
            "Jl. Soekarno-Hatta No. 12, Kiaracondong, Kota Bandung",
            "-6.9175, 107.6191",
            "Budi Santoso",
            "+62 812-3456-7890",
            2500f64,
            "1200 palet",
            ts,
            ts
        ],
    )?;
    tx.execute(
        "INSERT INTO gudang (kode, nama, alamat, lokasi, pic, nomor_kontak, luas_m2, kapasitas_penyimpanan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            "GD-002",
            "DC Jakarta Timur",
            "Kawasan industri MM2100, Cibitung",
            "-6.2480, 107.0856",
            "Rina Wijaya",
            "021-5550123",
            4800f64,
            "8500 m³ estimasi",
            ts,
            ts
        ],
    )?;

    tx.execute(
        "INSERT INTO barang_jasa (kode, nama, tipe, satuan, harga, stok, kategori_kode, merek_kode, default_gudang_kode, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)",
        params!["BRG-001", "Headphones ANC", "Barang", "pcs", 899000i64, 48i64, ts, ts],
    )?;
    tx.execute(
        "INSERT INTO barang_jasa (kode, nama, tipe, satuan, harga, stok, kategori_kode, merek_kode, default_gudang_kode, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)",
        params!["JS-010", "Instalasi POS", "Jasa", "job", 2500000i64, ts, ts],
    )?;
    tx.execute(
        "INSERT INTO barang_jasa (kode, nama, tipe, satuan, harga, stok, kategori_kode, merek_kode, default_gudang_kode, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)",
        params!["BRG-002", "Kemeja denim", "Barang", "pcs", 349000i64, 120i64, ts, ts],
    )?;

    tx.execute(
        "INSERT INTO pelanggan (kode, nama, alamat, kota, telepon, email, npwp, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            "PLG-001",
            "Toko Maju Jaya",
            "Jl. Merdeka No. 88",
            "Bandung",
            "022-1234567",
            "finance@majujaya.co.id",
            "",
            "Termin 30 hari.",
            ts,
            ts
        ],
    )?;
    tx.execute(
        "INSERT INTO pelanggan (kode, nama, alamat, kota, telepon, email, npwp, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            "PLG-002",
            "CV Sinar Retail",
            "Ruko Galaxy Blok C12",
            "Jakarta Timur",
            "+62 811-9988-001",
            "",
            "",
            "",
            ts,
            ts
        ],
    )?;

    tx.execute(
        "INSERT INTO pemasok (kode, nama, alamat, kota, telepon, email, npwp, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            "SUP-001",
            "PT Distributor Nasional",
            "Kawasan Industri Jababeka",
            "Cikarang",
            "021-8989-0000",
            "procurement@distnas.id",
            "",
            "PO minimal 5 juta.",
            ts,
            ts
        ],
    )?;
    tx.execute(
        "INSERT INTO pemasok (kode, nama, alamat, kota, telepon, email, npwp, catatan, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            "SUP-002",
            "UD Sumber Makmur",
            "Jl. Industri III No. 5",
            "Semarang",
            "024-7654321",
            "",
            "",
            "",
            ts,
            ts
        ],
    )?;

    tx.commit()?;
    Ok(())
}
