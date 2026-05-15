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

        CREATE TABLE IF NOT EXISTS penjualan (
            nomor TEXT PRIMARY KEY NOT NULL,
            pelanggan_kode TEXT NOT NULL REFERENCES pelanggan(kode) ON UPDATE CASCADE,
            gudang_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            salesman TEXT NOT NULL DEFAULT '',
            tanggal_faktur TEXT NOT NULL,
            jatuh_tempo TEXT NOT NULL,
            catatan_faktur TEXT NOT NULL DEFAULT '',
            total INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Dipesan',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS penjualan_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomor TEXT NOT NULL REFERENCES penjualan(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            qty INTEGER NOT NULL,
            harga_satuan INTEGER NOT NULL,
            subtotal INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_penjualan_tgl ON penjualan(tanggal_faktur);
        CREATE INDEX IF NOT EXISTS idx_penjualan_line_nomor ON penjualan_line(nomor);

        CREATE TABLE IF NOT EXISTS stok_mutasi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            waktu INTEGER NOT NULL,
            tanggal_transaksi TEXT NOT NULL,
            barang_kode TEXT NOT NULL COLLATE NOCASE,
            gudang_kode TEXT NOT NULL COLLATE NOCASE,
            jenis TEXT NOT NULL,
            referensi TEXT NOT NULL,
            qty_masuk INTEGER NOT NULL DEFAULT 0,
            qty_keluar INTEGER NOT NULL DEFAULT 0,
            saldo_setelah INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT '',
            FOREIGN KEY (barang_kode) REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            FOREIGN KEY (gudang_kode) REFERENCES gudang(kode) ON UPDATE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_stok_mutasi_barang ON stok_mutasi(barang_kode);
        CREATE INDEX IF NOT EXISTS idx_stok_mutasi_tgl ON stok_mutasi(tanggal_transaksi);
        CREATE INDEX IF NOT EXISTS idx_stok_mutasi_waktu ON stok_mutasi(waktu);

        -- Keuangan: akun & jurnal umum (double-entry)
        CREATE TABLE IF NOT EXISTS akun_keuangan (
            kode TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama TEXT NOT NULL,
            induk_kode TEXT REFERENCES akun_keuangan(kode) ON DELETE SET NULL ON UPDATE CASCADE,
            kelompok_lr TEXT NOT NULL DEFAULT '',
            is_akun_kas INTEGER NOT NULL DEFAULT 0,
            saldo INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_akun_keuangan_induk ON akun_keuangan(induk_kode);
        CREATE INDEX IF NOT EXISTS idx_akun_keuangan_kas ON akun_keuangan(is_akun_kas);

        CREATE TABLE IF NOT EXISTS jurnal_umum (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tanggal TEXT NOT NULL,
            jenis TEXT NOT NULL DEFAULT '',
            referensi TEXT NOT NULL DEFAULT '',
            catatan TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_jurnal_umum_tanggal ON jurnal_umum(tanggal);
        CREATE INDEX IF NOT EXISTS idx_jurnal_umum_jenis ON jurnal_umum(jenis);

        CREATE TABLE IF NOT EXISTS jurnal_umum_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jurnal_id INTEGER NOT NULL REFERENCES jurnal_umum(id) ON DELETE CASCADE ON UPDATE CASCADE,
            akun_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            debit INTEGER NOT NULL DEFAULT 0,
            kredit INTEGER NOT NULL DEFAULT 0,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_jurnal_line_jurnal ON jurnal_umum_line(jurnal_id);
        CREATE INDEX IF NOT EXISTS idx_jurnal_line_akun ON jurnal_umum_line(akun_kode);

        -- Konfigurasi akun untuk template jurnal otomatis
        CREATE TABLE IF NOT EXISTS jurnal_konfigurasi (
            id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
            akun_piutang TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            akun_hutang TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            akun_pendapatan TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            akun_pembelian TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            akun_penerimaan_lainnya TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            akun_pengeluaran_lainnya TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        ",
    )?;
    migrate_akun_keuangan_columns(conn)?;
    Ok(())
}

/// Kolom tambahan untuk instalasi lama (tipe / peran_jurnal → skema daftar akun baru).
fn migrate_akun_keuangan_columns(conn: &Connection) -> rusqlite::Result<()> {
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'akun_keuangan'",
        [],
        |r| r.get(0),
    )?;
    if exists == 0 {
        return Ok(());
    }

    let mut stmt = conn.prepare("PRAGMA table_info(akun_keuangan)")?;
    let cols: Vec<String> = stmt
        .query_map([], |r| r.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();

    if !cols.iter().any(|c| c.eq_ignore_ascii_case("saldo")) {
        conn.execute(
            "ALTER TABLE akun_keuangan ADD COLUMN saldo INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("induk_kode")) {
        conn.execute("ALTER TABLE akun_keuangan ADD COLUMN induk_kode TEXT", [])?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("kelompok_lr")) {
        conn.execute(
            "ALTER TABLE akun_keuangan ADD COLUMN kelompok_lr TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("is_akun_kas")) {
        conn.execute(
            "ALTER TABLE akun_keuangan ADD COLUMN is_akun_kas INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    // Migrasi dari peran_jurnal / tipe lama
    if cols.iter().any(|c| c.eq_ignore_ascii_case("peran_jurnal")) {
        conn.execute_batch(
            "
            UPDATE akun_keuangan SET is_akun_kas = 1
            WHERE upper(trim(peran_jurnal)) IN ('KAS', 'BANK', 'KAS_BANK');
            UPDATE akun_keuangan SET kelompok_lr = 'PENDAPATAN'
            WHERE trim(kelompok_lr) = '' AND upper(trim(peran_jurnal)) = 'PENDAPATAN';
            UPDATE akun_keuangan SET kelompok_lr = 'BEBAN'
            WHERE trim(kelompok_lr) = '' AND upper(trim(peran_jurnal)) IN ('PEMBELIAN', 'PENGELUARAN_LAINNYA');
            UPDATE akun_keuangan SET kelompok_lr = 'PENDAPATAN'
            WHERE trim(kelompok_lr) = '' AND upper(trim(peran_jurnal)) = 'PENERIMAAN_LAINNYA';
            ",
        )?;
    } else if cols.iter().any(|c| c.eq_ignore_ascii_case("tipe")) {
        conn.execute_batch(
            "
            UPDATE akun_keuangan SET is_akun_kas = 1
            WHERE upper(trim(tipe)) IN ('KAS_BANK', 'KAS', 'BANK');
            ",
        )?;
    }

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_akun_keuangan_induk ON akun_keuangan(induk_kode)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_akun_keuangan_kas ON akun_keuangan(is_akun_kas)",
        [],
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
