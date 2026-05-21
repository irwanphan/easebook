import type {
  KasTransaksiDetailData,
  KasTransaksiDetailVariant,
} from "@/features/keuangan/KasTransaksiDetailView";
import { escapeHtml, wrapPrintableDocument } from "@/lib/print";
import {
  isPaperPaged,
  isReceiptPaper,
  paperSizeCss,
  paperSizeValue,
  type PaperSize,
} from "@/lib/paperSize";

// Polyfill paged.js — di-inline ke setiap dokumen print paged.
// Memberi support penuh @page margin boxes + counter(page)/counter(pages)
// yang tidak reliabel di Chrome native (issue 24913). Browser tinggal cetak
// hasil paginated paged.js, jadi page numbering & header berulang konsisten.
//
// Ukuran ~500KB minified. Acceptable overhead per print job di desktop app.
//
// File di-vendor di `src/lib/vendor/` karena paket pagedjs punya `exports`
// field restricted yang tidak expose `dist/paged.polyfill.min.js` ke
// bundler. Kalau pagedjs di-update, copy ulang dari
// `node_modules/pagedjs/dist/paged.polyfill.min.js`.
//
// `?raw` adalah Vite feature: file di-inline sebagai string saat build.
import pagedjsPolyfill from "@/lib/vendor/paged.polyfill.min.js?raw";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTanggal(iso: string) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatWaktu(ts: number) {
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWaktuSekarang() {
  return new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Escape teks untuk dimasukkan ke dalam CSS string literal (mis. `content: "..."`).
 * Hanya escape karakter yang merusak quote — control char dianggap tidak ada
 * di input kita (nomor bukti, judul, tanggal terformat).
 */
function escapeCssString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * CSS untuk paged docs (A4, Letter, ½ continuous) dengan paged.js aktif.
 *
 * @page margin boxes yang dipakai:
 * - @top-left      → "{judul dokumen}"               (mis. "Bukti pengeluaran kas")
 * - @top-right     → "No. {nomor} · {tanggal}"
 * - @bottom-left   → "Dicetak dari EasyBook · {waktu}"
 * - @bottom-right  → "Halaman X dari Y"
 *
 * Semua ini bekerja konsisten karena paged.js me-render pagination di JS-side,
 * BUKAN bergantung pada native Chrome paged-media engine.
 */
function buildPagedCss(
  paperSize: PaperSize,
  judulDokumen: string,
  detail: KasTransaksiDetailData,
): string {
  const sizeValue = paperSizeValue(paperSize);
  const judul = escapeCssString(judulDokumen);
  const refNomor = escapeCssString(`No. ${detail.nomor} · ${formatTanggal(detail.tanggal)}`);
  const refDicetak = escapeCssString(`Dicetak dari EasyBook · ${formatWaktuSekarang()}`);

  return `
    @page {
      size: ${sizeValue};
      /* Margin kiri/kanan 12mm — kompromi antara "tighter look" (request user)
         dan "headroom untuk Chrome scale offset". User Chrome yang punya
         Scale ≠ 100 (sticky preference) akan tetap dapat hasil yang fit di
         A4 sampai sekitar Scale 110%. Top/bottom 14mm cukup untuk margin
         boxes (judul header & nomor halaman). */
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
       - table/tbody: izinkan break antar halaman supaya konten mengisi
         page 1 dulu sebelum overflow ke page 2. Base CSS dari
         wrapPrintableDocument hanya set 'tr { page-break-inside: avoid }'
         yang justru bikin paged.js push seluruh table ke page berikutnya
         kalau dia anggap tidak muat utuh.
       - tr: tetap avoid (jangan pecah di tengah baris).
       - h2 (heading): page-break-after: avoid supaya stick dengan tabel
         berikutnya (kalau tidak muat keduanya, paged.js akan pindah
         keduanya ke page baru — bukan h2 sendirian dengan tabel di page lain).
       - .grid: auto supaya tidak treat container sebagai monolitik. */
    table, tbody { page-break-inside: auto; break-inside: auto; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    h2 { page-break-after: avoid; break-after: avoid; }
    .grid { page-break-inside: auto; break-inside: auto; }

    /* Saat preview (sebelum print), paged.js render hasil paginated di body.
       Beri sedikit padding & background biar visible sebagai "preview pages". */
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

/**
 * Bangun HTML dokumen print-ready untuk transaksi kas (penerimaan/pengeluaran).
 * Layout otomatis menyesuaikan ukuran kertas:
 * - Kertas paged (A4, Letter, ½ continuous): invoice 2 kolom + paged.js untuk
 *   header/footer berulang + page numbering.
 * - Kertas thermal (58/80mm): receipt 1 kolom kompak, flow natural tanpa paged.js.
 */
export function buildKasTransaksiPrintHtml(
  detail: KasTransaksiDetailData,
  variant: KasTransaksiDetailVariant,
  judulDokumen: string,
  paperSize?: PaperSize,
): string {
  const receipt = paperSize ? isReceiptPaper(paperSize) : false;
  const paged = paperSize ? isPaperPaged(paperSize) : true;
  // paged.js dipakai untuk paged non-thermal. Thermal/continuous tidak punya
  // konsep halaman & cetakan biasanya 1-page, jadi pakai flow biasa.
  const usePagedJs = paged && !receipt;

  const body = receipt
    ? buildReceiptBody(detail, variant, judulDokumen)
    : buildInvoiceBody(detail, variant, judulDokumen, !usePagedJs);

  let extraCss = "";
  let inlineScripts: string[] | undefined;
  let printOn: "load" | "pagedjs-after-rendered" = "load";

  if (paperSize) {
    if (usePagedJs) {
      extraCss = buildPagedCss(paperSize, judulDokumen, detail);
      inlineScripts = [pagedjsPolyfill];
      printOn = "pagedjs-after-rendered";
    } else {
      extraCss = paperSizeCss(paperSize);
    }
  }

  return wrapPrintableDocument({
    title: `${judulDokumen} ${detail.nomor}`,
    bodyHtml: body,
    extraCss,
    compact: receipt,
    inlineScripts,
    printOn,
  });
}

/**
 * Layout invoice (2 kolom) untuk kertas A4 / Letter / continuous.
 *
 * - `showInlineHeader=true` saat paged.js NOT aktif (mis. fallback / thermal):
 *   header inline di body (judul + nomor + tanggal di paling atas).
 * - `showInlineHeader=false` saat paged.js aktif: header dipindah ke
 *   @page margin boxes (lihat `buildPagedCss`). Body cukup berisi konten inti.
 */
function buildInvoiceBody(
  detail: KasTransaksiDetailData,
  variant: KasTransaksiDetailVariant,
  judulDokumen: string,
  showInlineHeader: boolean,
): string {
  const baris = detail.lines
    .map(
      (line) => `
      <tr>
        <td style="border: 1px solid #d4d4d8;">
          <div><strong>${escapeHtml(line.akunNama || line.akunKode)}</strong></div>
          <div class="mono muted">${escapeHtml(line.akunKode)}</div>
        </td>
        <td>${line.catatan ? escapeHtml(line.catatan) : "—"}</td>
        <td class="num">${escapeHtml(formatRupiah(line.jumlah))}</td>
      </tr>`,
    )
    .join("");

  const inlineHeader = showInlineHeader
    ? `
    <div class="header">
      <h1 style="margin: 0;">${escapeHtml(judulDokumen)}</h1>
      <p class="muted" style="margin: 0;">No. bukti <span class="mono">${escapeHtml(detail.nomor)}</span> · ${escapeHtml(
        formatTanggal(detail.tanggal),
      )}</p>
    </div>
    `
    : "";

  return `
    ${inlineHeader}
    <div class="grid">
      <div>
        <div class="label">${escapeHtml(variant.kasLabel)}</div>
        <div class="value">${escapeHtml(detail.akunKasNama || detail.akunKasKode)}</div>
        <div class="mono muted">${escapeHtml(detail.akunKasKode)}</div>
      </div>
      <div>
        <div class="label">Dicatat pada</div>
        <div class="value">${escapeHtml(formatWaktu(detail.createdAt))}</div>
        ${
          detail.updatedAt > detail.createdAt
            ? `<div class="muted">Diperbarui ${escapeHtml(formatWaktu(detail.updatedAt))}</div>`
            : ""
        }
      </div>
      ${
        detail.catatan.trim()
          ? `<div style="grid-column: span 2;">
              <div class="label">Catatan</div>
              <div class="value" style="white-space: pre-wrap;">${escapeHtml(detail.catatan)}</div>
            </div>`
          : ""
      }
    </div>

    <h2>${escapeHtml(variant.baristTitle)}</h2>
    <table style="border: 1px solid #d4d4d8;">
      <thead>
        <tr>
          <th>${escapeHtml(variant.akunBarisLabel)}</th>
          <th>Catatan baris</th>
          <th class="num">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${baris || `<tr><td colspan="3" style="text-align:center; color:#71717a;">Tidak ada baris.</td></tr>`}
      </tbody>
      ${
        detail.lines.length > 0
          ? `<tfoot>
              <tr>
                <td colspan="2" class="num">Total</td>
                <td class="num">${escapeHtml(formatRupiah(detail.total))}</td>
              </tr>
            </tfoot>`
          : ""
      }
    </table>
  `;
}

/** Layout receipt 1 kolom untuk thermal printer 58/80mm. */
function buildReceiptBody(
  detail: KasTransaksiDetailData,
  variant: KasTransaksiDetailVariant,
  judulDokumen: string,
): string {
  const baris = detail.lines
    .map(
      (line) => `
      <tr>
        <td>
          <div><strong>${escapeHtml(line.akunNama || line.akunKode)}</strong></div>
          ${
            line.catatan
              ? `<div class="muted" style="font-size: 10px;">${escapeHtml(line.catatan)}</div>`
              : ""
          }
        </td>
        <td class="num">${escapeHtml(formatRupiah(line.jumlah))}</td>
      </tr>`,
    )
    .join("");

  return `
    <div style="text-align: center; border-bottom: 1px dashed #18181b; padding-bottom: 4px; margin-bottom: 6px;">
      <strong style="font-size: 13px;">${escapeHtml(judulDokumen)}</strong>
      <div class="mono">${escapeHtml(detail.nomor)}</div>
      <div class="muted" style="font-size: 10px;">${escapeHtml(formatTanggal(detail.tanggal))}</div>
    </div>

    <div style="margin-bottom: 6px;">
      <div><span class="muted">${escapeHtml(variant.kasLabel)}:</span></div>
      <div><strong>${escapeHtml(detail.akunKasNama || detail.akunKasKode)}</strong></div>
      <div class="mono muted" style="font-size: 10px;">${escapeHtml(detail.akunKasKode)}</div>
    </div>

    <table style="font-size: 11px;">
      <thead>
        <tr>
          <th style="padding: 4px 2px;">${escapeHtml(variant.akunBarisLabel)}</th>
          <th class="num" style="padding: 4px 2px;">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${baris || `<tr><td colspan="2" style="text-align:center;">—</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td style="padding: 4px 2px;" class="num"><strong>Total</strong></td>
          <td style="padding: 4px 2px;" class="num"><strong>${escapeHtml(formatRupiah(detail.total))}</strong></td>
        </tr>
      </tfoot>
    </table>

    ${
      detail.catatan.trim()
        ? `<div style="margin-top: 6px; border-top: 1px dashed #d4d4d8; padding-top: 4px; font-size: 11px; white-space: pre-wrap;">
            <span class="muted">Catatan: </span>${escapeHtml(detail.catatan)}
          </div>`
        : ""
    }
  `;
  // Footer "Dicetak dari EasyBook · DATE" otomatis ditambahkan oleh
  // wrapPrintableDocument dan akan stick ke bawah halaman (margin-top: auto).
}
