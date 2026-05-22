import { paperSizeValue, type PaperSize } from "@/lib/paperSize";

// Polyfill paged.js — re-export untuk dipakai template print yang butuh
// paginasi rapi (header berulang, nomor halaman, footer). Lihat
// `kasTransaksiPrintTemplate.ts` & `pelunasanPrintTemplate.ts` sebagai
// contoh penggunaan.
//
// File di-vendor di `src/lib/vendor/` karena paket `pagedjs` punya
// `exports` field restricted. Update manual saat bump versi paket.
export { default as pagedjsPolyfill } from "@/lib/vendor/paged.polyfill.min.js?raw";

/**
 * Escape teks untuk dimasukkan ke dalam CSS string literal
 * (`content: "..."`).  Hanya escape karakter yang merusak quote — control
 * char dianggap tidak ada di input kita.
 */
function escapeCssString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * CSS untuk paged docs (A4, Letter, ½ continuous) dengan paged.js aktif.
 *
 * Header/footer berulang per halaman via @page margin boxes:
 * - @top-left      → "{judul dokumen}"               (mis. "Bukti pengeluaran kas")
 * - @top-right     → "No. {nomor} · {tanggal}"
 * - @bottom-left   → "Dicetak dari EasyBook · {waktu}"
 * - @bottom-right  → "Halaman X dari Y"
 *
 * Bekerja konsisten karena paged.js me-render pagination di JS-side,
 * BUKAN bergantung pada native Chrome paged-media engine (yang kerap
 * silent-drop margin boxes — issue 24913).
 *
 * Plus page-break rules untuk:
 * - table/tbody: izinkan break antar halaman (kalau tidak, paged.js
 *   memaksa tabel utuh ke halaman baru kalau tidak muat utuh — bikin
 *   halaman 1 ter-skip).
 * - tr: tetap avoid (jangan pecah di tengah baris).
 * - h2: page-break-after avoid (stick dengan tabel berikutnya).
 *
 * Plus preview styling (`.pagedjs_page`) supaya tampilan preview di
 * browser terlihat seperti halaman cetak (background putih + shadow).
 */
export function buildPagedCss(
  paperSize: PaperSize,
  judulDokumen: string,
  nomor: string,
  tanggalFormatted: string,
  waktuSekarangFormatted: string,
): string {
  const sizeValue = paperSizeValue(paperSize);
  const judul = escapeCssString(judulDokumen);
  const refNomor = escapeCssString(`No. ${nomor} · ${tanggalFormatted}`);
  const refDicetak = escapeCssString(
    `Dicetak dari EasyBook · ${waktuSekarangFormatted}`,
  );

  return `
    @page {
      size: ${sizeValue};
      /* Margin kiri/kanan 12mm — kompromi antara "tighter look" dan
         "headroom untuk Chrome scale offset". User dengan Chrome Scale ≠ 100
         (sticky preference) tetap dapat hasil yang fit di A4 sampai ~110%. */
      margin: 14mm 12mm 12mm 12mm;

      @top-left {
        content: "${judul}";
        font-size: 9pt;
        font-weight: 600;
        color: #3f3f46;
        vertical-align: bottom;
        padding-bottom: 4mm;
      }
      @top-right {
        content: "${refNomor}";
        font-size: 9pt;
        color: #71717a;
        vertical-align: bottom;
        padding-bottom: 4mm;
      }
      @bottom-left {
        content: "${refDicetak}";
        font-size: 8pt;
        color: #a1a1aa;
        vertical-align: top;
        padding-top: 3mm;
      }
      @bottom-right {
        content: "Halaman " counter(page) " dari " counter(pages);
        font-size: 8pt;
        color: #a1a1aa;
        vertical-align: top;
        padding-top: 3mm;
      }
    }

    /* Page break behavior — PENTING untuk paged.js:
       - table/tbody: auto break antar halaman supaya konten mengisi page
         1 dulu (override 'tr { page-break-inside: avoid }' di base wrap doc).
       - tr: avoid (jangan pecah di tengah baris).
       - .grid: auto supaya container tidak dianggap monolitik.

       NOTE: kami sengaja TIDAK pakai 'h2 { page-break-after: avoid }'
       di sini karena paged.js cenderung menafsirkannya sebagai
       "h2 + seluruh sibling berikutnya HARUS fit di page yang sama" —
       ini bikin paged.js push seluruh table+signature ke page baru kalau
       gabungannya tidak muat di page 1, hasilnya page 1 separuh kosong.
       Browser sebenarnya OK dengan h2 sebagai "section start" yang muncul
       di akhir page (orphan kecil tetap rapi). Kalau diperlukan kontrol
       lebih ketat, pakai 'orphans'/'widows' (tapi paged.js belum konsisten
       support keduanya). */
    table, tbody { page-break-inside: auto; break-inside: auto; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .grid { page-break-inside: auto; break-inside: auto; }

    /* Preview styling — saat paged.js render preview di browser, halaman
       terlihat seperti kertas (background putih + shadow), background luar
       abu-abu. */
    body {
      background: #f4f4f5;
    }
    .pagedjs_pages {
      margin: 0 auto;
    }
    .pagedjs_page {
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 8mm;
    }

    /* Saat print, hilangkan background preview. */
    @media print {
      body { background: #ffffff; }
      .pagedjs_page {
        box-shadow: none;
        margin: 0;
      }
    }
  `;
}
