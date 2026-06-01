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

/// Nama file staging yang dibuat oleh `backup_restore_stage`. Diletakkan
/// di app_data_dir bersebelahan dengan `easybook.db`. Saat app startup,
/// file ini akan dipromosikan menjadi DB aktif.
pub const RESTORE_PENDING_FILENAME: &str = "easybook.db.pending-restore";

/// Manifest text (single line) berisi nama file backup sumber yang
/// di-restore. Dipakai untuk mencatat log RESTORE setelah finalize.
pub const RESTORE_MANIFEST_FILENAME: &str = "easybook.db.pending-restore.manifest";

/// Backup keamanan dari DB sebelum di-overwrite oleh hasil restore. Tetap
/// disimpan agar bisa dikembalikan manual bila restore ternyata bermasalah.
pub const PRE_RESTORE_BACKUP_PREFIX: &str = "easybook.db.before-restore";

/// File flag yang menandakan pending restore harus dicatat ke log setelah
/// migrate selesai. Berisi nama file backup sumber. Caller tetap harus
/// hapus file ini setelah log dicatat.
pub const RESTORE_FOLLOWUP_FILENAME: &str = "easybook.db.restore-followup";

/// Jika ada file `RESTORE_PENDING_FILENAME` di app_data_dir, finalisasi
/// restore: rename DB lama menjadi backup keamanan, lalu rename file
/// pending menjadi DB aktif. Manifest dipindahkan ke "followup" agar log
/// RESTORE bisa dicatat setelah migrate berjalan di DB baru.
///
/// Idempotent — aman dipanggil di setiap startup. Bila tidak ada file
/// pending, langsung return Ok(()).
///
/// Error apa pun selama finalize TIDAK boleh menghentikan startup app
/// (kita tetap return Ok), tetapi kita catat ke stderr supaya bisa
/// di-debug. Akibatnya, kalau finalize gagal, user akan tetap masuk ke
/// DB lama dan bisa coba ulang restore.
pub fn finalize_pending_restore_if_any(
    app_data_dir: &Path,
    db_path: &Path,
) -> std::io::Result<()> {
    let pending = app_data_dir.join(RESTORE_PENDING_FILENAME);
    if !pending.exists() {
        return Ok(());
    }

    let manifest = app_data_dir.join(RESTORE_MANIFEST_FILENAME);
    let source_name = std::fs::read_to_string(&manifest)
        .ok()
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    if db_path.exists() {
        let ts = Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let backup_name = format!("{PRE_RESTORE_BACKUP_PREFIX}_{ts}.db");
        let pre_backup_path = app_data_dir.join(backup_name);
        std::fs::rename(db_path, &pre_backup_path)?;

        let sidecars = [
            format!("{}-wal", db_path.file_name().unwrap_or_default().to_string_lossy()),
            format!("{}-shm", db_path.file_name().unwrap_or_default().to_string_lossy()),
        ];
        for s in sidecars {
            let sp = app_data_dir.join(&s);
            if sp.exists() {
                let _ = std::fs::remove_file(&sp);
            }
        }
    }

    std::fs::rename(&pending, db_path)?;

    let followup = app_data_dir.join(RESTORE_FOLLOWUP_FILENAME);
    if !source_name.is_empty() {
        std::fs::write(&followup, source_name)?;
    }
    let _ = std::fs::remove_file(&manifest);

    Ok(())
}

/// Catat event RESTORE ke `backup_log` jika ada file followup yang
/// ditinggalkan oleh `finalize_pending_restore_if_any`. File followup
/// dihapus setelah log berhasil dicatat. Dipanggil setelah migrate.
pub fn log_pending_restore_followup_if_any(
    conn: &Connection,
    app_data_dir: &Path,
) -> rusqlite::Result<()> {
    let followup = app_data_dir.join(RESTORE_FOLLOWUP_FILENAME);
    if !followup.exists() {
        return Ok(());
    }

    let source_name = std::fs::read_to_string(&followup)
        .ok()
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "(tidak diketahui)".to_string());

    let backups_dir = app_data_dir.join("backups");
    let src_path = backups_dir.join(&source_name);
    let file_size = std::fs::metadata(&src_path)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO backup_log (jenis, file_name, file_path, file_size_bytes, catatan, created_at)
         VALUES ('RESTORE', ?, ?, ?, ?, ?)",
        params![
            source_name,
            src_path.to_string_lossy().to_string(),
            file_size,
            "Database dipulihkan dari backup pada startup aplikasi.",
            now_ts(),
        ],
    )?;

    let _ = std::fs::remove_file(&followup);
    Ok(())
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
            diskon_faktur INTEGER NOT NULL DEFAULT 0,
            pajak INTEGER NOT NULL DEFAULT 0,
            akun_kas_kode TEXT,
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
            diskon INTEGER NOT NULL DEFAULT 0,
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
            diskon_faktur INTEGER NOT NULL DEFAULT 0,
            pajak INTEGER NOT NULL DEFAULT 0,
            akun_kas_kode TEXT,
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
            diskon INTEGER NOT NULL DEFAULT 0,
            subtotal INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_penjualan_tgl ON penjualan(tanggal_faktur);
        CREATE INDEX IF NOT EXISTS idx_penjualan_line_nomor ON penjualan_line(nomor);

        -- Pesanan penjualan (Sales Order)
        --
        -- Pesanan = komitmen jual yang TIDAK mempengaruhi stok. Begitu siap
        -- dikirim, pesanan dikonversi menjadi faktur penjualan (yang akan
        -- mengurangi stok & memposting jurnal). Setelah dikonversi, status
        -- pesanan menjadi `Difakturkan` dan `faktur_nomor` menunjuk faktur
        -- hasil konversi.
        CREATE TABLE IF NOT EXISTS pesanan_penjualan (
            nomor TEXT PRIMARY KEY NOT NULL,
            pelanggan_kode TEXT NOT NULL REFERENCES pelanggan(kode) ON UPDATE CASCADE,
            gudang_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            salesman TEXT NOT NULL DEFAULT '',
            tanggal_pesanan TEXT NOT NULL,
            tanggal_kirim TEXT,
            catatan TEXT NOT NULL DEFAULT '',
            diskon_faktur INTEGER NOT NULL DEFAULT 0,
            pajak INTEGER NOT NULL DEFAULT 0,
            total INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Draft',
            faktur_nomor TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pesanan_penjualan_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomor TEXT NOT NULL REFERENCES pesanan_penjualan(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            qty INTEGER NOT NULL,
            satuan_tingkat INTEGER NOT NULL DEFAULT 1,
            harga_satuan INTEGER NOT NULL,
            diskon INTEGER NOT NULL DEFAULT 0,
            subtotal INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_pesanan_penjualan_tgl ON pesanan_penjualan(tanggal_pesanan);
        CREATE INDEX IF NOT EXISTS idx_pesanan_penjualan_status ON pesanan_penjualan(status);
        CREATE INDEX IF NOT EXISTS idx_pesanan_penjualan_line_nomor ON pesanan_penjualan_line(nomor);

        -- Pesanan pembelian (Purchase Order)
        --
        -- Mirror dari pesanan_penjualan tapi untuk sisi pembelian. PO TIDAK
        -- menambah stok dan TIDAK posting jurnal. Begitu barang diterima,
        -- pesanan dikonversi menjadi faktur pembelian (stok ditambah + jurnal
        -- diposting saat konversi). `faktur_nomor` menunjuk faktur hasil
        -- konversi setelah status `Difakturkan`.
        CREATE TABLE IF NOT EXISTS pesanan_pembelian (
            nomor TEXT PRIMARY KEY NOT NULL,
            pemasok_kode TEXT NOT NULL REFERENCES pemasok(kode) ON UPDATE CASCADE,
            gudang_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            tanggal_pesanan TEXT NOT NULL,
            tanggal_kirim TEXT,
            catatan TEXT NOT NULL DEFAULT '',
            diskon_faktur INTEGER NOT NULL DEFAULT 0,
            pajak INTEGER NOT NULL DEFAULT 0,
            total INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Draft',
            faktur_nomor TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pesanan_pembelian_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomor TEXT NOT NULL REFERENCES pesanan_pembelian(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            qty INTEGER NOT NULL,
            satuan_tingkat INTEGER NOT NULL DEFAULT 1,
            harga_satuan INTEGER NOT NULL,
            diskon INTEGER NOT NULL DEFAULT 0,
            subtotal INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_pesanan_pembelian_tgl ON pesanan_pembelian(tanggal_pesanan);
        CREATE INDEX IF NOT EXISTS idx_pesanan_pembelian_status ON pesanan_pembelian(status);
        CREATE INDEX IF NOT EXISTS idx_pesanan_pembelian_line_nomor ON pesanan_pembelian_line(nomor);

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

        -- Koreksi stok (stok opname, barang rusak/hilang/ditemukan, dll.)
        --
        -- Setiap dokumen koreksi punya satu gudang & satu alasan, dan boleh
        -- berisi banyak baris (campuran masuk/keluar). Saat insert, baris
        -- akan diturunkan jadi entri di `stok_mutasi` dengan jenis
        -- `KOREKSI_MASUK` / `KOREKSI_KELUAR`, sehingga modul HPP & laporan
        -- pergerakan stok tetap konsisten memakai timeline mutasi.
        CREATE TABLE IF NOT EXISTS koreksi_stok (
            nomor TEXT PRIMARY KEY NOT NULL,
            tanggal TEXT NOT NULL,
            gudang_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            alasan TEXT NOT NULL DEFAULT 'STOK_OPNAME',
            catatan TEXT NOT NULL DEFAULT '',
            dibuat_oleh TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS koreksi_stok_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomor TEXT NOT NULL REFERENCES koreksi_stok(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            arah TEXT NOT NULL CHECK (arah IN ('MASUK', 'KELUAR')),
            qty INTEGER NOT NULL,
            satuan_tingkat INTEGER NOT NULL DEFAULT 1,
            nilai_per_unit INTEGER NOT NULL DEFAULT 0,
            subtotal_nilai INTEGER NOT NULL DEFAULT 0,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_koreksi_stok_tgl ON koreksi_stok(tanggal);
        CREATE INDEX IF NOT EXISTS idx_koreksi_stok_line_nomor ON koreksi_stok_line(nomor);
        CREATE INDEX IF NOT EXISTS idx_koreksi_stok_line_barang ON koreksi_stok_line(barang_kode);

        -- Keuangan: akun & jurnal umum (double-entry)
        CREATE TABLE IF NOT EXISTS akun_keuangan (
            kode TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama TEXT NOT NULL,
            induk_kode TEXT REFERENCES akun_keuangan(kode) ON DELETE SET NULL ON UPDATE CASCADE,
            kelompok TEXT NOT NULL DEFAULT '',
            kolom_norm TEXT NOT NULL DEFAULT '',
            kelompok_lr TEXT NOT NULL DEFAULT '',
            sub_kelompok TEXT NOT NULL DEFAULT '',
            is_akun_kas INTEGER NOT NULL DEFAULT 0,
            saldo INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

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
    migrate_pembelian_line_columns(conn)?;
    migrate_pembelian_columns(conn)?;
    migrate_penjualan_line_columns(conn)?;
    migrate_penjualan_columns(conn)?;
    migrate_pengeluaran_tables(conn)?;
    migrate_penerimaan_tables(conn)?;
    migrate_pelunasan_piutang_tables(conn)?;
    migrate_pelunasan_hutang_tables(conn)?;
    migrate_pengguna_tables(conn)?;
    migrate_barang_jasa_satuan(conn)?;
    migrate_transfer_kas_tables(conn)?;
    migrate_activity_log_tables(conn)?;
    migrate_pos_tables(conn)?;
    migrate_produksi_tables(conn)?;
    migrate_pos_shift_event_log(conn)?;
    migrate_pos_konfigurasi(conn)?;
    migrate_pos_shift_jurnal_columns(conn)?;
    migrate_operasional_konfigurasi(conn)?;
    migrate_jurnal_konfigurasi_historical(conn)?;
    migrate_stok_awal_tables(conn)?;
    migrate_backup_log_table(conn)?;
    migrate_onboarding_state(conn)?;
    Ok(())
}

/// Log riwayat backup & restore database. Setiap entri merepresentasikan
/// satu peristiwa terkait integritas data: pembuatan backup, atau
/// finalisasi restore (dijalankan otomatis di app startup setelah user
/// memilih backup untuk di-restore).
fn migrate_backup_log_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS backup_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jenis TEXT NOT NULL CHECK (jenis IN ('BACKUP', 'RESTORE')),
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size_bytes INTEGER NOT NULL DEFAULT 0,
            catatan TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_backup_log_created
            ON backup_log(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_backup_log_jenis
            ON backup_log(jenis, created_at DESC);
        ",
    )?;
    Ok(())
}

/// Saldo awal stok (jurnal pembuka per gudang × barang) — analog ke
/// `kas_awal` tetapi untuk persediaan. Header singleton (`id = 1`) memegang
/// referensi jurnal aktif & tanggal jurnal terakhir; baris-baris di
/// `stok_awal_line` menyimpan qty + nilai per (barang, gudang).
///
/// Setiap baris juga membuat satu entri di `stok_mutasi` dengan
/// `jenis = 'STOK_AWAL'` agar modul HPP, kartu stok, dan laporan pergerakan
/// stok ikut konsisten. Saat re-simpan, jurnal lama di-reverse, semua
/// mutasi STOK_AWAL lama dihapus (sambil di-reverse di `barang_jasa.stok`),
/// lalu data baru ditulis ulang.
fn migrate_stok_awal_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS stok_awal (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            jurnal_id INTEGER REFERENCES jurnal_umum(id) ON DELETE SET NULL ON UPDATE CASCADE,
            tanggal_jurnal TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS stok_awal_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            gudang_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            qty INTEGER NOT NULL,
            satuan_tingkat INTEGER NOT NULL DEFAULT 1,
            qty_smallest INTEGER NOT NULL,
            nilai_per_unit INTEGER NOT NULL DEFAULT 0,
            subtotal_nilai INTEGER NOT NULL DEFAULT 0,
            UNIQUE (barang_kode, gudang_kode)
        );

        CREATE INDEX IF NOT EXISTS idx_stok_awal_line_barang ON stok_awal_line(barang_kode);
        CREATE INDEX IF NOT EXISTS idx_stok_awal_line_gudang ON stok_awal_line(gudang_kode);
        ",
    )?;
    Ok(())
}

/// Tambah kolom `akun_historical_balance` ke `jurnal_konfigurasi`. Akun ini
/// dipakai sebagai lawan transaksi untuk semua jurnal "pembuka" di periode
/// sebelum awal periode operasional (mis. saldo awal kas, saldo awal stok).
fn migrate_jurnal_konfigurasi_historical(conn: &Connection) -> rusqlite::Result<()> {
    let exists: bool = {
        let mut stmt = conn.prepare("PRAGMA table_info(jurnal_konfigurasi)")?;
        let names = stmt.query_map([], |r| r.get::<_, String>(1))?;
        let mut found = false;
        for n in names {
            if n? == "akun_historical_balance" {
                found = true;
                break;
            }
        }
        found
    };
    if !exists {
        conn.execute(
            "ALTER TABLE jurnal_konfigurasi
             ADD COLUMN akun_historical_balance TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE",
            [],
        )?;
    }
    Ok(())
}

/// State onboarding first-run. Single row (id = 1). `completed_at` NULL
/// menandakan wizard pengaturan awal belum diselesaikan, sehingga aplikasi
/// akan mengarahkan admin ke `/onboarding` setelah login.
///
/// `app_version` mencatat versi aplikasi saat onboarding diselesaikan,
/// berguna untuk memutuskan apakah perlu menampilkan wizard "what's new"
/// di rilis berikutnya tanpa mengulang setup awal.
fn migrate_onboarding_state(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS onboarding_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            completed_at INTEGER,
            completed_by TEXT,
            app_version TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        ",
    )?;
    Ok(())
}

/// Pengaturan operasional global — sumber kebenaran untuk hal-hal yang
/// menjadi acuan lintas modul, mis. **tanggal awal periode operasional**
/// (dipakai oleh saldo awal stok, kas, dan pembukuan).
fn migrate_operasional_konfigurasi(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS operasional_konfigurasi (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            awal_periode TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        ",
    )?;
    Ok(())
}

/// Pengaturan kas POS — kas operasional utama (sumber modal), kas kasir
/// (laci/till), dan akun penampung selisih kas saat tutup shift.
fn migrate_pos_konfigurasi(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pos_konfigurasi (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            kas_utama_kode TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            kas_kasir_kode TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            akun_selisih_kas_kode TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        ",
    )?;
    Ok(())
}

/// Tambah kolom snapshot pengaturan POS + tautan jurnal otomatis ke
/// `pos_shift`. Idempotent — kolom hanya ditambah bila belum ada.
fn migrate_pos_shift_jurnal_columns(conn: &Connection) -> rusqlite::Result<()> {
    let existing: std::collections::HashSet<String> = {
        let mut stmt = conn.prepare("PRAGMA table_info(pos_shift)")?;
        let rows = stmt.query_map([], |r| r.get::<_, String>(1))?;
        let mut out = std::collections::HashSet::new();
        for row in rows {
            out.insert(row?);
        }
        out
    };

    let alters: &[(&str, &str)] = &[
        ("kas_utama_kode", "ALTER TABLE pos_shift ADD COLUMN kas_utama_kode TEXT"),
        ("kas_kasir_kode", "ALTER TABLE pos_shift ADD COLUMN kas_kasir_kode TEXT"),
        (
            "akun_selisih_kas_kode",
            "ALTER TABLE pos_shift ADD COLUMN akun_selisih_kas_kode TEXT",
        ),
        ("jurnal_open_id", "ALTER TABLE pos_shift ADD COLUMN jurnal_open_id INTEGER"),
        (
            "jurnal_close_id",
            "ALTER TABLE pos_shift ADD COLUMN jurnal_close_id INTEGER",
        ),
        (
            "kembalikan_ke_utama",
            "ALTER TABLE pos_shift ADD COLUMN kembalikan_ke_utama INTEGER NOT NULL DEFAULT 0",
        ),
    ];

    for (col, sql) in alters {
        if !existing.contains(*col) {
            conn.execute(sql, [])?;
        }
    }
    Ok(())
}

/// Audit log untuk peristiwa pada shift POS — buka shift, tutup shift,
/// ganti gudang, dan ke depan: konfigurasi printer, dsb.
///
/// Skema sengaja dibuat generik (`event_type` + `payload` JSON) agar
/// menambah jenis kejadian baru tidak memerlukan perubahan skema —
/// cukup tambah konstanta event_type baru dan tulis payload yang sesuai.
fn migrate_pos_shift_event_log(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pos_shift_event_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shift_id INTEGER NOT NULL REFERENCES pos_shift(id) ON DELETE CASCADE ON UPDATE CASCADE,
            event_type TEXT NOT NULL,
            actor_username TEXT NOT NULL,
            payload TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pos_shift_event_log_shift ON pos_shift_event_log(shift_id);
        CREATE INDEX IF NOT EXISTS idx_pos_shift_event_log_type ON pos_shift_event_log(event_type);
        CREATE INDEX IF NOT EXISTS idx_pos_shift_event_log_actor ON pos_shift_event_log(actor_username);
        CREATE INDEX IF NOT EXISTS idx_pos_shift_event_log_ts ON pos_shift_event_log(created_at);
        ",
    )?;
    Ok(())
}

/// Tabel produksi: konversi bahan baku → barang jadi + biaya produksi.
///
/// Model akuntansi yang dipakai:
/// - Stok bahan baku berkurang dengan nilai HPP saat ini (event PRODUKSI_KELUAR).
/// - Stok barang jadi bertambah dengan nilai HPP baru yang ditentukan saat
///   dokumen ini diselesaikan (event PRODUKSI_MASUK; subtotal disimpan di
///   `produksi_hasil.subtotal_nilai` dan dibaca oleh modul HPP).
/// - Saldo neraca akun "Persediaan" netto hanya bertambah sebesar
///   `biaya_produksi`; sisanya konversi bentuk yang tidak mengubah total
///   nilai persediaan.
/// - Jurnal saat status `Selesai`:
///     D Persediaan          biaya_produksi (+/- selisih bila HPP output di-override)
///       K Akun lawan         biaya_produksi
///       K/D Laba Rugi 5010   selisih (bila output ≠ input + biaya)
fn migrate_produksi_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS produksi (
            nomor TEXT PRIMARY KEY NOT NULL,
            tanggal TEXT NOT NULL,
            gudang_bb_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            gudang_hasil_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            status TEXT NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Selesai', 'Dibatalkan')),
            biaya_produksi INTEGER NOT NULL DEFAULT 0,
            akun_biaya_kode TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            catatan TEXT NOT NULL DEFAULT '',
            dibuat_oleh TEXT NOT NULL DEFAULT '',
            jurnal_id INTEGER REFERENCES jurnal_umum(id) ON DELETE SET NULL ON UPDATE CASCADE,
            tanggal_selesai TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_produksi_tgl ON produksi(tanggal);
        CREATE INDEX IF NOT EXISTS idx_produksi_status ON produksi(status);

        CREATE TABLE IF NOT EXISTS produksi_bahan_baku (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produksi_nomor TEXT NOT NULL REFERENCES produksi(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            qty INTEGER NOT NULL,
            satuan_tingkat INTEGER NOT NULL DEFAULT 1,
            hpp_per_unit INTEGER NOT NULL DEFAULT 0,
            subtotal_nilai INTEGER NOT NULL DEFAULT 0,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_produksi_bb_nomor ON produksi_bahan_baku(produksi_nomor);
        CREATE INDEX IF NOT EXISTS idx_produksi_bb_barang ON produksi_bahan_baku(barang_kode);

        CREATE TABLE IF NOT EXISTS produksi_hasil (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produksi_nomor TEXT NOT NULL REFERENCES produksi(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            qty INTEGER NOT NULL,
            satuan_tingkat INTEGER NOT NULL DEFAULT 1,
            hpp_per_unit INTEGER NOT NULL,
            subtotal_nilai INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_produksi_hasil_nomor ON produksi_hasil(produksi_nomor);
        CREATE INDEX IF NOT EXISTS idx_produksi_hasil_barang ON produksi_hasil(barang_kode);
        ",
    )?;
    Ok(())
}

/// Tabel POS: metode bayar, shift kasir, pembayaran multi-tender, retur.
fn migrate_pos_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        -- Metode bayar POS. Tiap metode menunjuk ke 1 akun kas/bank di
        -- akun_keuangan. `is_tunai` menentukan apakah dihitung sebagai
        -- arus kas fisik (untuk rekap selisih shift).
        CREATE TABLE IF NOT EXISTS pos_metode_bayar (
            kode TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama TEXT NOT NULL,
            akun_kas_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            urutan INTEGER NOT NULL DEFAULT 0,
            is_tunai INTEGER NOT NULL DEFAULT 0,
            aktif INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        -- Shift kasir. Modal awal disetor kasir saat buka shift (boleh
        -- carry-over dari shift sebelumnya). Saat tutup shift, kasir input
        -- `uang_akhir_aktual` (kas fisik di laci) lalu sistem hitung
        -- selisih vs ekspektasi (modal_awal + masuk tunai - keluar tunai).
        CREATE TABLE IF NOT EXISTS pos_shift (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kode TEXT NOT NULL UNIQUE COLLATE NOCASE,
            kasir_username TEXT NOT NULL REFERENCES pengguna(username) ON UPDATE CASCADE,
            gudang_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            modal_awal INTEGER NOT NULL DEFAULT 0,
            uang_akhir_aktual INTEGER,
            uang_akhir_ekspektasi INTEGER,
            selisih INTEGER,
            catatan TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
            mulai_ts INTEGER NOT NULL,
            selesai_ts INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pos_shift_kasir ON pos_shift(kasir_username, status);
        CREATE INDEX IF NOT EXISTS idx_pos_shift_status ON pos_shift(status, mulai_ts);

        -- Multi pembayaran per faktur penjualan (mendukung split tender:
        -- mis. tunai + transfer). Untuk faktur non-POS, tabel ini boleh
        -- kosong; sumber kebenaran tetap di `penjualan.akun_kas_kode` +
        -- `penjualan.total`.
        CREATE TABLE IF NOT EXISTS penjualan_pembayaran (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            penjualan_nomor TEXT NOT NULL REFERENCES penjualan(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            metode_kode TEXT REFERENCES pos_metode_bayar(kode) ON UPDATE CASCADE,
            akun_kas_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            jumlah INTEGER NOT NULL,
            ref_no TEXT NOT NULL DEFAULT '',
            shift_id INTEGER REFERENCES pos_shift(id) ON DELETE SET NULL ON UPDATE CASCADE,
            created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_penjualan_pembayaran_nomor ON penjualan_pembayaran(penjualan_nomor);
        CREATE INDEX IF NOT EXISTS idx_penjualan_pembayaran_shift ON penjualan_pembayaran(shift_id);

        -- Retur penjualan (umum, bukan eksklusif POS; tapi dibuat-dengan-POS
        -- akan diisi shift_id). Reverse stok + reverse jurnal pendapatan +
        -- arus kas refund via metode bayar yang dipilih.
        CREATE TABLE IF NOT EXISTS retur_penjualan (
            nomor TEXT PRIMARY KEY NOT NULL,
            penjualan_nomor TEXT NOT NULL REFERENCES penjualan(nomor) ON UPDATE CASCADE,
            tanggal TEXT NOT NULL,
            kasir_username TEXT NOT NULL REFERENCES pengguna(username) ON UPDATE CASCADE,
            gudang_kode TEXT NOT NULL REFERENCES gudang(kode) ON UPDATE CASCADE,
            shift_id INTEGER REFERENCES pos_shift(id) ON DELETE SET NULL ON UPDATE CASCADE,
            total INTEGER NOT NULL,
            alasan TEXT NOT NULL DEFAULT '',
            metode_refund_kode TEXT REFERENCES pos_metode_bayar(kode) ON UPDATE CASCADE,
            akun_kas_refund TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS retur_penjualan_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            retur_nomor TEXT NOT NULL REFERENCES retur_penjualan(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON UPDATE CASCADE,
            qty INTEGER NOT NULL,
            satuan_tingkat INTEGER NOT NULL DEFAULT 1,
            harga_satuan INTEGER NOT NULL,
            subtotal INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_retur_penjualan_tgl ON retur_penjualan(tanggal);
        CREATE INDEX IF NOT EXISTS idx_retur_penjualan_pj ON retur_penjualan(penjualan_nomor);
        CREATE INDEX IF NOT EXISTS idx_retur_penjualan_shift ON retur_penjualan(shift_id);
        CREATE INDEX IF NOT EXISTS idx_retur_penjualan_line_nomor ON retur_penjualan_line(retur_nomor);
        ",
    )?;

    seed_pelanggan_walkin(conn)?;
    seed_pos_metode_bayar(conn)?;
    Ok(())
}

/// Pelanggan default untuk transaksi walk-in di POS. Dibutuhkan karena
/// FK pelanggan_kode di penjualan adalah NOT NULL.
fn seed_pelanggan_walkin(conn: &Connection) -> rusqlite::Result<()> {
    let ts = now_ts();
    conn.execute(
        "INSERT OR IGNORE INTO pelanggan (kode, nama, alamat, kota, telepon, email, npwp, catatan, created_at, updated_at)
         VALUES ('GUEST', 'Pelanggan Umum', '', '', '', '', '', 'Pelanggan default untuk transaksi POS walk-in.', ?, ?)",
        params![ts, ts],
    )?;
    Ok(())
}

/// Seed metode bayar POS default. Hanya dijalankan saat tabel kosong.
/// Memilih akun kas dari akun_keuangan: pertama yang is_akun_kas=1.
fn seed_pos_metode_bayar(conn: &Connection) -> rusqlite::Result<()> {
    let n: i64 = conn.query_row("SELECT COUNT(*) FROM pos_metode_bayar", [], |r| r.get(0))?;
    if n > 0 {
        return Ok(());
    }
    let akun_tunai: Option<String> = conn
        .query_row(
            "SELECT kode FROM akun_keuangan WHERE is_akun_kas = 1 AND lower(nama) LIKE '%tunai%' ORDER BY kode LIMIT 1",
            [],
            |r| r.get(0),
        )
        .ok()
        .or_else(|| {
            conn.query_row(
                "SELECT kode FROM akun_keuangan WHERE is_akun_kas = 1 ORDER BY kode LIMIT 1",
                [],
                |r| r.get(0),
            )
            .ok()
        });
    let akun_bank: Option<String> = conn
        .query_row(
            "SELECT kode FROM akun_keuangan WHERE is_akun_kas = 1 AND lower(nama) NOT LIKE '%tunai%' ORDER BY kode LIMIT 1",
            [],
            |r| r.get(0),
        )
        .ok()
        .or_else(|| akun_tunai.clone());

    let ts = now_ts();
    let pairs: Vec<(&str, &str, &Option<String>, i64, i64)> = vec![
        ("TUNAI", "Tunai", &akun_tunai, 1, 1),
        ("TRANSFER", "Transfer Bank", &akun_bank, 2, 0),
        ("DEBIT", "Kartu Debit/EDC", &akun_bank, 3, 0),
        ("QRIS", "QRIS", &akun_bank, 4, 0),
    ];
    for (kode, nama, akun, urutan, is_tunai) in pairs {
        let Some(akun_kode) = akun else {
            continue;
        };
        conn.execute(
            "INSERT INTO pos_metode_bayar (kode, nama, akun_kas_kode, urutan, is_tunai, aktif, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
            params![kode, nama, akun_kode, urutan, is_tunai, ts, ts],
        )?;
    }
    Ok(())
}

/// Transfer antar rekening kas / bank.
fn migrate_transfer_kas_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS transfer_kas (
            nomor TEXT PRIMARY KEY NOT NULL,
            tanggal TEXT NOT NULL,
            akun_sumber_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            akun_tujuan_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            nominal_kirim INTEGER NOT NULL,
            nominal_terima INTEGER NOT NULL,
            biaya_transfer INTEGER NOT NULL DEFAULT 0,
            akun_biaya_kode TEXT REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            catatan TEXT NOT NULL DEFAULT '',
            jurnal_id INTEGER REFERENCES jurnal_umum(id) ON DELETE SET NULL ON UPDATE CASCADE,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_transfer_kas_tanggal ON transfer_kas(tanggal);
        CREATE INDEX IF NOT EXISTS idx_transfer_kas_sumber ON transfer_kas(akun_sumber_kode);
        CREATE INDEX IF NOT EXISTS idx_transfer_kas_tujuan ON transfer_kas(akun_tujuan_kode);
        ",
    )?;
    Ok(())
}

/// Audit log append-only — sekali tulis, tidak boleh di-update/hapus dari aplikasi.
fn migrate_activity_log_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            waktu INTEGER NOT NULL,
            aktor_username TEXT NOT NULL DEFAULT '',
            aktor_nama TEXT NOT NULL DEFAULT '',
            aksi TEXT NOT NULL,
            entitas TEXT NOT NULL,
            entitas_id TEXT NOT NULL DEFAULT '',
            ringkasan TEXT NOT NULL DEFAULT '',
            nilai_sebelum TEXT,
            nilai_sesudah TEXT,
            metadata TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_activity_log_waktu ON activity_log(waktu);
        CREATE INDEX IF NOT EXISTS idx_activity_log_entitas ON activity_log(entitas, entitas_id);
        CREATE INDEX IF NOT EXISTS idx_activity_log_aktor ON activity_log(aktor_username);
        ",
    )?;
    Ok(())
}

/// Satuan bertingkat per barang (1 = terbesar, 3 = terkecil).
fn migrate_barang_jasa_satuan(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS barang_jasa_satuan (
            barang_kode TEXT NOT NULL REFERENCES barang_jasa(kode) ON DELETE CASCADE ON UPDATE CASCADE,
            tingkat INTEGER NOT NULL CHECK (tingkat IN (1, 2, 3)),
            nama TEXT NOT NULL,
            qty_isi INTEGER,
            harga_jual INTEGER NOT NULL DEFAULT 0,
            harga_beli INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (barang_kode, tingkat)
        );
        CREATE INDEX IF NOT EXISTS idx_barang_satuan_kode ON barang_jasa_satuan(barang_kode);
        ",
    )?;

    conn.execute(
        "INSERT OR IGNORE INTO barang_jasa_satuan (barang_kode, tingkat, nama, qty_isi, harga_jual, harga_beli)
         SELECT kode, 3, satuan, NULL, harga, harga
         FROM barang_jasa
         WHERE tipe = 'Barang'
           AND NOT EXISTS (
             SELECT 1 FROM barang_jasa_satuan s WHERE lower(s.barang_kode) = lower(barang_jasa.kode)
           )",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO barang_jasa_satuan (barang_kode, tingkat, nama, qty_isi, harga_jual, harga_beli)
         SELECT kode, 1, satuan, NULL, harga, harga
         FROM barang_jasa
         WHERE tipe = 'Jasa'
           AND NOT EXISTS (
             SELECT 1 FROM barang_jasa_satuan s WHERE lower(s.barang_kode) = lower(barang_jasa.kode)
           )",
        [],
    )?;

    let mut stmt = conn.prepare("PRAGMA table_info(barang_jasa_satuan)")?;
    let cols: Vec<String> = stmt
        .query_map([], |r| r.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("kode_barcode")) {
        conn.execute(
            "ALTER TABLE barang_jasa_satuan ADD COLUMN kode_barcode TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }
    Ok(())
}

fn migrate_pengguna_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pengguna (
            username TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
            nama_lengkap TEXT NOT NULL,
            email TEXT NOT NULL DEFAULT '',
            password_hash TEXT NOT NULL,
            departemen TEXT NOT NULL DEFAULT '',
            nomor_hp TEXT NOT NULL DEFAULT '',
            aktif INTEGER NOT NULL DEFAULT 1,
            is_admin INTEGER NOT NULL DEFAULT 0,
            catatan TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pengguna_aktif ON pengguna(aktif);

        CREATE TABLE IF NOT EXISTS pengguna_halaman_akses (
            username TEXT NOT NULL REFERENCES pengguna(username) ON DELETE CASCADE ON UPDATE CASCADE,
            halaman_key TEXT NOT NULL,
            PRIMARY KEY (username, halaman_key)
        );

        CREATE INDEX IF NOT EXISTS idx_pengguna_halaman_akses_user ON pengguna_halaman_akses(username);
        ",
    )?;

    let n: i64 = conn.query_row("SELECT COUNT(*) FROM pengguna", [], |r| r.get(0))?;
    if n == 0 {
        let ts = now_ts();
        let hash = bcrypt::hash("admin123", bcrypt::DEFAULT_COST).expect("bcrypt hash");
        conn.execute(
            "INSERT INTO pengguna (username, nama_lengkap, email, password_hash, departemen, nomor_hp, aktif, is_admin, catatan, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)",
            params![
                "admin",
                "Administrator",
                "",
                hash,
                "IT",
                "",
                "Akun awal — ubah password setelah login pertama.",
                ts,
                ts
            ],
        )?;
    }
    Ok(())
}

fn migrate_pengeluaran_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pengeluaran (
            nomor TEXT PRIMARY KEY NOT NULL,
            tanggal TEXT NOT NULL,
            akun_kas_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            total INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pengeluaran_tanggal ON pengeluaran(tanggal);

        CREATE TABLE IF NOT EXISTS pengeluaran_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomor TEXT NOT NULL REFERENCES pengeluaran(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            akun_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            jumlah INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_pengeluaran_line_nomor ON pengeluaran_line(nomor);
        ",
    )?;
    Ok(())
}

fn migrate_penerimaan_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS penerimaan (
            nomor TEXT PRIMARY KEY NOT NULL,
            tanggal TEXT NOT NULL,
            akun_kas_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            total INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_penerimaan_tanggal ON penerimaan(tanggal);

        CREATE TABLE IF NOT EXISTS penerimaan_line (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomor TEXT NOT NULL REFERENCES penerimaan(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            akun_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            jumlah INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_penerimaan_line_nomor ON penerimaan_line(nomor);
        ",
    )?;
    Ok(())
}

fn migrate_pelunasan_piutang_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pelunasan_piutang (
            nomor TEXT PRIMARY KEY NOT NULL,
            tanggal TEXT NOT NULL,
            pelanggan_kode TEXT NOT NULL,
            akun_kas_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            total INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT '',
            jurnal_id INTEGER REFERENCES jurnal_umum(id) ON DELETE SET NULL ON UPDATE CASCADE,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pelunasan_piutang_tanggal ON pelunasan_piutang(tanggal);

        CREATE TABLE IF NOT EXISTS pelunasan_piutang_faktur (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pelunasan_nomor TEXT NOT NULL REFERENCES pelunasan_piutang(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            faktur_nomor TEXT NOT NULL REFERENCES penjualan(nomor) ON UPDATE CASCADE,
            jumlah INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pelunasan_piutang_faktur_nomor ON pelunasan_piutang_faktur(pelunasan_nomor);
        ",
    )?;
    // Hapus baris hasil impor jurnal sementara (nomor PLP-J{id}), jika pernah terbuat.
    conn.execute(
        "DELETE FROM pelunasan_piutang WHERE nomor LIKE 'PLP-J%'",
        [],
    )?;
    Ok(())
}

fn migrate_pelunasan_hutang_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pelunasan_hutang (
            nomor TEXT PRIMARY KEY NOT NULL,
            tanggal TEXT NOT NULL,
            pemasok_kode TEXT NOT NULL,
            akun_kas_kode TEXT NOT NULL REFERENCES akun_keuangan(kode) ON UPDATE CASCADE,
            total INTEGER NOT NULL,
            catatan TEXT NOT NULL DEFAULT '',
            jurnal_id INTEGER REFERENCES jurnal_umum(id) ON DELETE SET NULL ON UPDATE CASCADE,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pelunasan_hutang_tanggal ON pelunasan_hutang(tanggal);

        CREATE TABLE IF NOT EXISTS pelunasan_hutang_faktur (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pelunasan_nomor TEXT NOT NULL REFERENCES pelunasan_hutang(nomor) ON DELETE CASCADE ON UPDATE CASCADE,
            faktur_nomor TEXT NOT NULL REFERENCES pembelian(nomor) ON UPDATE CASCADE,
            jumlah INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pelunasan_hutang_faktur_nomor ON pelunasan_hutang_faktur(pelunasan_nomor);
        ",
    )?;
    Ok(())
}

/// Kolom diskon faktur & pajak pada header pembelian.
fn migrate_pembelian_columns(conn: &Connection) -> rusqlite::Result<()> {
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'pembelian'",
        [],
        |r| r.get(0),
    )?;
    if exists == 0 {
        return Ok(());
    }

    let mut stmt = conn.prepare("PRAGMA table_info(pembelian)")?;
    let cols: Vec<String> = stmt
        .query_map([], |r| r.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();

    if !cols.iter().any(|c| c.eq_ignore_ascii_case("diskon_faktur")) {
        conn.execute(
            "ALTER TABLE pembelian ADD COLUMN diskon_faktur INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("pajak")) {
        conn.execute(
            "ALTER TABLE pembelian ADD COLUMN pajak INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("akun_kas_kode")) {
        conn.execute("ALTER TABLE pembelian ADD COLUMN akun_kas_kode TEXT", [])?;
    }
    Ok(())
}

/// Kolom diskon per baris faktur pembelian.
fn migrate_pembelian_line_columns(conn: &Connection) -> rusqlite::Result<()> {
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'pembelian_line'",
        [],
        |r| r.get(0),
    )?;
    if exists == 0 {
        return Ok(());
    }

    let mut stmt = conn.prepare("PRAGMA table_info(pembelian_line)")?;
    let cols: Vec<String> = stmt
        .query_map([], |r| r.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();

    if !cols.iter().any(|c| c.eq_ignore_ascii_case("diskon")) {
        conn.execute(
            "ALTER TABLE pembelian_line ADD COLUMN diskon INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("satuan_tingkat")) {
        conn.execute(
            "ALTER TABLE pembelian_line ADD COLUMN satuan_tingkat INTEGER NOT NULL DEFAULT 1",
            [],
        )?;
    }
    Ok(())
}

/// Kolom diskon faktur, pajak, dan akun kas pada header penjualan.
fn migrate_penjualan_columns(conn: &Connection) -> rusqlite::Result<()> {
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'penjualan'",
        [],
        |r| r.get(0),
    )?;
    if exists == 0 {
        return Ok(());
    }

    let mut stmt = conn.prepare("PRAGMA table_info(penjualan)")?;
    let cols: Vec<String> = stmt
        .query_map([], |r| r.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();

    if !cols.iter().any(|c| c.eq_ignore_ascii_case("diskon_faktur")) {
        conn.execute(
            "ALTER TABLE penjualan ADD COLUMN diskon_faktur INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("pajak")) {
        conn.execute(
            "ALTER TABLE penjualan ADD COLUMN pajak INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("akun_kas_kode")) {
        conn.execute("ALTER TABLE penjualan ADD COLUMN akun_kas_kode TEXT", [])?;
    }
    Ok(())
}

/// Kolom diskon per baris faktur penjualan.
fn migrate_penjualan_line_columns(conn: &Connection) -> rusqlite::Result<()> {
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'penjualan_line'",
        [],
        |r| r.get(0),
    )?;
    if exists == 0 {
        return Ok(());
    }

    let mut stmt = conn.prepare("PRAGMA table_info(penjualan_line)")?;
    let cols: Vec<String> = stmt
        .query_map([], |r| r.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();

    if !cols.iter().any(|c| c.eq_ignore_ascii_case("diskon")) {
        conn.execute(
            "ALTER TABLE penjualan_line ADD COLUMN diskon INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("satuan_tingkat")) {
        conn.execute(
            "ALTER TABLE penjualan_line ADD COLUMN satuan_tingkat INTEGER NOT NULL DEFAULT 1",
            [],
        )?;
    }
    Ok(())
}

fn ensure_app_meta(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        )",
    )?;
    Ok(())
}

fn meta_get(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    ensure_app_meta(conn)?;
    match conn.query_row(
        "SELECT value FROM app_meta WHERE key = ?",
        params![key],
        |r| r.get(0),
    ) {
        Ok(v) => Ok(Some(v)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

fn meta_set(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    ensure_app_meta(conn)?;
    conn.execute(
        "INSERT INTO app_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
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

    let had_is_akun_kas = cols.iter().any(|c| c.eq_ignore_ascii_case("is_akun_kas"));

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
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("kelompok")) {
        conn.execute(
            "ALTER TABLE akun_keuangan ADD COLUMN kelompok TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("kolom_norm")) {
        conn.execute(
            "ALTER TABLE akun_keuangan ADD COLUMN kolom_norm TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }
    if !cols.iter().any(|c| c.eq_ignore_ascii_case("sub_kelompok")) {
        conn.execute(
            "ALTER TABLE akun_keuangan ADD COLUMN sub_kelompok TEXT NOT NULL DEFAULT ''",
            [],
        )?;
    }

    // Migrasi satu kali dari skema lama (jangan dijalankan tiap startup — peran_jurnal default 'KAS' akan menandai semua akun).
    if !had_is_akun_kas {
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
    }

    // Perbaiki DB yang sudah terlanjur salah (semua akun tertandai kas).
    if meta_get(conn, "akun_kas_flags_v2")?.is_none() {
        crate::seed_akun_keuangan::sync_standard_is_akun_kas(conn)?;
        meta_set(conn, "akun_kas_flags_v2", "1")?;
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
