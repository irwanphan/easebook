//! Seeder daftar akun standar (struktur mirip TokoPro / Elevens).
//! Urutan: kelompok besar → kode → hierarki induk (kode bertitik).

use rusqlite::{params, Connection};

struct SeedAkun {
    kode: &'static str,
    nama: &'static str,
    kelompok: &'static str,
    kolom_norm: &'static str,
    kelompok_lr: &'static str,
    sub_kelompok: &'static str,
    is_kas: bool,
}

/// (kode, nama, kelompok, D/K, kelompok_lr, sub_kelompok, is_akun_kas)
const AKUN_STANDAR: &[SeedAkun] = &[
    // --- AKTIVA LANCAR ---
    SeedAkun { kode: "1000", nama: "KAS TUNAI", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: true },
    SeedAkun { kode: "1001", nama: "KAS BANK", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1001.1", nama: "BCA", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: true },
    SeedAkun { kode: "1001.2", nama: "BNI", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: true },
    SeedAkun { kode: "1001.3", nama: "MANDIRI", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: true },
    SeedAkun { kode: "1002", nama: "Piutang", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1002.1", nama: "Piutang Dalam Kota", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1002.2", nama: "Piutang Luar Kota", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1003", nama: "Giro Cek", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1004", nama: "Persediaan Barang", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1005", nama: "Perlengkapan", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1006", nama: "Biaya Dibayar Di Muka", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1007", nama: "Overpay Pembelian", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1008", nama: "Barang Konsinyasi dari Pemasok", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1009", nama: "Barang Konsinyasi ke Pelanggan", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1010", nama: "Piutang Temp", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1011", nama: "Purchase On Shipping", kelompok: "AKTIVA_LANCAR", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    // --- AKTIVA TETAP ---
    SeedAkun { kode: "1100", nama: "Peralatan", kelompok: "AKTIVA_TETAP", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1101", nama: "Akumulasi Penyusutan Peralatan", kelompok: "AKTIVA_TETAP", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1102", nama: "Kendaraan", kelompok: "AKTIVA_TETAP", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1103", nama: "Akumulasi Penyusutan Kendaraan", kelompok: "AKTIVA_TETAP", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1104", nama: "Mesin-mesin", kelompok: "AKTIVA_TETAP", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1105", nama: "Akumulasi Penyusutan Mesin", kelompok: "AKTIVA_TETAP", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1106", nama: "Bangunan & Tanah", kelompok: "AKTIVA_TETAP", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1107", nama: "Sewa Bangunan", kelompok: "AKTIVA_TETAP", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "1108", nama: "Akumulasi Penyusutan Sewa Bangunan", kelompok: "AKTIVA_TETAP", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    // --- HUTANG LANCAR ---
    SeedAkun { kode: "1099", nama: "Terutang PPN Masukan", kelompok: "HUTANG_LANCAR", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "2000", nama: "Hutang Dagang", kelompok: "HUTANG_LANCAR", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "2001", nama: "Kewajiban Giro Cek", kelompok: "HUTANG_LANCAR", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "2002", nama: "Pendapatan Diterima di Muka", kelompok: "HUTANG_LANCAR", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "2003", nama: "Overpay Penjualan", kelompok: "HUTANG_LANCAR", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "2004", nama: "Hutang Temp", kelompok: "HUTANG_LANCAR", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "2005", nama: "Hutang Biaya Produksi", kelompok: "HUTANG_LANCAR", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "2006", nama: "Hutang Biaya", kelompok: "HUTANG_LANCAR", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "2009", nama: "Terutang PPN Keluaran", kelompok: "HUTANG_LANCAR", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    // --- HUTANG JANGKA PANJANG ---
    SeedAkun { kode: "2100", nama: "Hutang Bank", kelompok: "HUTANG_JANGKA_PANJANG", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    // --- MODAL ---
    SeedAkun { kode: "3000", nama: "Modal Pemilik", kelompok: "MODAL", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "3001", nama: "Prive", kelompok: "MODAL", kolom_norm: "D", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "3002", nama: "Historical Balance", kelompok: "MODAL", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "4000", nama: "Laba Tahun Berjalan", kelompok: "MODAL", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    SeedAkun { kode: "4001", nama: "Laba Ditahan", kelompok: "MODAL", kolom_norm: "K", kelompok_lr: "", sub_kelompok: "", is_kas: false },
    // --- PENDAPATAN ---
    SeedAkun { kode: "5000", nama: "Penjualan", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha", is_kas: false },
    SeedAkun { kode: "5001", nama: "Penjualan Servis", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha", is_kas: false },
    SeedAkun { kode: "5002", nama: "Retur Penjualan", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha", is_kas: false },
    SeedAkun { kode: "5003", nama: "Diskon Penjualan", kelompok: "PENDAPATAN", kolom_norm: "D", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha", is_kas: false },
    SeedAkun { kode: "5004", nama: "Diskon Pembelian", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha Lainnya", is_kas: false },
    SeedAkun { kode: "5006", nama: "Pendapatan Lain-lain", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Luar Usaha", is_kas: false },
    SeedAkun { kode: "5007", nama: "Pendapatan Ekspedisi", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha Lainnya", is_kas: false },
    SeedAkun { kode: "5008", nama: "Pendapatan Temp", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha Lainnya", is_kas: false },
    SeedAkun { kode: "5009", nama: "Laba Rugi Kurs", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha", is_kas: false },
    SeedAkun { kode: "5010", nama: "Laba Rugi Pembulatan", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha", is_kas: false },
    SeedAkun { kode: "5011", nama: "Diskon Item", kelompok: "PENDAPATAN", kolom_norm: "D", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha", is_kas: false },
    SeedAkun { kode: "5012", nama: "Cashback Pembelian", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha Lainnya", is_kas: false },
    SeedAkun { kode: "5013", nama: "Cashback", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha Lainnya", is_kas: false },
    SeedAkun { kode: "5014", nama: "Bunga Bank", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Luar Usaha", is_kas: false },
    SeedAkun { kode: "5015", nama: "Koreksi Stok Lebih", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha Lainnya", is_kas: false },
    SeedAkun { kode: "5016", nama: "Pengganti Promo", kelompok: "PENDAPATAN", kolom_norm: "K", kelompok_lr: "PENDAPATAN", sub_kelompok: "Pendapatan Usaha Lainnya", is_kas: false },
    // --- BIAYA ---
    SeedAkun { kode: "6000", nama: "Biaya Gaji", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6001", nama: "Biaya Listrik", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6002", nama: "Biaya PDAM", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6003", nama: "Biaya Telepon", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6004", nama: "Biaya Iklan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6005", nama: "Biaya Servis Peralatan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6006", nama: "Harga Pokok Penjualan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "HPP", sub_kelompok: "Harga Pokok Penjualan", is_kas: false },
    SeedAkun { kode: "6007", nama: "Piutang Tak Tertagih", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6008", nama: "Biaya Administrasi Bank", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6009", nama: "Biaya Ekspedisi", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6018", nama: "PPH", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6019", nama: "Biaya Lain-lain", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6020", nama: "Biaya Transport", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6021", nama: "Biaya Internet", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6022", nama: "Biaya Packing", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6023", nama: "BPJS Ketenagakerjaan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6024", nama: "Cashback Toko Rekanan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6025", nama: "Biaya Sewa", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6026", nama: "Biaya Renovasi Ruko", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6027", nama: "Biaya Peralatan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6028", nama: "Biaya Perlengkapan Kantor", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6029", nama: "Biaya Penyusutan Peralatan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6030", nama: "Pajak Bank", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6031", nama: "Koreksi Stok Kurang", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6032", nama: "Biaya Penyusutan Kendaraan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6033", nama: "Biaya Jasa Konsultan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6034", nama: "Biaya Parkir", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6035", nama: "Biaya Pajak Kendaraan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6036", nama: "Biaya Perawatan Kendaraan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6037", nama: "BPJS Kesehatan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6038", nama: "Biaya Dinas Luar Kota", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6039", nama: "Biaya Marketing", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6040", nama: "Biaya Langganan TokoPro SalesPro", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6041", nama: "ASURANSI", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6042", nama: "Biaya Keamanan dan Kebersihan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6043", nama: "Biaya Pemeliharaan Gedung", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
    SeedAkun { kode: "6044", nama: "Biaya Administrasi", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Operasional", is_kas: false },
    SeedAkun { kode: "6045", nama: "Biaya Pemeliharaan Peralatan", kelompok: "BIAYA", kolom_norm: "D", kelompok_lr: "BEBAN", sub_kelompok: "Biaya Non Operasional", is_kas: false },
];

fn infer_induk_kode(kode: &str) -> Option<String> {
    let pos = kode.rfind('.')?;
    let parent = kode[..pos].trim();
    if parent.is_empty() {
        None
    } else {
        Some(parent.to_string())
    }
}

pub fn seed_akun_keuangan_if_empty(conn: &mut Connection, ts: i64) -> rusqlite::Result<()> {
    let n: i64 = conn.query_row("SELECT COUNT(*) FROM akun_keuangan", [], |r| r.get(0))?;
    if n > 0 {
        return Ok(());
    }

    let tx = conn.transaction()?;
    for a in AKUN_STANDAR {
        let induk = infer_induk_kode(a.kode);
        let is_kas = if a.is_kas { 1 } else { 0 };
        tx.execute(
            "INSERT INTO akun_keuangan (
                kode, nama, induk_kode, kelompok, kolom_norm, kelompok_lr, sub_kelompok,
                is_akun_kas, saldo, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
            params![
                a.kode,
                a.nama,
                induk,
                a.kelompok,
                a.kolom_norm,
                a.kelompok_lr,
                a.sub_kelompok,
                is_kas,
                ts,
                ts,
            ],
        )?;
    }

    tx.execute(
        "INSERT OR IGNORE INTO jurnal_konfigurasi (id, akun_piutang, akun_hutang, akun_pendapatan, akun_pembelian,
            akun_penerimaan_lainnya, akun_pengeluaran_lainnya, created_at, updated_at)
         VALUES (1, '1002', '2000', '5000', '1004', '5006', '6019', ?, ?)",
        params![ts, ts],
    )?;

    tx.commit()?;
    Ok(())
}
